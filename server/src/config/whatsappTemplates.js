// The site's templates and the Meta templates they map to. `body` uses named
// placeholders on the site; createWhatsAppTemplates.js converts them to Meta's
// numbered {{1}}, {{2}}... in first-appearance order, which is also the order
// WhatsAppService sends the values in.
const WHATSAPP_TEMPLATES = [
  {
    name: 'Account Approved',
    body: 'Hi {{name}}, this is {{businessName}}. Your account has been approved, you can now book online.',
    description: 'Tell a customer their account was approved for online booking.',
    event: 'account_approved',
    metaName: 'account_approved',
    metaLanguage: 'en',
    metaCategory: 'UTILITY',
  },
  {
    name: 'Account Not Approved',
    body: 'Hi {{name}}, this is {{businessName}}. Your account was not approved for online booking. Please contact the shop.',
    description: 'Tell a customer their account was not approved.',
    event: 'account_rejected',
    metaName: 'account_rejected',
    metaLanguage: 'en',
    metaCategory: 'UTILITY',
  },
  {
    name: 'Appointment Confirmed',
    body: 'Hi {{name}}, your appointment on {{date}} at {{time}} with {{barberName}} is confirmed. See you soon!',
    description: 'Sent when an appointment is accepted.',
    event: 'appointment_confirmed',
    metaName: 'appointment_confirmed',
    metaLanguage: 'en',
    metaCategory: 'UTILITY',
  },
  {
    name: 'Appointment Not Accepted',
    body: 'Hi {{name}}, sorry, we could not accept your appointment on {{date}} at {{time}}. Please book another time.',
    description: 'Sent when an appointment is rejected.',
    event: 'appointment_rejected',
    metaName: 'appointment_rejected',
    metaLanguage: 'en',
    metaCategory: 'UTILITY',
  },
  {
    name: 'Appointment Canceled',
    body: 'Hi {{name}}, your appointment on {{date}} at {{time}} with {{barberName}} has been canceled.',
    description: 'Sent when the shop cancels an appointment.',
    event: 'appointment_canceled',
    metaName: 'appointment_canceled',
    metaLanguage: 'en',
    metaCategory: 'UTILITY',
  },
  {
    name: 'Appointment Rescheduled',
    body: 'Hi {{name}}, your appointment has moved to {{date}} at {{time}} with {{barberName}}. See you then.',
    description: 'Sent when the shop moves an appointment.',
    event: 'appointment_rescheduled',
    metaName: 'appointment_rescheduled',
    metaLanguage: 'en',
    metaCategory: 'UTILITY',
  },
  {
    name: 'Appointment Reminder',
    body: 'Hi {{name}}, this is a reminder about your appointment on {{date}} at {{time}} with {{barberName}}. See you soon!',
    description: 'Remind a customer about an upcoming appointment.',
    event: 'appointment_reminder',
    metaName: 'appointment_reminder',
    metaLanguage: 'en',
    metaCategory: 'UTILITY',
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
    metaName: 'loyalty_gift',
    metaLanguage: 'en',
    metaCategory: 'MARKETING',
  },
];

// Only exists on Meta. Its one variable is the broadcast text.
const STAFF_BROADCAST_TEMPLATE = {
  body: 'Team message from Faytarouni: {{body}}. Please contact the shop with any questions.',
  metaName: 'staff_broadcast',
  metaLanguage: 'en',
  metaCategory: 'UTILITY',
};

module.exports = { WHATSAPP_TEMPLATES, STAFF_BROADCAST_TEMPLATE };
