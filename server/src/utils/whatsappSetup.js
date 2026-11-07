const { PERMISSIONS } = require('../config/constants');
const { WHATSAPP_TEMPLATES } = require('../config/whatsappTemplates');
const Role = require('../models/Role');
const { Settings, WhatsAppTemplate } = require('../models/System');
const { WhatsAppConversation, WhatsAppMessage, StaffBroadcast } = require('../models/WhatsApp');
const logger = require('./logger');

const SETUP_VERSION = 2;

async function grantWhatsAppPermissions() {
  const admin = await Role.findOne({ name: 'admin' });
  if (admin) await admin.save(); // The pre-save hook grants every permission.

  await Role.updateOne(
    { name: 'manager' },
    { $addToSet: { permissions: { $each: [PERMISSIONS.WHATSAPP_INBOX, PERMISSIONS.WHATSAPP_SEND] } } }
  );
  await Role.updateOne({ name: 'barber' }, { $addToSet: { permissions: PERMISSIONS.WHATSAPP_SEND } });
}

async function ensureWhatsAppTemplates() {
  for (const template of WHATSAPP_TEMPLATES) {
    const existing = await WhatsAppTemplate.findOne({ name: template.name });
    if (!existing) {
      await WhatsAppTemplate.create(template);
      continue;
    }

    const updates = {};
    if (template.event && !existing.event && !(await WhatsAppTemplate.exists({ event: template.event }))) {
      updates.event = template.event;
    }
    // Reworded templates stay unlinked: Meta's approved text must match, and
    // their placeholders may not line up with the approved one.
    if (template.metaName && !existing.metaName && existing.body === template.body) {
      updates.metaName = template.metaName;
      updates.metaLanguage = template.metaLanguage;
    }
    if (Object.keys(updates).length > 0) await WhatsAppTemplate.updateOne({ _id: existing._id }, updates);
  }
}

// connectDB turns autoIndex off in production, but these unique indexes are
// what stop redelivered webhooks creating duplicates, so they are built here.
async function ensureWhatsAppIndexes() {
  await Promise.all([
    WhatsAppConversation.createIndexes(),
    WhatsAppMessage.createIndexes(),
    StaffBroadcast.createIndexes(),
    WhatsAppTemplate.createIndexes(),
  ]);
}

// Runs at startup. Roles and templates only change once per database, so an
// admin who later edits them is not overruled by the next deploy. A failure is
// logged and retried on the next start rather than keeping the API down.
async function runWhatsAppSetup() {
  try {
    await ensureWhatsAppIndexes();

    const settings = await Settings.findOne({ singleton: 'main' });
    if (!settings || settings.whatsappSetupVersion >= SETUP_VERSION) return; // A new database gets these from the seed.

    if (settings.whatsappSetupVersion < 1) await grantWhatsAppPermissions();
    await ensureWhatsAppTemplates();
    await Settings.updateOne({ _id: settings._id }, { whatsappSetupVersion: SETUP_VERSION });
    logger.info('[whatsapp] one-time setup finished');
  } catch (err) {
    logger.error('[whatsapp] setup failed', { error: err.message });
  }
}

module.exports = { SETUP_VERSION, grantWhatsAppPermissions, ensureWhatsAppTemplates, runWhatsAppSetup };
