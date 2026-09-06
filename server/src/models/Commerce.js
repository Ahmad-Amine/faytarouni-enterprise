const mongoose = require('mongoose');
const { COUPON_TYPE } = require('../config/constants');

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    type: { type: String, enum: Object.values(COUPON_TYPE), required: true },
    value: { type: Number, required: true, min: 0 },
    minSpend: { type: Number, default: 0 },
    usageLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const taxSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    rate: { type: Number, required: true, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },
    appliesToProducts: { type: Boolean, default: true },
    appliesToServices: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = {
  Coupon: mongoose.model('Coupon', couponSchema),
  Tax: mongoose.model('Tax', taxSchema),
};
