const BaseRepository = require('./BaseRepository');
const Appointment = require('../models/Appointment');
const { APPOINTMENT_STATUS } = require('../config/constants');

const ACTIVE_STATUSES = [APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED];

class AppointmentRepository extends BaseRepository {
  constructor() {
    super(Appointment);
  }

  async findOverlapping(barberId, date, startTime, endTime, { excludeId } = {}) {
    const filter = {
      barber: barberId,
      date,
      status: { $in: ACTIVE_STATUSES },
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    };
    if (excludeId) filter._id = { $ne: excludeId };
    return this.model.findOne(filter).exec();
  }

  findForBarberDay(barberId, date) {
    return this.model
      .find({ barber: barberId, date, status: { $in: ACTIVE_STATUSES } })
      .select('startTime endTime')
      .exec();
  }

  findForDay(date, filter = {}) {
    return this.model
      .find({ date, ...filter })
      .populate('barber', 'name photoUrl')
      .populate('customer', 'name email phone')
      .sort({ startTime: 1 })
      .exec();
  }

  findForCustomer(customerId) {
    return this.model
      .find({ customer: customerId })
      .populate('barber', 'name photoUrl')
      .sort({ date: -1, startTime: -1 })
      .exec();
  }

  countForCustomerInStatuses(customerId, statuses) {
    return this.model.countDocuments({ customer: customerId, status: { $in: statuses } });
  }

  async monthOverview(start, end, extraFilter = {}) {
    return this.model.aggregate([
      { $match: { date: { $gte: start, $lt: end }, ...extraFilter } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          count: { $sum: 1 },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  statusBreakdown() {
    return this.model.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' } } }]);
  }

  async totalRevenue() {
    const result = await this.model.aggregate([
      { $match: { isPaid: true } },
      { $group: { _id: null, total: { $sum: '$total' } } },
    ]);
    return result[0]?.total || 0;
  }

  revenueByMonth(start) {
    return this.model.aggregate([
      { $match: { isPaid: true, date: { $gte: start } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          total: { $sum: '$total' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  popularServices(limit = 5) {
    return this.model.aggregate([
      { $match: { status: APPOINTMENT_STATUS.COMPLETED } },
      { $unwind: '$services' },
      {
        $group: {
          _id: '$services.name',
          bookings: { $sum: 1 },
          revenue: { $sum: '$services.price' },
        },
      },
      { $sort: { bookings: -1 } },
      { $limit: limit },
    ]);
  }

  barberPerformance() {
    return this.model.aggregate([
      { $match: { status: APPOINTMENT_STATUS.COMPLETED } },
      {
        $group: {
          _id: '$barber',
          completed: { $sum: 1 },
          revenue: { $sum: '$total' },
        },
      },
      { $sort: { revenue: -1 } },
      {
        $lookup: { from: 'barbers', localField: '_id', foreignField: '_id', as: 'barber' },
      },
      { $unwind: '$barber' },
      { $project: { name: '$barber.name', photoUrl: '$barber.photoUrl', completed: 1, revenue: 1 } },
    ]);
  }

  async customerRetention() {
    const result = await this.model.aggregate([
      { $match: { status: APPOINTMENT_STATUS.COMPLETED, customer: { $ne: null } } },
      { $group: { _id: '$customer', visits: { $sum: 1 } } },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          returning: { $sum: { $cond: [{ $gt: ['$visits', 1] }, 1, 0] } },
        },
      },
    ]);
    const row = result[0] || { totalCustomers: 0, returning: 0 };
    return {
      totalCustomers: row.totalCustomers,
      returning: row.returning,
      retentionRate: row.totalCustomers ? Math.round((row.returning / row.totalCustomers) * 100) : 0,
    };
  }
}

module.exports = new AppointmentRepository();
