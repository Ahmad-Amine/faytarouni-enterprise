const { PERMISSIONS } = require('../config/constants');
const Role = require('../models/Role');
const { Settings, WhatsAppTemplate } = require('../models/System');
const { WhatsAppConversation, WhatsAppMessage, StaffBroadcast } = require('../models/WhatsApp');
const logger = require('./logger');

const SETUP_VERSION = 1;

const WHATSAPP_TEMPLATES = [
  {
    name: 'Account Approved',
    body: 'Hi {{name}}, this is {{businessName}}. Your account has been approved, you can now book online.',
    description: 'Tell a customer their account was approved for online booking.',
    event: 'account_approved',
  },
  {
    name: 'Account Not Approved',
    body: 'Hi {{name}}, this is {{businessName}}. Your account was not approved for online booking. Please contact the shop.',
    description: 'Tell a customer their account was not approved.',
    event: 'account_rejected',
  },
  {
    name: 'Appointment Confirmed',
    body: 'Hi {{name}}, your appointment on {{date}} at {{time}} with {{barberName}} is confirmed. See you soon!',
    description: 'Sent when an appointment is accepted.',
    event: 'appointment_confirmed',
  },
  {
    name: 'Appointment Not Accepted',
    body: 'Hi {{name}}, sorry, we could not accept your appointment on {{date}} at {{time}}. Please book another time.',
    description: 'Sent when an appointment is rejected.',
    event: 'appointment_rejected',
  },
  {
    name: 'Appointment Canceled',
    body: 'Hi {{name}}, your appointment on {{date}} at {{time}} with {{barberName}} has been canceled.',
    description: 'Sent when the shop cancels an appointment.',
    event: 'appointment_canceled',
  },
  {
    name: 'Appointment Rescheduled',
    body: 'Hi {{name}}, your appointment has moved to {{date}} at {{time}} with {{barberName}}. See you then.',
    description: 'Sent when the shop moves an appointment.',
    event: 'appointment_rescheduled',
  },
  {
    name: 'Appointment Reminder',
    body: 'Hi {{name}}, this is a reminder about your appointment on {{date}} at {{time}} with {{barberName}}. See you soon!',
    description: 'Remind a customer about an upcoming appointment.',
    event: 'appointment_reminder',
  },
  {
    name: 'Appointment Follow-up',
    body: 'Hi {{name}}, about your appointment on {{date}} at {{time}}...',
    description: 'General follow-up about a specific appointment.',
  },
  {
    name: 'Loyalty Gift',
    body: 'Hi {{name}}, thank you for being such a loyal customer! As a small thank-you from us, you have a gift waiting for you on your next visit.',
    description: 'Sent when a customer crosses the loyalty appointment threshold.',
  },
];

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
    } else if (template.event && !existing.event && !(await WhatsAppTemplate.exists({ event: template.event }))) {
      await WhatsAppTemplate.updateOne({ _id: existing._id }, { event: template.event });
    }
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

    await grantWhatsAppPermissions();
    await ensureWhatsAppTemplates();
    await Settings.updateOne({ _id: settings._id }, { whatsappSetupVersion: SETUP_VERSION });
    logger.info('[whatsapp] one-time setup finished');
  } catch (err) {
    logger.error('[whatsapp] setup failed', { error: err.message });
  }
}

module.exports = { SETUP_VERSION, grantWhatsAppPermissions, ensureWhatsAppTemplates, runWhatsAppSetup };
