const BaseRepository = require('./BaseRepository');
const ProductSale = require('../models/ProductSale');

const PERIOD_FORMATS = { day: '%Y-%m-%d', month: '%Y-%m', year: '%Y' };

class ProductSaleRepository extends BaseRepository {
  constructor() {
    super(ProductSale);
  }

  async totalRevenue() {
    const result = await this.model.aggregate([{ $group: { _id: null, total: { $sum: '$total' } } }]);
    return result[0]?.total || 0;
  }

  recent(limit = 5) {
    return this.model.find({}).sort({ createdAt: -1 }).limit(limit).exec();
  }

  revenueByMonth(start) {
    return this.revenueByPeriod(start, 'month');
  }

  revenueByPeriod(start, period = 'month', end = null) {
    const createdAt = end ? { $gte: start, $lt: end } : { $gte: start };
    return this.model.aggregate([
      { $match: { createdAt } },
      {
        $group: {
          _id: { $dateToString: { format: PERIOD_FORMATS[period] || PERIOD_FORMATS.month, date: '$createdAt' } },
          total: { $sum: '$total' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }
}

module.exports = new ProductSaleRepository();
