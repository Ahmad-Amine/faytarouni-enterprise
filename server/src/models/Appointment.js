const mongoose = require('mongoose');
const { APPOINTMENT_STATUS, APPOINTMENT_SOURCE, PAYMENT_METHOD } = require('../config/constants');

const appointmentServiceSchema = new mongoose.Schema(
  {
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    durationMinutes: { type: Number, required: true },
  },
  { _id: false }
);

const appointmentSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, required: true, trim: true },

    barber: { type: mongoose.Schema.Types.ObjectId, ref: 'Barber', required: true },
    location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },

    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },

    services: { type: [appointmentServiceSchema], default: [] },

    subtotal: { type: Number, required: true, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true, default: 0 },
    coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },

    status: {
      type: String,
      enum: Object.values(APPOINTMENT_STATUS),
      default: APPOINTMENT_STATUS.PENDING,
    },
    source: {
      type: String,
      enum: Object.values(APPOINTMENT_SOURCE),
      default: APPOINTMENT_SOURCE.ONLINE,
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PAYMENT_METHOD),
      default: PAYMENT_METHOD.UNPAID,
    },
    isPaid: { type: Boolean, default: false },

    createdByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    adminNote: { type: String, default: '', maxlength: 500 },
    cancellationReason: { type: String, default: '' },

    rescheduledFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
  },
  { timestamps: true }
);

appointmentSchema.index(
  { barber: 1, date: 1, startTime: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } },
  }
);
appointmentSchema.index({ customer: 1, date: -1 });
appointmentSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
