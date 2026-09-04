const { appointmentRepository, productRepository, userRepository, productSaleRepository } = require('../repositories');
const inventoryService = require('./InventoryService');

async function dashboardSummary() {
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

  const monthStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));

  const [todayAppointments, monthRevenue, statusBreakdown, popularServices, barberPerformance, retention, lowStock] =
    await Promise.all([
      appointmentRepository.findForDay(today),
      appointmentRepository.revenueByMonth(monthStart),
      appointmentRepository.statusBreakdown(),
      appointmentRepository.popularServices(5),
      appointmentRepository.barberPerformance(),
      appointmentRepository.customerRetention(),
      inventoryService.getLowStockProducts(),
    ]);

  const totalCustomers = await userRepository.count({});
  const totalProducts = await productRepository.count({ isActive: true });

  const [totalServicesRevenue, totalProductsRevenue, recentProductSales] = await Promise.all([
    appointmentRepository.totalRevenue(),
    productSaleRepository.totalRevenue(),
    productSaleRepository.recent(5),
  ]);

  return {
    todayAppointments,
    todayAppointmentsCount: todayAppointments.length,
    monthRevenue,
    statusBreakdown,
    popularServices,
    barberPerformance,
    retention,
    lowStockProducts: lowStock,
    totalCustomers,
    totalProducts,
    totalServicesRevenue,
    totalProductsRevenue,
    grandTotal: Number((totalServicesRevenue + totalProductsRevenue).toFixed(2)),
    recentProductSales,
  };
}

function monthsAgoStart(months) {
  const start = new Date();
  start.setMonth(start.getMonth() - (months - 1));
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
}

async function revenueReport(months = 6) {
  return appointmentRepository.revenueByMonth(monthsAgoStart(months));
}

async function productRevenueReport(months = 6) {
  return productSaleRepository.revenueByMonth(monthsAgoStart(months));
}

async function totalRevenueReport(months = 6) {
  const start = monthsAgoStart(months);
  const [services, products] = await Promise.all([
    appointmentRepository.revenueByMonth(start),
    productSaleRepository.revenueByMonth(start),
  ]);

  const byMonth = new Map();
  for (const row of [...services, ...products]) {
    byMonth.set(row._id, (byMonth.get(row._id) || 0) + row.total);
  }

  return [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([_id, total]) => ({ _id, total: Number(total.toFixed(2)) }));
}

module.exports = { dashboardSummary, revenueReport, productRevenueReport, totalRevenueReport };
