const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { productRepository, productSaleRepository } = require('../repositories');
const inventoryService = require('../services/InventoryService');

exports.list = catchAsync(async (req, res) => {
  const { items, meta } = await productSaleRepository.paginate({}, req.query, {
    populate: { path: 'product', select: 'name sku' },
    defaultSort: '-createdAt',
  });
  return new ApiResponse(200, items, 'OK', meta).send(res);
});

exports.create = catchAsync(async (req, res, next) => {
  const { productId, quantity, customerName, customerPhone, customerId } = req.body;

  const product = await productRepository.findById(productId);
  if (!product) return next(ApiError.notFound('Product not found.'));
  if (product.stock < quantity) return next(ApiError.badRequest('Not enough stock for this sale.'));

  const unitPrice = product.price;
  const total = Number((unitPrice * quantity).toFixed(2));

  await inventoryService.decrementStock(productId, quantity);

  const sale = await productSaleRepository.create({
    product: product._id,
    productName: product.name,
    unitPrice,
    quantity,
    total,
    customer: customerId || null,
    customerName: customerName || '',
    customerPhone: customerPhone || '',
    soldBy: req.user?._id || null,
  });

  return new ApiResponse(201, sale, 'Sale recorded.').send(res);
});
