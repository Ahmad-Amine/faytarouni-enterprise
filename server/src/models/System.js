const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: 'main', unique: true },
    businessName: { type: String, default: 'Faytarouni Barbershop' },
    logoUrl: { type: String, default: '' },
    currency: { type: String, default: 'USD' },
    timezone: { type: String, default: 'UTC' },
    loyaltyAppointmentThreshold: { type: Number, default: 10 },
    whatsappAdminNumber: { type: String, default: '' },
    contacts: {
      type: [
        new mongoose.Schema(
          {
            type: { type: String, required: true },
            label: { type: String, default: '' },
            value: { type: String, required: true },
          },
          { _id: true }
        ),
      ],
      default: [],
    },
    texts: {
      type: Map,
      of: new mongoose.Schema({ en: { type: String, default: '' }, ar: { type: String, default: '' } }, { _id: false }),
      default: {},
    },
    theme: { primaryColor: { type: String, default: '#c1531b' } },
  },
  { timestamps: true, toJSON: { flattenMaps: true }, toObject: { flattenMaps: true } }
);

const emailTemplateSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    subject: { type: String, required: true },
    bodyHtml: { type: String, required: true },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

const whatsAppTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

const notificationSchema = new mongoose.Schema(
  {
    audience: { type: String, enum: ['admin', 'customer'], required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    type: {
      type: String,
      enum: [
        'new_appointment',
        'appointment_status_changed',
        'loyalty_gift',
        'birthday',
        'low_stock',
        'new_review',
      ],
      required: true,
    },
    message: { type: String, required: true },
    link: { type: String, default: '' },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);
notificationSchema.index({ audience: 1, isRead: 1, createdAt: -1 });

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String, default: 'system' },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    changes: { type: mongoose.Schema.Types.Mixed, default: null },
    ip: { type: String, default: '' },
  },
  { timestamps: true }
);
auditLogSchema.index({ createdAt: -1 });

module.exports = {
  Settings: mongoose.model('Settings', settingsSchema),
  EmailTemplate: mongoose.model('EmailTemplate', emailTemplateSchema),
  WhatsAppTemplate: mongoose.model('WhatsAppTemplate', whatsAppTemplateSchema),
  Notification: mongoose.model('Notification', notificationSchema),
  AuditLog: mongoose.model('AuditLog', auditLogSchema),
};
