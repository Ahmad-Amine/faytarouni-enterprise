const BaseRepository = require('./BaseRepository');
const ProductSale = require('../models/ProductSale');

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
    return this.model.aggregate([
      { $match: { createdAt: { $gte: start } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          total: { $sum: '$total' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }
}

module.exports = new ProductSaleRepository();
