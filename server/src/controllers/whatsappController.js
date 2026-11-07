const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const logger = require('../utils/logger');
const auditService = require('../services/AuditService');
const whatsappService = require('../services/WhatsAppService');
const { whatsAppConversationRepository, whatsAppMessageRepository } = require('../repositories');
const { WhatsAppConversation } = require('../models/WhatsApp');

// Files come from outside the business and are served from the site's own
// origin through the proxy, so only formats a browser cannot execute may
// render inline. Everything else (SVG and HTML included) is a plain download.
const INLINE_MEDIA = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'audio/aac',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
]);

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function audit(req, action, entityId, changes) {
  return auditService.log(req, { actor: req.user, action, entityType: 'WhatsApp', entityId, changes });
}

exports.status = catchAsync(async (req, res) => {
  return new ApiResponse(200, { connected: whatsappService.isConfigured() }).send(res);
});

exports.unreadCount = catchAsync(async (req, res) => {
  const [row] = await WhatsAppConversation.aggregate([{ $group: { _id: null, total: { $sum: '$unreadCount' } } }]);
  return new ApiResponse(200, { unread: row?.total || 0 }).send(res);
});

exports.listConversations = catchAsync(async (req, res) => {
  const query = { ...req.query };
  if (query.search) query.search = escapeRegExp(query.search);
  const { items, meta } = await whatsAppConversationRepository.paginate({}, query, {
    searchableFields: ['displayName', 'waId'],
    defaultSort: '-lastMessageAt',
  });
  return new ApiResponse(200, items.map((item) => whatsappService.serializeConversation(item)), 'OK', meta).send(res);
});

exports.openConversation = catchAsync(async (req, res) => {
  const conversation = await whatsappService.openConversation(req.body);
  return new ApiResponse(200, whatsappService.serializeConversation(conversation)).send(res);
});

exports.getConversation = catchAsync(async (req, res, next) => {
  const conversation = await whatsAppConversationRepository.findById(req.params.id, {
    populate: { path: 'user', select: 'name whatsappOptIn' },
  });
  if (!conversation) return next(ApiError.notFound('Conversation not found.'));
  return new ApiResponse(200, whatsappService.serializeConversation(conversation)).send(res);
});

exports.listMessages = catchAsync(async (req, res) => {
  const { items, meta } = await whatsAppMessageRepository.paginate(
    { conversation: req.params.id },
    { page: req.query.page, limit: req.query.limit },
    { defaultSort: '-messageAt', populate: { path: 'sentBy', select: 'name' }, maxLimit: 200 }
  );
  return new ApiResponse(200, items, 'OK', meta).send(res);
});

exports.markRead = catchAsync(async (req, res) => {
  await WhatsAppConversation.updateOne({ _id: req.params.id }, { unreadCount: 0 });
  return new ApiResponse(200, null).send(res);
});

exports.sendText = catchAsync(async (req, res) => {
  const message = await whatsappService.sendText(req.params.id, req.body.text, req.user);
  await audit(req, 'whatsapp.message_sent', req.params.id, { type: 'text', status: message.status });
  return new ApiResponse(201, message).send(res);
});

exports.sendTemplate = catchAsync(async (req, res) => {
  const message = await whatsappService.sendTemplate(req.params.id, req.body, req.user);
  await audit(req, 'whatsapp.message_sent', req.params.id, {
    type: 'template',
    template: message.templateName,
    status: message.status,
  });
  return new ApiResponse(201, message).send(res);
});

exports.sendMedia = catchAsync(async (req, res) => {
  const mimeType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  const message = await whatsappService.sendMedia(
    req.params.id,
    { buffer: req.body, mimeType, filename: req.query.filename, caption: req.query.caption },
    req.user
  );
  await audit(req, 'whatsapp.message_sent', req.params.id, { type: message.type, status: message.status });
  return new ApiResponse(201, message).send(res);
});

exports.downloadMedia = catchAsync(async (req, res, next) => {
  const message = await whatsAppMessageRepository.findById(req.params.id);
  if (!message?.media?.id) return next(ApiError.notFound('File not found.'));

  const media = await whatsappService.fetchMedia(message.media.id);
  const mimeType = media.mimeType.split(';')[0].trim().toLowerCase();
  const inline = INLINE_MEDIA.has(mimeType);
  const filename = (message.media.filename || 'whatsapp-file').replace(/[^\w.\- ]/g, '_');

  res.set({
    'Content-Type': inline ? mimeType : 'application/octet-stream',
    'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${filename}"`,
    'Content-Security-Policy': "sandbox; default-src 'none'",
    'Cache-Control': 'private, max-age=3600',
  });
  if (media.size) res.set('Content-Length', String(media.size));

  try {
    await pipeline(Readable.fromWeb(media.body), res);
  } catch (err) {
    logger.warn('[whatsapp] media download interrupted', { error: err.message });
    res.destroy();
  }
});

exports.createBroadcast = catchAsync(async (req, res) => {
  const broadcast = await whatsappService.createStaffBroadcast(req.body, req.user);
  await auditService.log(req, {
    actor: req.user,
    action: 'whatsapp.broadcast_sent',
    entityType: 'StaffBroadcast',
    entityId: broadcast._id,
    changes: { recipientCount: broadcast.recipientCount, skipped: broadcast.skipped.length },
  });
  return new ApiResponse(202, broadcast, 'Broadcast started.').send(res);
});

exports.listBroadcasts = catchAsync(async (req, res) => {
  const { items, meta } = await whatsappService.listBroadcasts(req.query);
  return new ApiResponse(200, items, 'OK', meta).send(res);
});

// Meta's handshake. req.query can't be used here: express-mongo-sanitize
// strips keys containing dots, which removes every hub.* parameter.
exports.verifyWebhook = (req, res) => {
  const params = new URL(req.originalUrl, 'http://localhost').searchParams;
  const token = params.get('hub.verify_token');
  if (env.whatsapp.verifyToken && params.get('hub.mode') === 'subscribe' && token === env.whatsapp.verifyToken) {
    return res.status(200).type('text/plain').send(params.get('hub.challenge') || '');
  }
  return res.sendStatus(403);
};

exports.receiveWebhook = catchAsync(async (req, res, next) => {
  if (!whatsappService.verifySignature(req.body, req.headers['x-hub-signature-256'])) {
    return next(ApiError.unauthorized('Invalid signature.'));
  }
  let payload;
  try {
    payload = JSON.parse(req.body.toString('utf8'));
  } catch {
    return next(ApiError.badRequest('Invalid JSON.'));
  }
  // A failure here returns 5xx so Meta redelivers; handling is idempotent.
  await whatsappService.handleWebhook(payload);
  return res.sendStatus(200);
});
