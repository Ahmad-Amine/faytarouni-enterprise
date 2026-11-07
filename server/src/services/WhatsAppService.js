const crypto = require('crypto');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const { toWaId } = require('../utils/phone');
const { getIO, WHATSAPP_INBOX_ROOM } = require('../socket');
const User = require('../models/User');
const Role = require('../models/Role');
const { Settings, WhatsAppTemplate } = require('../models/System');
const { WhatsAppConversation, WhatsAppMessage, StaffBroadcast } = require('../models/WhatsApp');

const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000;
const STOP_WORDS = new Set(['stop', 'unsubscribe', 'إيقاف', 'ايقاف', 'إلغاء', 'الغاء']);
const START_WORDS = new Set(['start', 'subscribe', 'ابدأ', 'ابدا']);

// Meta's accepted types and per-type limits for media sent by a business.
const MB = 1024 * 1024;
const OUTBOUND_MEDIA = {
  image: { maxBytes: 5 * MB, mimeTypes: ['image/jpeg', 'image/png'] },
  audio: { maxBytes: 16 * MB, mimeTypes: ['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/amr', 'audio/ogg'] },
  video: { maxBytes: 16 * MB, mimeTypes: ['video/mp4', 'video/3gpp'] },
  document: {
    maxBytes: 16 * MB,
    mimeTypes: [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.ms-excel',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
  },
};

const STATUS_RANK = { queued: 0, sent: 1, delivered: 2, read: 3 };

function isConfigured() {
  const { accessToken, phoneNumberId, appSecret, verifyToken } = env.whatsapp;
  return Boolean(accessToken && phoneNumberId && appSecret && verifyToken);
}

function assertConfigured() {
  if (!isConfigured()) throw new ApiError(503, 'WhatsApp is not connected yet.');
}

function graphUrl(path) {
  return `${env.whatsapp.graphUrl}/${env.whatsapp.apiVersion}/${path}`;
}

async function graphFetch(path, { timeoutMs = 15000, ...options } = {}) {
  try {
    return await fetch(path.startsWith('http') ? path : graphUrl(path), {
      ...options,
      headers: { Authorization: `Bearer ${env.whatsapp.accessToken}`, ...options.headers },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    logger.error('[whatsapp] request failed', { error: err.message });
    throw new ApiError(502, 'WhatsApp could not be reached. Please try again.');
  }
}

async function graphJson(path, options) {
  const response = await graphFetch(path, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = body.error?.error_data?.details || body.error?.message || 'WhatsApp rejected the request.';
    logger.warn('[whatsapp] API error', { status: response.status, code: body.error?.code, details });
    throw new ApiError(502, details);
  }
  return body;
}

async function postMessage(waId, payload) {
  const body = await graphJson(`${env.whatsapp.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: waId, ...payload }),
  });
  const wamid = body.messages?.[0]?.id;
  if (!wamid) throw new ApiError(502, 'WhatsApp did not accept the message.');
  return wamid;
}

// Template parameters may not contain newlines, tabs or long runs of spaces.
function cleanTemplateParam(value) {
  return String(value).replace(/\s+/g, ' ').trim();
}

function templatePayload(name, language, params) {
  return {
    type: 'template',
    template: {
      name,
      language: { code: language },
      components: params.length
        ? [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text: cleanTemplateParam(text) })) }]
        : [],
    },
  };
}

function emitUpdate(conversationId) {
  const io = getIO();
  if (io) io.to(WHATSAPP_INBOX_ROOM).emit('whatsapp:update', { conversationId: String(conversationId) });
}

function isWindowOpen(conversation) {
  if (!conversation.lastInboundAt) return false;
  return Date.now() - new Date(conversation.lastInboundAt).getTime() < SERVICE_WINDOW_MS;
}

function serializeConversation(conversation) {
  const plain = conversation.toObject ? conversation.toObject() : conversation;
  return { ...plain, windowOpen: isWindowOpen(plain) };
}

function findUserByWaId(waId) {
  return User.findOne({ phone: { $in: [`+${waId}`, waId] } });
}

async function getOrCreateConversation(waId, { name = '', user = null } = {}) {
  const linkedUser = user || (await findUserByWaId(waId));
  const conversation = await WhatsAppConversation.findOneAndUpdate(
    { waId },
    { $setOnInsert: { waId, user: linkedUser?._id || null, displayName: linkedUser?.name || name || waId } },
    { upsert: true, new: true }
  );

  // Covers someone who messaged the shop first and registered later.
  if (!conversation.user && linkedUser) {
    conversation.user = linkedUser._id;
    conversation.displayName = linkedUser.name;
    await conversation.save();
  }
  return conversation;
}

async function openConversation({ phone, name }) {
  const waId = toWaId(phone);
  if (!waId) throw ApiError.badRequest('This phone number cannot be used on WhatsApp.');
  return getOrCreateConversation(waId, { name });
}

async function touchConversation(conversationId, { at, text, type }) {
  await WhatsAppConversation.updateOne(
    { _id: conversationId },
    {
      $max: { lastMessageAt: at },
      $set: { lastMessagePreview: text.replace(/\s+/g, ' ').slice(0, 160), lastMessageType: type },
    }
  );
}

// Failed sends are kept and returned, not thrown: the failure belongs in the
// thread where the admin can see it, and a broadcast must keep going.
async function deliver(conversation, fields, send) {
  const now = new Date();
  const message = await WhatsAppMessage.create({
    conversation: conversation._id,
    direction: 'outbound',
    status: 'queued',
    messageAt: now,
    ...fields,
  });

  try {
    message.wamid = await send();
    message.status = 'sent';
  } catch (err) {
    message.status = 'failed';
    message.errorMessage = err.isOperational ? err.message : 'The message could not be sent.';
    if (!err.isOperational) logger.error('[whatsapp] send failed', { error: err.message });
  }
  await message.save();

  await touchConversation(conversation._id, { at: now, text: message.text, type: message.type });
  emitUpdate(conversation._id);
  return message;
}

function assertWindowOpen(conversation) {
  if (!isWindowOpen(conversation)) {
    throw ApiError.conflict('The 24-hour reply window has closed. Send an approved template instead.');
  }
}

async function loadConversation(id) {
  const conversation = await WhatsAppConversation.findById(id).populate({
    path: 'user',
    select: 'name whatsappOptIn role',
    populate: { path: 'role', select: 'name' },
  });
  if (!conversation) throw ApiError.notFound('Conversation not found.');
  return conversation;
}

async function sendText(conversationId, text, actor) {
  assertConfigured();
  const conversation = await loadConversation(conversationId);
  assertWindowOpen(conversation);
  return deliver(conversation, { type: 'text', text, sentBy: actor._id }, () =>
    postMessage(conversation.waId, { type: 'text', text: { body: text, preview_url: false } })
  );
}

function placeholders(body) {
  return [...new Set([...body.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]))];
}

// Customers need to have agreed or to have contacted the shop themselves.
// Staff are reached for work, so their consent is handled outside the app.
function canReceiveTemplate(conversation) {
  if (conversation.user?.whatsappOptIn || conversation.lastInboundAt) return true;
  return Boolean(conversation.user?.role && conversation.user.role.name !== 'customer');
}

async function dispatchTemplate(conversation, template, vars, fields) {
  const settings = await Settings.findOne().lean();
  const values = {
    name: conversation.user?.name || conversation.displayName,
    businessName: settings?.businessName || '',
    ...vars,
  };
  const names = placeholders(template.body);
  const missing = names.filter((name) => !cleanTemplateParam(values[name] ?? ''));
  if (missing.length > 0) throw ApiError.badRequest(`Missing template values: ${missing.join(', ')}.`);

  const text = template.body.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key]);
  return deliver(
    conversation,
    { type: 'template', text, templateName: template.metaName, ...fields },
    () =>
      postMessage(
        conversation.waId,
        templatePayload(template.metaName, template.metaLanguage || 'en', names.map((name) => values[name]))
      )
  );
}

async function sendTemplate(conversationId, { templateId, vars = {} }, actor) {
  assertConfigured();
  const conversation = await loadConversation(conversationId);
  if (conversation.optedOut) throw ApiError.conflict('This contact has opted out of WhatsApp messages.');
  if (!canReceiveTemplate(conversation)) {
    throw ApiError.conflict('This customer has not agreed to receive WhatsApp messages.');
  }

  const template = await WhatsAppTemplate.findById(templateId);
  if (!template) throw ApiError.notFound('Template not found.');
  if (!template.metaName) throw ApiError.badRequest('This template is not linked to an approved Meta template.');

  return dispatchTemplate(conversation, template, vars, { sentBy: actor._id });
}

async function sendToPhone({ phone, name }, { text, templateId, vars }, actor) {
  assertConfigured();
  const { _id } = await openConversation({ phone, name });
  return templateId ? sendTemplate(_id, { templateId, vars }, actor) : sendText(_id, text, actor);
}

// Automatic messages must never get in the way of the action that triggered
// them, so anything that stops one is logged and skipped. No template, no
// consent or an opt-out are normal outcomes, not errors.
async function notifyEvent(event, { phone, name, vars = {} }) {
  if (!isConfigured()) return null;
  try {
    const template = await WhatsAppTemplate.findOne({ event, metaName: { $ne: '' } });
    if (!template) return null;

    const { _id } = await openConversation({ phone, name });
    const conversation = await loadConversation(_id);
    if (conversation.optedOut || !canReceiveTemplate(conversation)) return null;

    return await dispatchTemplate(conversation, template, vars, { event });
  } catch (err) {
    logger.warn('[whatsapp] automatic message skipped', { event, error: err.message });
    return null;
  }
}

function mediaTypeFor(mimeType) {
  return Object.keys(OUTBOUND_MEDIA).find((type) => OUTBOUND_MEDIA[type].mimeTypes.includes(mimeType)) || null;
}

async function sendMedia(conversationId, { buffer, mimeType, filename, caption = '' }, actor) {
  assertConfigured();
  const conversation = await loadConversation(conversationId);
  assertWindowOpen(conversation);

  const type = mediaTypeFor(mimeType);
  if (!type) throw ApiError.badRequest('WhatsApp does not support this file type.');
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw ApiError.badRequest('The file is empty.');
  if (buffer.length > OUTBOUND_MEDIA[type].maxBytes) {
    throw ApiError.badRequest(`This ${type} is larger than WhatsApp allows (${OUTBOUND_MEDIA[type].maxBytes / MB} MB).`);
  }

  const form = new FormData();
  form.append('messaging_product', 'whatsapp');
  form.append('type', mimeType);
  form.append('file', new Blob([buffer], { type: mimeType }), filename);
  const uploaded = await graphJson(`${env.whatsapp.phoneNumberId}/media`, {
    method: 'POST',
    body: form,
    timeoutMs: 60000,
  });

  const mediaPayload = { id: uploaded.id };
  if (type === 'document') mediaPayload.filename = filename;
  if (caption && type !== 'audio') mediaPayload.caption = caption;

  return deliver(
    conversation,
    {
      type,
      text: type === 'audio' ? '' : caption,
      media: { id: uploaded.id, mimeType, filename },
      sentBy: actor._id,
    },
    () => postMessage(conversation.waId, { type, [type]: mediaPayload })
  );
}

// The download URL needs the access token and expires within minutes, so
// media is always fetched on demand instead of handing the URL to the browser.
async function fetchMedia(mediaId) {
  assertConfigured();
  const metaResponse = await graphFetch(mediaId);
  if (!metaResponse.ok) throw ApiError.notFound('This file is no longer available on WhatsApp.');
  const meta = await metaResponse.json();
  const response = await graphFetch(meta.url, { timeoutMs: 120000 });
  if (!response.ok || !response.body) throw ApiError.notFound('This file is no longer available on WhatsApp.');
  return { body: response.body, mimeType: meta.mime_type || '', size: meta.file_size || null };
}

function verifySignature(rawBody, header) {
  if (!env.whatsapp.appSecret || !Buffer.isBuffer(rawBody) || typeof header !== 'string') return false;
  const expected = `sha256=${crypto.createHmac('sha256', env.whatsapp.appSecret).update(rawBody).digest('hex')}`;
  const received = Buffer.from(header);
  const wanted = Buffer.from(expected);
  return received.length === wanted.length && crypto.timingSafeEqual(received, wanted);
}

function parseInbound(message) {
  const media = message[message.type];
  switch (message.type) {
    case 'text':
      return { text: message.text?.body || '' };
    case 'image':
    case 'video':
    case 'audio':
    case 'document':
    case 'sticker':
      return {
        text: media?.caption || '',
        media: { id: media?.id || '', mimeType: media?.mime_type || '', filename: media?.filename || '' },
      };
    case 'location': {
      const { name, address, latitude, longitude } = message.location || {};
      return { text: [name, address, latitude != null ? `${latitude}, ${longitude}` : ''].filter(Boolean).join(' · ') };
    }
    case 'contacts':
      return { text: (message.contacts || []).map((c) => c.name?.formatted_name).filter(Boolean).join(', ') };
    case 'button':
      return { text: message.button?.text || '' };
    case 'interactive':
      return { text: message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || '' };
    case 'reaction':
      return { text: message.reaction?.emoji || '' };
    default:
      return { text: '' };
  }
}

async function applyConsentKeyword(conversation, text) {
  const word = text.trim().toLowerCase();
  const stop = STOP_WORDS.has(word);
  if (!stop && !START_WORDS.has(word)) return;

  await WhatsAppConversation.updateOne({ _id: conversation._id }, { optedOut: stop });
  if (conversation.user) {
    await User.updateOne(
      { _id: conversation.user },
      { whatsappOptIn: !stop, whatsappOptInAt: stop ? null : new Date() }
    );
  }
}

async function recordInbound(message, contacts) {
  const waId = message.from;
  const name = contacts?.find((c) => c.wa_id === waId)?.profile?.name || '';
  const conversation = await getOrCreateConversation(waId, { name });
  const at = new Date(Number(message.timestamp) * 1000 || Date.now());
  const parsed = parseInbound(message);

  try {
    await WhatsAppMessage.create({
      conversation: conversation._id,
      direction: 'inbound',
      wamid: message.id,
      type: message.type,
      text: parsed.text,
      media: parsed.media,
      status: 'received',
      messageAt: at,
    });
  } catch (err) {
    if (err.code === 11000) return; // Redelivered webhook: already recorded.
    throw err;
  }

  await WhatsAppConversation.updateOne(
    { _id: conversation._id },
    { $max: { lastInboundAt: at }, $inc: { unreadCount: 1 } }
  );
  await touchConversation(conversation._id, { at, text: parsed.text, type: message.type });
  if (message.type === 'text') await applyConsentKeyword(conversation, parsed.text);
  emitUpdate(conversation._id);
}

// Meta does not guarantee status order, so a status only ever moves a message
// forward. A failure can replace anything except a confirmed read.
async function recordStatus(status) {
  const failed = status.status === 'failed';
  const rank = STATUS_RANK[status.status];
  if (!failed && rank === undefined) return;

  const earlier = Object.keys(STATUS_RANK).filter((key) => (failed ? key !== 'read' : STATUS_RANK[key] < rank));
  const update = { status: status.status };
  if (failed) {
    const error = status.errors?.[0];
    update.errorMessage = error?.error_data?.details || error?.message || error?.title || 'The message was not delivered.';
  }

  const message = await WhatsAppMessage.findOneAndUpdate(
    { wamid: status.id, direction: 'outbound', status: { $in: earlier } },
    update
  );
  if (message) emitUpdate(message.conversation);
}

async function handleWebhook(payload) {
  for (const entry of payload?.entry || []) {
    for (const change of entry.changes || []) {
      const { value } = change;
      if (change.field !== 'messages' || !value) continue;
      if (value.metadata?.phone_number_id !== env.whatsapp.phoneNumberId) continue;

      for (const message of value.messages || []) await recordInbound(message, value.contacts);
      for (const status of value.statuses || []) await recordStatus(status);
    }
  }
}

async function runBroadcast(broadcast, conversations, actor) {
  const { broadcastTemplate, broadcastLanguage } = env.whatsapp;
  // One at a time: the staff list is small and each result is recorded on its
  // own message, so one bad number can't stop the rest.
  for (const conversation of conversations) {
    await deliver(
      conversation,
      {
        type: 'template',
        text: broadcast.message,
        templateName: broadcastTemplate,
        sentBy: actor._id,
        broadcast: broadcast._id,
      },
      () => postMessage(conversation.waId, templatePayload(broadcastTemplate, broadcastLanguage, [broadcast.message]))
    );
  }
}

async function createStaffBroadcast({ message, roleIds }, actor) {
  assertConfigured();

  const roleFilter = { name: { $ne: 'customer' } };
  if (roleIds?.length) roleFilter._id = { $in: roleIds };
  const roles = await Role.find(roleFilter).select('_id');
  const staff = await User.find({
    role: { $in: roles.map((role) => role._id) },
    isActive: true,
    _id: { $ne: actor._id },
  });

  const conversations = [];
  const skipped = [];
  for (const user of staff) {
    const waId = toWaId(user.phone);
    if (!waId) {
      skipped.push({ user: user._id, name: user.name, reason: 'invalid_phone' });
      continue;
    }
    const conversation = await getOrCreateConversation(waId, { user });
    if (conversation.optedOut) {
      skipped.push({ user: user._id, name: user.name, reason: 'opted_out' });
      continue;
    }
    conversations.push(conversation);
  }
  if (conversations.length === 0) throw ApiError.badRequest('No staff member can receive this message.');

  const broadcast = await StaffBroadcast.create({
    message,
    roles: roleIds || [],
    sender: actor._id,
    senderName: actor.name,
    recipientCount: conversations.length,
    skipped,
  });

  // Runs after the response because the frontend proxy times out at 30
  // seconds. Progress shows in the broadcast history as messages are recorded.
  runBroadcast(broadcast, conversations, actor).catch((err) => {
    logger.error('[whatsapp] broadcast stopped', { broadcast: String(broadcast._id), error: err.message });
  });

  return broadcast;
}

async function listBroadcasts(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
  const [broadcasts, total] = await Promise.all([
    StaffBroadcast.find().sort('-createdAt').skip((page - 1) * limit).limit(limit).lean(),
    StaffBroadcast.countDocuments(),
  ]);

  const ids = broadcasts.map((broadcast) => broadcast._id);
  const [counts, failures] = await Promise.all([
    WhatsAppMessage.aggregate([
      { $match: { broadcast: { $in: ids } } },
      { $group: { _id: { broadcast: '$broadcast', status: '$status' }, count: { $sum: 1 } } },
    ]),
    WhatsAppMessage.find({ broadcast: { $in: ids }, status: 'failed' })
      .select('broadcast errorMessage conversation')
      .populate('conversation', 'displayName')
      .lean(),
  ]);

  const items = broadcasts.map((broadcast) => {
    const statuses = {};
    counts
      .filter((row) => String(row._id.broadcast) === String(broadcast._id))
      .forEach((row) => { statuses[row._id.status] = row.count; });
    return {
      ...broadcast,
      statuses,
      failures: failures
        .filter((row) => String(row.broadcast) === String(broadcast._id))
        .map((row) => ({ name: row.conversation?.displayName || '', error: row.errorMessage })),
    };
  });

  return { items, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
}

module.exports = {
  isConfigured,
  isWindowOpen,
  serializeConversation,
  openConversation,
  sendText,
  sendTemplate,
  sendToPhone,
  notifyEvent,
  sendMedia,
  fetchMedia,
  verifySignature,
  handleWebhook,
  createStaffBroadcast,
  listBroadcasts,
};
