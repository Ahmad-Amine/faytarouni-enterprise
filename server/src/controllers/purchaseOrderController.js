const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { purchaseOrderRepository, productRepository } = require('../repositories');
const inventoryService = require('../services/InventoryService');
const { PURCHASE_ORDER_STATUS } = require('../config/constants');

exports.list = catchAsync(async (req, res) => {
  const { items, meta } = await purchaseOrderRepository.paginate({}, req.query, {
    populate: ['supplier', 'items.product'],
    defaultSort: '-createdAt',
  });
  return new ApiResponse(200, items, 'OK', meta).send(res);
});

exports.getOne = catchAsync(async (req, res, next) => {
  const po = await purchaseOrderRepository.findById(req.params.id, { populate: ['supplier', 'items.product'] });
  if (!po) return next(ApiError.notFound('Purchase order not found.'));
  return new ApiResponse(200, po).send(res);
});

exports.create = catchAsync(async (req, res) => {
  const products = await productRepository.find({ _id: { $in: req.body.items.map((i) => i.product) } });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  const items = req.body.items.map((i) => ({
    ...i,
    nameSnapshot: productMap.get(i.product)?.name || 'Unknown product',
  }));

  const po = await purchaseOrderRepository.create({ ...req.body, items, createdBy: req.user._id });
  return new ApiResponse(201, po, 'Purchase order created.').send(res);
});

exports.markOrdered = catchAsync(async (req, res, next) => {
  const po = await purchaseOrderRepository.updateById(req.params.id, {
    status: PURCHASE_ORDER_STATUS.ORDERED,
    orderedAt: new Date(),
  });
  if (!po) return next(ApiError.notFound('Purchase order not found.'));
  return new ApiResponse(200, po, 'Marked as ordered.').send(res);
});

exports.receive = catchAsync(async (req, res) => {
  const po = await inventoryService.receivePurchaseOrder(req.params.id);
  return new ApiResponse(200, po, 'Stock received and inventory updated.').send(res);
});

exports.cancel = catchAsync(async (req, res, next) => {
  const po = await purchaseOrderRepository.updateById(req.params.id, { status: PURCHASE_ORDER_STATUS.CANCELED });
  if (!po) return next(ApiError.notFound('Purchase order not found.'));
  return new ApiResponse(200, po, 'Purchase order canceled.').send(res);
});
