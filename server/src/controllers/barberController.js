const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { barberRepository, appointmentRepository } = require('../repositories');

exports.listPublic = catchAsync(async (req, res) => {
  const barbers = await barberRepository.find({ isActive: true }, { sort: { order: 1 }, populate: 'services' });
  return new ApiResponse(200, barbers).send(res);
});

exports.getPublicProfile = catchAsync(async (req, res, next) => {
  const barber = await barberRepository.findOne({ _id: req.params.id, isActive: true }, { populate: 'services' });
  if (!barber) return next(ApiError.notFound('Barber not found.'));
  return new ApiResponse(200, barber).send(res);
});

exports.list = catchAsync(async (req, res) => {
  const { items, meta } = await barberRepository.paginate({}, req.query, {
    searchableFields: ['name'],
    populate: 'services',
  });
  return new ApiResponse(200, items, 'OK', meta).send(res);
});

exports.getByUser = catchAsync(async (req, res) => {
  const barber = await barberRepository.findOne({ user: req.params.userId }, { populate: 'services' });
  return new ApiResponse(200, barber || null).send(res);
});

exports.create = catchAsync(async (req, res) => {
  const barber = await barberRepository.create(req.body);
  return new ApiResponse(201, barber, 'Barber added.').send(res);
});

exports.update = catchAsync(async (req, res, next) => {
  const barber = await barberRepository.updateById(req.params.id, req.body);
  if (!barber) return next(ApiError.notFound('Barber not found.'));
  return new ApiResponse(200, barber, 'Barber updated.').send(res);
});

exports.remove = catchAsync(async (req, res, next) => {
  const now = new Date();
  const upcoming = await appointmentRepository.count({
    barber: req.params.id,
    status: { $in: ['pending', 'confirmed'] },
    date: { $gte: new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) },
  });
  if (upcoming > 0) return next(ApiError.badRequest('This barber has upcoming appointments. Deactivate instead.'));

  const barber = await barberRepository.deleteById(req.params.id);
  if (!barber) return next(ApiError.notFound('Barber not found.'));
  return new ApiResponse(200, null, 'Barber removed.').send(res);
});
