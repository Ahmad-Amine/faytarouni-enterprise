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

const PERIODS = ['day', 'month', 'year'];
// How many buckets each period shows by default, and the cap on ?count=.
const PERIOD_DEFAULTS = { day: 30, month: 12, year: 5 };
const PERIOD_MAX = { day: 366, month: 60, year: 20 };

function normalizePeriod(period) {
  return PERIODS.includes(period) ? period : 'month';
}

function normalizeCount(period, count) {
  const n = Number(count);
  if (!Number.isFinite(n) || n < 1) return PERIOD_DEFAULTS[period];
  return Math.min(Math.floor(n), PERIOD_MAX[period]);
}

// Start of the oldest bucket, in UTC so it lines up with the UTC grouping
// done in the repositories.
function periodStart(period, count) {
  const now = new Date();
  if (period === 'day') {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (count - 1)));
  }
  if (period === 'year') return new Date(Date.UTC(now.getUTCFullYear() - (count - 1), 0, 1));
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1), 1));
}

function bucketKey(date, period) {
  const iso = date.toISOString();
  if (period === 'day') return iso.slice(0, 10);
  if (period === 'year') return iso.slice(0, 4);
  return iso.slice(0, 7);
}

// Returns every bucket in the range (including empty ones as 0) so charts
// show gaps instead of silently skipping days/months with no revenue.
function fillBuckets(rows, period, count) {
  const byKey = new Map(rows.map((r) => [r._id, r]));
  const start = periodStart(period, count);
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(start);
    if (period === 'day') d.setUTCDate(d.getUTCDate() + i);
    else if (period === 'year') d.setUTCFullYear(d.getUTCFullYear() + i);
    else d.setUTCMonth(d.getUTCMonth() + i);
    const key = bucketKey(d, period);
    const row = byKey.get(key);
    out.push({ _id: key, total: Number((row?.total || 0).toFixed(2)), count: row?.count || 0 });
  }
  return out;
}

// Backwards compatible: callers that still pass a number of months get the
// monthly report they always got.
function resolveRange(periodOrMonths, count) {
  if (typeof periodOrMonths === 'number') return { period: 'month', count: normalizeCount('month', periodOrMonths) };
  const period = normalizePeriod(periodOrMonths);
  return { period, count: normalizeCount(period, count) };
}

async function revenueReport(periodOrMonths = 'month', count) {
  const { period, count: n } = resolveRange(periodOrMonths, count);
  const rows = await appointmentRepository.revenueByPeriod(periodStart(period, n), period);
  return fillBuckets(rows, period, n);
}

async function productRevenueReport(periodOrMonths = 'month', count) {
  const { period, count: n } = resolveRange(periodOrMonths, count);
  const rows = await productSaleRepository.revenueByPeriod(periodStart(period, n), period);
  return fillBuckets(rows, period, n);
}

async function totalRevenueReport(periodOrMonths = 'month', count) {
  const { period, count: n } = resolveRange(periodOrMonths, count);
  const start = periodStart(period, n);
  const [services, products] = await Promise.all([
    appointmentRepository.revenueByPeriod(start, period),
    productSaleRepository.revenueByPeriod(start, period),
  ]);

  const byBucket = new Map();
  for (const row of [...services, ...products]) {
    const current = byBucket.get(row._id) || { _id: row._id, total: 0, count: 0 };
    current.total += row.total;
    current.count += row.count || 0;
    byBucket.set(row._id, current);
  }

  return fillBuckets([...byBucket.values()], period, n);
}

async function sumRevenue(start, end) {
  const [services, products] = await Promise.all([
    appointmentRepository.revenueByPeriod(start, 'year', end),
    productSaleRepository.revenueByPeriod(start, 'year', end),
  ]);
  const sum = (rows) => rows.reduce((acc, r) => acc + r.total, 0);
  const servicesTotal = Number(sum(services).toFixed(2));
  const productsTotal = Number(sum(products).toFixed(2));
  return { services: servicesTotal, products: productsTotal, total: Number((servicesTotal + productsTotal).toFixed(2)) };
}

// Revenue for today, this month, and this year (UTC calendar boundaries).
async function revenueSummary() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const [today, month, year] = await Promise.all([
    sumRevenue(new Date(Date.UTC(y, m, d)), new Date(Date.UTC(y, m, d + 1))),
    sumRevenue(new Date(Date.UTC(y, m, 1)), new Date(Date.UTC(y, m + 1, 1))),
    sumRevenue(new Date(Date.UTC(y, 0, 1)), new Date(Date.UTC(y + 1, 0, 1))),
  ]);
  return { today, month, year };
}

module.exports = {
  dashboardSummary,
  revenueReport,
  productRevenueReport,
  totalRevenueReport,
  revenueSummary,
};
