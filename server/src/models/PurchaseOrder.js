const mongoose = require('mongoose');
const { PURCHASE_ORDER_STATUS } = require('../config/constants');

const poItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    nameSnapshot: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    items: { type: [poItemSchema], default: [] },
    status: {
      type: String,
      enum: Object.values(PURCHASE_ORDER_STATUS),
      default: PURCHASE_ORDER_STATUS.DRAFT,
    },
    totalCost: { type: Number, default: 0 },
    orderedAt: { type: Date, default: null },
    receivedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

purchaseOrderSchema.pre('save', function computeTotal(next) {
  this.totalCost = this.items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
  next();
});

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
