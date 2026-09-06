const mongoose = require('mongoose');
const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const bookingService = require('../services/BookingService');
const { appointmentRepository, barberRepository, businessHoursRepository, holidayRepository } = require('../repositories');
const { APPOINTMENT_SOURCE } = require('../config/constants');

const NOBODY_ID = new mongoose.Types.ObjectId();

async function resolveOwnBarberId(user) {
  if (user.role?.name !== 'barber') return null;
  const barber = await barberRepository.findOne({ user: user._id });
  return barber ? String(barber._id) : undefined;
}

exports.create = catchAsync(async (req, res) => {
  const appointment = await bookingService.createAppointment(
    { ...req.body, customerId: req.user?._id },
    req.user
  );
  return new ApiResponse(201, appointment, 'Appointment booked.').send(res);
});

exports.createWalkIn = catchAsync(async (req, res) => {
  const appointment = await bookingService.createAppointment(
    { ...req.body, source: APPOINTMENT_SOURCE.WALK_IN },
    req.user
  );
  return new ApiResponse(201, appointment, 'Walk-in booked.').send(res);
});

exports.myAppointments = catchAsync(async (req, res) => {
  const appointments = await appointmentRepository.findForCustomer(req.user._id);
  return new ApiResponse(200, appointments).send(res);
});

exports.cancel = catchAsync(async (req, res, next) => {
  const appointment = await appointmentRepository.findById(req.params.id);
  if (!appointment) return next(ApiError.notFound('Appointment not found.'));
  if (req.user.role.name === 'customer' && String(appointment.customer) !== String(req.user._id)) {
    return next(ApiError.forbidden());
  }
  const updated = await bookingService.cancelAppointment(req.params.id, req.body.reason, req.user, req);
  return new ApiResponse(200, updated, 'Appointment canceled.').send(res);
});

exports.reschedule = catchAsync(async (req, res, next) => {
  const appointment = await appointmentRepository.findById(req.params.id);
  if (!appointment) return next(ApiError.notFound('Appointment not found.'));
  if (req.user.role.name === 'customer' && String(appointment.customer) !== String(req.user._id)) {
    return next(ApiError.forbidden());
  }
  const updated = await bookingService.rescheduleAppointment(req.params.id, req.body, req.user, req);
  return new ApiResponse(200, updated, 'Appointment rescheduled.').send(res);
});

exports.changeStatus = catchAsync(async (req, res, next) => {
  const ownBarberId = await resolveOwnBarberId(req.user);
  if (ownBarberId !== null) {
    const appointment = await appointmentRepository.findById(req.params.id);
    if (!appointment) return next(ApiError.notFound('Appointment not found.'));
    if (!ownBarberId || String(appointment.barber) !== ownBarberId) return next(ApiError.forbidden());
  }
  const { status, adminNote, paymentMethod } = req.body;
  const updated = await bookingService.changeStatus(req.params.id, status, req.user, req, { adminNote, paymentMethod });
  return new ApiResponse(200, updated, `Appointment marked ${status}.`).send(res);
});

exports.setPaymentStatus = catchAsync(async (req, res, next) => {
  const ownBarberId = await resolveOwnBarberId(req.user);
  if (ownBarberId !== null) {
    const appointment = await appointmentRepository.findById(req.params.id);
    if (!appointment) return next(ApiError.notFound('Appointment not found.'));
    if (!ownBarberId || String(appointment.barber) !== ownBarberId) return next(ApiError.forbidden());
  }
  const { isPaid, paymentMethod } = req.body;
  const updated = await bookingService.setPaymentStatus(req.params.id, isPaid, req.user, req, { paymentMethod });
  return new ApiResponse(200, updated, `Appointment marked ${isPaid ? 'paid' : 'unpaid'}.`).send(res);
});

exports.adminList = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.date) filter.date = bookingService.normalizeDay(req.query.date);
  if (req.query.status) filter.status = req.query.status;
  filter.barber = req.query.barberId;

  const ownBarberId = await resolveOwnBarberId(req.user);
  if (ownBarberId !== null)
    filter.barber = ownBarberId || NOBODY_ID;
  if (!filter.barber) delete filter.barber;

  const { items, meta } = await appointmentRepository.paginate(filter, req.query, {
    populate: [
      { path: 'barber', select: 'name photoUrl' },
      { path: 'customer', select: 'name email phone' },
    ],
    defaultSort: 'startTime',
    searchableFields: ['customerName', 'customerPhone'],
  });
  return new ApiResponse(200, items, 'OK', meta).send(res);
});

exports.calendarOverview = catchAsync(async (req, res, next) => {
  const { month } = req.query;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return next(ApiError.badRequest('month is required as YYYY-MM.'));
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);

  const ownBarberId = await resolveOwnBarberId(req.user);
  const extraFilter = ownBarberId !== null ? { barber: new mongoose.Types.ObjectId(ownBarberId || NOBODY_ID) } : {};

  const days = await appointmentRepository.monthOverview(start, end, extraFilter);
  return new ApiResponse(200, days).send(res);
});

exports.monthAvailabilityOverview = catchAsync(async (req, res, next) => {
  const { month } = req.query;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return next(ApiError.badRequest('month is required as YYYY-MM.'));

  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);

  const holidays = await holidayRepository.find({ date: { $gte: start, $lt: end } });
  const holidayDates = new Set(holidays.map((h) => h.date.toISOString().slice(0, 10)));
  const openDays = await businessHoursRepository.find({ isOpen: true });
  const openWeekdays = new Set(openDays.map((d) => d.dayOfWeek));

  const days = [];
  const cursor = new Date(start);
  while (cursor < end) {
    const iso = cursor.toISOString().slice(0, 10);
    if (openWeekdays.has(cursor.getUTCDay()) && !holidayDates.has(iso)) days.push(iso);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return new ApiResponse(200, { days }).send(res);
});

function overlapsAny(appointments, startMins, endMins) {
  return appointments.some((a) => {
    const aStart = bookingService.timeToMinutes(a.startTime);
    const aEnd = bookingService.timeToMinutes(a.endTime);
    return startMins < aEnd && aStart < endMins;
  });
}

exports.daySlots = catchAsync(async (req, res, next) => {
  const day = bookingService.normalizeDay(req.params.date);
  if (Number.isNaN(day.getTime())) return next(ApiError.badRequest('Invalid date.'));

  const holiday = await holidayRepository.findOne({ date: day });
  if (holiday) return new ApiResponse(200, { date: req.params.date, slots: [] }).send(res);

  const hours = await businessHoursRepository.findOne({ dayOfWeek: day.getUTCDay() });
  if (!hours || !hours.isOpen) return new ApiResponse(200, { date: req.params.date, slots: [] }).send(res);

  const duration = Number(req.query.duration) > 0 ? Number(req.query.duration) : hours.slotIntervalMinutes || 30;

  const allBarbers = await barberRepository.find({ isActive: true });
  const workingBarbers = allBarbers.filter((b) => !bookingService.isBarberOnHoliday(b, day));

  const busyByBarber = new Map();
  await Promise.all(
    workingBarbers.map(async (b) => {
      const appts = await appointmentRepository.findForBarberDay(b._id, day);
      busyByBarber.set(b._id.toString(), appts);
    })
  );

  const isBarberFreeFor = (barberId, startMins, endMins) =>
    !overlapsAny(busyByBarber.get(barberId.toString()) || [], startMins, endMins);

  const slots = [];
  let cursor = bookingService.timeToMinutes(hours.openTime);
  const close = bookingService.timeToMinutes(hours.closeTime);

  while (cursor < close) {
    const time = bookingService.minutesToTime(cursor);
    const slotEnd = cursor + duration;
    const fitsBeforeClose = slotEnd <= close;
    const inBreak = hours.breaks.some(
      (b) => cursor < bookingService.timeToMinutes(b.end) && bookingService.timeToMinutes(b.start) < slotEnd
    );
    if (fitsBeforeClose && !inBreak && !bookingService.isPastSlot(req.params.date, time)) {
      const freeBarbers = workingBarbers.filter((b) => isBarberFreeFor(b._id, cursor, slotEnd));
      slots.push({ time, isFullyBooked: workingBarbers.length > 0 && freeBarbers.length === 0 });
    }
    cursor += hours.slotIntervalMinutes || 30;
  }

  return new ApiResponse(200, { date: req.params.date, slots }).send(res);
});

exports.availableBarbers = catchAsync(async (req, res, next) => {
  const day = bookingService.normalizeDay(req.params.date);
  const { time } = req.params;
  if (Number.isNaN(day.getTime())) return next(ApiError.badRequest('Invalid date.'));

  const hours = await businessHoursRepository.findOne({ dayOfWeek: day.getUTCDay() });
  const duration = Number(req.query.duration) > 0 ? Number(req.query.duration) : hours?.slotIntervalMinutes || 30;

  const allBarbers = await barberRepository.find({ isActive: true }, { sort: { order: 1 } });
  const timeMins = bookingService.timeToMinutes(time);
  const endMins = timeMins + duration;

  const barbers = await Promise.all(
    allBarbers.map(async (b) => {
      const onHoliday = bookingService.isBarberOnHoliday(b, day);
      let isBooked = false;
      if (!onHoliday) {
        const appts = await appointmentRepository.findForBarberDay(b._id, day);
        isBooked = overlapsAny(appts, timeMins, endMins);
      }
      return {
        _id: b._id,
        name: b.name,
        photoUrl: b.photoUrl,
        bio: b.bio,
        isBooked,
        isOnHoliday: onHoliday,
      };
    })
  );

  return new ApiResponse(200, barbers).send(res);
});

exports.stats = catchAsync(async (req, res) => {
  const breakdown = await appointmentRepository.statusBreakdown();
  return new ApiResponse(200, breakdown).send(res);
});
