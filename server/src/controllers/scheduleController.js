const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { businessHoursRepository, holidayRepository } = require('../repositories');

exports.listBusinessHours = catchAsync(async (req, res) => {
  const hours = await businessHoursRepository.find(
    { location: req.query.locationId || null },
    { sort: { dayOfWeek: 1 } }
  );
  return new ApiResponse(200, hours).send(res);
});

exports.upsertBusinessHours = catchAsync(async (req, res) => {
  const { dayOfWeek } = req.body;
  const locationId = req.body.location || null;
  const doc = await require('../models/Schedule').BusinessHours.findOneAndUpdate(
    { dayOfWeek, location: locationId },
    { ...req.body, location: locationId },
    { new: true, upsert: true, runValidators: true }
  );
  return new ApiResponse(200, doc, 'Business hours updated.').send(res);
});

exports.listHolidays = catchAsync(async (req, res) => {
  const filter = { location: req.query.locationId || null };
  if (req.query.from) filter.date = { $gte: new Date(req.query.from) };
  const holidays = await holidayRepository.find(filter, { sort: { date: 1 } });
  return new ApiResponse(200, holidays).send(res);
});

exports.createHoliday = catchAsync(async (req, res) => {
  const holiday = await holidayRepository.create({
    ...req.body,
    date: new Date(req.body.date),
    location: req.body.location || null,
  });
  return new ApiResponse(201, holiday, 'Holiday added.').send(res);
});

exports.removeHoliday = catchAsync(async (req, res, next) => {
  const holiday = await holidayRepository.deleteById(req.params.id);
  if (!holiday) return next(ApiError.notFound('Holiday not found.'));
  return new ApiResponse(200, null, 'Holiday removed.').send(res);
});
