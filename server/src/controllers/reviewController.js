const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { reviewRepository, appointmentRepository, barberRepository } = require('../repositories');

async function refreshBarberRatingSnapshot(barberId) {
  const published = await reviewRepository.find({ barber: barberId, isPublished: true });
  const ratingCount = published.length;
  const averageRating = ratingCount ? Number((published.reduce((sum, r) => sum + r.rating, 0) / ratingCount).toFixed(2)) : 0;
  await barberRepository.updateById(barberId, { 'stats.averageRating': averageRating, 'stats.ratingCount': ratingCount });
}

exports.create = catchAsync(async (req, res, next) => {
  const { appointmentId, rating, comment } = req.body;
  const appointment = await appointmentRepository.findById(appointmentId);
  if (!appointment) return next(ApiError.notFound('Appointment not found.'));
  if (String(appointment.customer) !== String(req.user._id)) return next(ApiError.forbidden());
  if (appointment.status !== 'completed') {
    return next(ApiError.badRequest('You can only review a completed appointment.'));
  }

  const existing = await reviewRepository.findOne({ appointment: appointmentId });
  if (existing) return next(ApiError.conflict('You already reviewed this appointment.'));

  const review = await reviewRepository.create({
    customer: req.user._id,
    barber: appointment.barber,
    appointment: appointmentId,
    rating,
    comment,
  });

  await refreshBarberRatingSnapshot(appointment.barber);

  return new ApiResponse(201, review, 'Thanks for your review!').send(res);
});

exports.listForBarber = catchAsync(async (req, res) => {
  const { items, meta } = await reviewRepository.paginate(
    { barber: req.params.barberId, isPublished: true },
    req.query,
    { populate: { path: 'customer', select: 'name' }, defaultSort: '-createdAt' }
  );
  return new ApiResponse(200, items, 'OK', meta).send(res);
});

exports.adminList = catchAsync(async (req, res) => {
  const { items, meta } = await reviewRepository.paginate({}, req.query, {
    populate: [
      { path: 'customer', select: 'name email' },
      { path: 'barber', select: 'name' },
      { path: 'appointment', select: 'date startTime services' },
    ],
    defaultSort: '-createdAt',
  });
  return new ApiResponse(200, items, 'OK', meta).send(res);
});

exports.setPublished = catchAsync(async (req, res, next) => {
  const review = await reviewRepository.updateById(req.params.id, { isPublished: !!req.body.isPublished });
  if (!review) return next(ApiError.notFound('Review not found.'));
  await refreshBarberRatingSnapshot(review.barber);
  return new ApiResponse(200, review).send(res);
});
