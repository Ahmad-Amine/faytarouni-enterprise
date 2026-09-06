const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { notificationRepository } = require('../repositories');

exports.listForAdmin = catchAsync(async (req, res) => {
  const filter = { audience: 'admin' };
  if (req.query.unreadOnly === 'true') filter.isRead = false;
  const { items, meta } = await notificationRepository.paginate(filter, req.query, {
    defaultSort: '-createdAt',
    populate: { path: 'user', select: 'name phone' },
  });
  const unreadCount = await notificationRepository.count({ audience: 'admin', isRead: false });
  return new ApiResponse(200, items, 'OK', { ...meta, unreadCount }).send(res);
});

exports.listForCustomer = catchAsync(async (req, res) => {
  const filter = { audience: 'customer', user: req.user._id };
  const { items, meta } = await notificationRepository.paginate(filter, req.query, { defaultSort: '-createdAt' });
  const unreadCount = await notificationRepository.count({ ...filter, isRead: false });
  return new ApiResponse(200, items, 'OK', { ...meta, unreadCount }).send(res);
});

exports.markRead = catchAsync(async (req, res, next) => {
  const filter = { _id: req.params.id };
  if (req.user.role.name === 'customer') {
    filter.audience = 'customer';
    filter.user = req.user._id;
  }
  const notification = await require('../models/System').Notification.findOneAndUpdate(filter, { isRead: true });
  if (!notification) return next(ApiError.notFound('Notification not found.'));
  return new ApiResponse(200, null).send(res);
});

exports.markAllRead = catchAsync(async (req, res) => {
  const filter = req.user.role.name === 'customer' ? { audience: 'customer', user: req.user._id } : { audience: 'admin' };
  await require('../models/System').Notification.updateMany({ ...filter, isRead: false }, { isRead: true });
  return new ApiResponse(200, null).send(res);
});
