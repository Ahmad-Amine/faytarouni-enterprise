const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { productRepository } = require('../repositories');
const inventoryService = require('../services/InventoryService');

exports.listPublic = catchAsync(async (req, res) => {
  const { items, meta } = await productRepository.paginate({ isActive: true }, req.query, {
    searchableFields: ['name', 'sku'],
  });
  return new ApiResponse(200, items, 'OK', meta).send(res);
});

exports.list = catchAsync(async (req, res) => {
  const { items, meta } = await productRepository.paginate({}, req.query, {
    searchableFields: ['name', 'sku'],
    populate: 'supplier',
  });
  return new ApiResponse(200, items, 'OK', meta).send(res);
});

exports.getOne = catchAsync(async (req, res, next) => {
  const product = await productRepository.findById(req.params.id, { populate: 'supplier' });
  if (!product) return next(ApiError.notFound('Product not found.'));
  return new ApiResponse(200, product).send(res);
});

exports.create = catchAsync(async (req, res) => {
  const product = await productRepository.create(req.body);
  return new ApiResponse(201, product, 'Product created.').send(res);
});

exports.update = catchAsync(async (req, res, next) => {
  const product = await productRepository.updateById(req.params.id, req.body);
  if (!product) return next(ApiError.notFound('Product not found.'));
  return new ApiResponse(200, product, 'Product updated.').send(res);
});

exports.remove = catchAsync(async (req, res, next) => {
  const product = await productRepository.deleteById(req.params.id);
  if (!product) return next(ApiError.notFound('Product not found.'));
  return new ApiResponse(200, null, 'Product deleted.').send(res);
});

exports.adjustStock = catchAsync(async (req, res, next) => {
  const { delta } = req.body;
  if (typeof delta !== 'number') return next(ApiError.badRequest('delta must be a number.'));
  const product = delta < 0
    ? await inventoryService.decrementStock(req.params.id, Math.abs(delta))
    : await productRepository.updateById(req.params.id, { $inc: { stock: delta } });
  return new ApiResponse(200, product, 'Stock updated.').send(res);
});

exports.lowStock = catchAsync(async (req, res) => {
  const products = await inventoryService.getLowStockProducts();
  return new ApiResponse(200, products).send(res);
});
