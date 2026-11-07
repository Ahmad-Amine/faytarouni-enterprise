const mongoose = require('mongoose');

const whatsAppConversationSchema = new mongoose.Schema(
  {
    // Meta's identifier for the contact: the phone number as digits only.
    waId: { type: String, required: true, unique: true, trim: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    displayName: { type: String, default: '', trim: true, maxlength: 120 },
    lastMessageAt: { type: Date, default: null, index: true },
    lastMessagePreview: { type: String, default: '', maxlength: 160 },
    lastMessageType: { type: String, default: 'text' },
    // Drives the 24-hour rule: free-form replies are only allowed while this
    // is less than 24 hours old.
    lastInboundAt: { type: Date, default: null },
    unreadCount: { type: Number, default: 0, min: 0 },
    // Set when the contact replies STOP. Blocks templates, not replies to a
    // message they send afterwards.
    optedOut: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const whatsAppMessageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppConversation', required: true },
    direction: { type: String, enum: ['inbound', 'outbound'], required: true },
    wamid: { type: String, default: null },
    type: { type: String, required: true, default: 'text' },
    text: { type: String, default: '' },
    media: {
      id: { type: String, default: '' },
      mimeType: { type: String, default: '' },
      filename: { type: String, default: '' },
    },
    templateName: { type: String, default: '' },
    event: { type: String, default: '' },
    status: {
      type: String,
      enum: ['received', 'queued', 'sent', 'delivered', 'read', 'failed'],
      required: true,
    },
    errorMessage: { type: String, default: '' },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    broadcast: { type: mongoose.Schema.Types.ObjectId, ref: 'StaffBroadcast', default: null },
    messageAt: { type: Date, required: true },
  },
  { timestamps: true }
);
// Meta redelivers webhooks, so wamid is what makes inbound handling idempotent.
whatsAppMessageSchema.index({ wamid: 1 }, { unique: true, partialFilterExpression: { wamid: { $type: 'string' } } });
whatsAppMessageSchema.index({ conversation: 1, messageAt: -1 });
whatsAppMessageSchema.index({ broadcast: 1, status: 1 });
whatsAppMessageSchema.index({ createdAt: 1 });

const staffBroadcastSchema = new mongoose.Schema(
  {
    message: { type: String, required: true, maxlength: 900 },
    roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, default: '' },
    recipientCount: { type: Number, default: 0 },
    skipped: [
      new mongoose.Schema(
        { user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, name: String, reason: String },
        { _id: false }
      ),
    ],
  },
  { timestamps: true }
);
staffBroadcastSchema.index({ createdAt: -1 });

module.exports = {
  WhatsAppConversation: mongoose.model('WhatsAppConversation', whatsAppConversationSchema),
  WhatsAppMessage: mongoose.model('WhatsAppMessage', whatsAppMessageSchema),
  StaffBroadcast: mongoose.model('StaffBroadcast', staffBroadcastSchema),
};
