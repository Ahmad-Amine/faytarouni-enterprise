const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const reportService = require('../services/ReportService');
const { productRepository, purchaseOrderRepository } = require('../repositories');

// ?period=day|month|year&count=N, or the legacy ?months=N.
function reportRange(query) {
  if (query.period) return [String(query.period), query.count];
  return [Number(query.months) || 6];
}

exports.revenueSummary = catchAsync(async (req, res) => {
  const data = await reportService.revenueSummary();
  return new ApiResponse(200, data).send(res);
});

exports.dashboard = catchAsync(async (req, res) => {
  const summary = await reportService.dashboardSummary();
  return new ApiResponse(200, summary).send(res);
});

exports.revenue = catchAsync(async (req, res) => {
  const data = await reportService.revenueReport(...reportRange(req.query));
  return new ApiResponse(200, data).send(res);
});

exports.productRevenue = catchAsync(async (req, res) => {
  const data = await reportService.productRevenueReport(...reportRange(req.query));
  return new ApiResponse(200, data).send(res);
});

exports.totalRevenue = catchAsync(async (req, res) => {
  const data = await reportService.totalRevenueReport(...reportRange(req.query));
  return new ApiResponse(200, data).send(res);
});

exports.inventoryOverview = catchAsync(async (req, res) => {
  const products = await productRepository.find({ isActive: true });
  const totalValue = products.reduce((sum, p) => sum + p.stock * p.cost, 0);
  const lowStock = products.filter((p) => p.stock <= p.lowStockThreshold);
  const openPOs = await purchaseOrderRepository.count({ status: { $in: ['draft', 'ordered'] } });
  return new ApiResponse(200, {
    totalProducts: products.length,
    totalStockValue: totalValue,
    lowStockCount: lowStock.length,
    lowStockProducts: lowStock,
    openPurchaseOrders: openPOs,
  }).send(res);
});
