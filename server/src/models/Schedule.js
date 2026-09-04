const mongoose = require('mongoose');

const breakSchema = new mongoose.Schema(
  {
    start: { type: String, required: true },
    end: { type: String, required: true }
  },
  { _id: false }
);

const businessHoursSchema = new mongoose.Schema(
  {
    location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    isOpen: { type: Boolean, default: true },
    openTime: { type: String, default: '09:00' },
    closeTime: { type: String, default: '19:00' },
    slotIntervalMinutes: { type: Number, default: 30, min: 5, max: 120 },
    breaks: { type: [breakSchema], default: [] },
  },
  { timestamps: true }
);
businessHoursSchema.index({ location: 1, dayOfWeek: 1 }, { unique: true });

const holidaySchema = new mongoose.Schema(
  {
    location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },
    date: { type: Date, required: true },
    reason: { type: String, default: '' },
  },
  { timestamps: true }
);
holidaySchema.index({ location: 1, date: 1 }, { unique: true });

module.exports = {
  BusinessHours: mongoose.model('BusinessHours', businessHoursSchema),
  Holiday: mongoose.model('Holiday', holidaySchema),
};
