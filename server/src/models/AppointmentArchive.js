const mongoose = require('mongoose');

const archivedServiceSchema = new mongoose.Schema(
  {
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', default: null },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    price: { type: Number, required: true, default: 0 },
    durationMinutes: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

// Compact, lower-PII historical record. Customer name, phone, admin notes and
// cancellation text are intentionally not copied into the archive.
const appointmentArchiveSchema = new mongoose.Schema(
  {
    originalAppointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      unique: true,
      immutable: true,
    },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    barber: { type: mongoose.Schema.Types.ObjectId, ref: 'Barber', required: true },
    location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    services: {
      type: [archivedServiceSchema],
      default: [],
      validate: [(v) => v.length <= 20, 'An archived appointment can contain at most 20 services.'],
    },
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },
    status: { type: String, required: true },
    source: { type: String, required: true },
    paymentMethod: { type: String, required: true },
    isPaid: { type: Boolean, default: false },
    originalCreatedAt: { type: Date, default: null },
    originalUpdatedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: Date.now, immutable: true },
  },
  { timestamps: false }
);

appointmentArchiveSchema.index({ date: 1 });
appointmentArchiveSchema.index({ customer: 1, date: -1 });
appointmentArchiveSchema.index({ barber: 1, date: -1 });

module.exports = mongoose.model('AppointmentArchive', appointmentArchiveSchema);
