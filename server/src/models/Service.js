const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    description: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    durationMinutes: { type: Number, required: true, min: 5, default: 30 },
    isVip: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

serviceSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Service', serviceSchema);
