const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contactName: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    description: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    category: { type: String, default: 'general' },
    price: { type: Number, required: true, min: 0 },
    cost: { type: Number, required: true, min: 0, default: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, required: true, min: 0, default: 5 },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
productSchema.index({ name: 'text', sku: 'text' });

module.exports = {
  Supplier: mongoose.model('Supplier', supplierSchema),
  Product: mongoose.model('Product', productSchema),
};
