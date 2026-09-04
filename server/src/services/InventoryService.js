const { productRepository, purchaseOrderRepository } = require('../repositories');
const ApiError = require('../utils/ApiError');
const { PURCHASE_ORDER_STATUS } = require('../config/constants');
const notificationService = require('./NotificationService');

async function decrementStock(productId, quantity) {
  const product = await productRepository.findById(productId);
  if (!product) throw ApiError.notFound('Product not found.');
  product.stock = Math.max(0, product.stock - quantity);
  await product.save();

  if (product.stock <= product.lowStockThreshold) {
    await notificationService.notifyAdmins(
      'low_stock',
      `${product.name} is low on stock (${product.stock} left).`,
      '/admin/inventory'
    );
  }
  return product;
}

async function receivePurchaseOrder(poId) {
  const po = await purchaseOrderRepository.findById(poId, { populate: 'items.product' });
  if (!po) throw ApiError.notFound('Purchase order not found.');
  if (po.status === PURCHASE_ORDER_STATUS.RECEIVED) throw ApiError.badRequest('Already received.');

  for (const item of po.items) {
    const product = await productRepository.findById(item.product._id || item.product);
    if (product) {
      product.stock += item.quantity;
      product.cost = item.unitCost;
      await product.save();
    }
  }

  po.status = PURCHASE_ORDER_STATUS.RECEIVED;
  po.receivedAt = new Date();
  await po.save();
  return po;
}

async function getLowStockProducts() {
  const products = await productRepository.find({ isActive: true });
  return products.filter((p) => p.stock <= p.lowStockThreshold);
}

module.exports = { decrementStock, receivePurchaseOrder, getLowStockProducts };
