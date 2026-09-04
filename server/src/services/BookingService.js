const {
  appointmentRepository,
  barberRepository,
  serviceRepository,
  businessHoursRepository,
  holidayRepository,
  couponRepository,
  taxRepository,
  userRepository,
  settingsRepository,
} = require('../repositories');
const ApiError = require('../utils/ApiError');
const { APPOINTMENT_STATUS, APPOINTMENT_SOURCE, COUPON_TYPE } = require('../config/constants');
const notificationService = require('./NotificationService');
const emailService = require('./EmailService');
const defaultTemplates = require('../emails/defaultTemplates');
const auditService = require('./AuditService');
const { withBookingMutex } = require('../utils/bookingMutex');

function normalizeDay(dateInput) {
  if (dateInput instanceof Date) {
    return new Date(Date.UTC(dateInput.getUTCFullYear(), dateInput.getUTCMonth(), dateInput.getUTCDate()));
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateInput));
  if (match) {
    const [, y, m, d] = match;
    return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  }
  const parsed = new Date(dateInput);
  return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
}

function isPastSlot(dateInput, startTime) {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(String(dateInput));
  const dateStr = match ? match[1] : todayStr;
  if (dateStr < todayStr) return true;
  if (dateStr > todayStr) return false;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return timeToMinutes(startTime) < nowMinutes;
}

function formatCalendarDate(date) {
  return date.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function phoneDigitsMatch(a, b) {
  const digitsA = String(a || '').replace(/\D/g, '');
  const digitsB = String(b || '').replace(/\D/g, '');
  if (digitsA.length < 7 || digitsB.length < 7) return digitsA === digitsB && digitsA.length > 0;
  return digitsA.slice(-7) === digitsB.slice(-7);
}

function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, '0');
  const m = String(mins % 60).padStart(2, '0');
  return `${h}:${m}`;
}

function isBarberOnHoliday(barber, day) {
  return (barber.holidays || []).some((h) => normalizeDay(h).getTime() === day.getTime());
}

async function assertWithinBusinessHours(date, startTime, endTime, locationId) {
  const holiday = await holidayRepository.findOne({ date, location: locationId || null });
  if (holiday) throw ApiError.badRequest('The shop is closed on this date.');

  const dayOfWeek = date.getUTCDay();
  const hours = await businessHoursRepository.findOne({ dayOfWeek, location: locationId || null });
  if (!hours || !hours.isOpen) throw ApiError.badRequest('The shop is closed on this day of the week.');

  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  if (startMin < timeToMinutes(hours.openTime) || endMin > timeToMinutes(hours.closeTime)) {
    throw ApiError.badRequest('Selected time is outside business hours.');
  }

  for (const brk of hours.breaks) {
    const brkStart = timeToMinutes(brk.start);
    const brkEnd = timeToMinutes(brk.end);
    if (startMin < brkEnd && endMin > brkStart) {
      throw ApiError.badRequest('Selected time overlaps a break period.');
    }
  }
}

async function computeTotals({ services, couponCode }) {
  const subtotal = services.reduce((sum, s) => sum + s.price, 0);

  let discount = 0;
  let couponDoc = null;
  if (couponCode) {
    couponDoc = await couponRepository.findOne({ code: String(couponCode).toUpperCase(), isActive: true });
    if (!couponDoc) throw ApiError.badRequest('Invalid or expired coupon code.');
    if (couponDoc.expiresAt && couponDoc.expiresAt < new Date()) throw ApiError.badRequest('Coupon has expired.');
    if (couponDoc.usageLimit !== null && couponDoc.usedCount >= couponDoc.usageLimit) {
      throw ApiError.badRequest('Coupon usage limit reached.');
    }
    if (subtotal < couponDoc.minSpend) {
      throw ApiError.badRequest(`Coupon requires a minimum spend of ${couponDoc.minSpend}.`);
    }
    discount = couponDoc.type === COUPON_TYPE.PERCENTAGE ? subtotal * (couponDoc.value / 100) : couponDoc.value;
    discount = Math.min(discount, subtotal);
  }

  const taxableAmount = subtotal - discount;
  const activeTaxes = await taxRepository.find({ isActive: true, appliesToServices: true });
  const taxRate = activeTaxes.reduce((sum, t) => sum + t.rate, 0);
  const tax = Number(((taxableAmount * taxRate) / 100).toFixed(2));

  const total = Number((taxableAmount + tax).toFixed(2));
  return { subtotal, discount, tax, total, couponDoc };
}

async function reserveCouponUse(couponDoc) {
  if (!couponDoc) return null;

  const filter = { _id: couponDoc._id, isActive: true };
  if (couponDoc.expiresAt) filter.expiresAt = { $gt: new Date() };
  if (couponDoc.usageLimit !== null) filter.usedCount = { $lt: couponDoc.usageLimit };

  const reserved = await couponRepository.model
    .findOneAndUpdate(filter, { $inc: { usedCount: 1 } }, { new: true })
    .exec();
  if (!reserved) throw ApiError.badRequest('Coupon usage limit reached or coupon is no longer available.');
  return reserved;
}

async function releaseCouponUse(couponId) {
  if (!couponId) return;
  await couponRepository.model.updateOne({ _id: couponId, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } }).exec();
}

async function createAppointment(input, actorUser = null) {
  const { barberId, serviceIds, date, startTime, customerName, customerPhone, couponCode, source, locationId, guestCode } =
    input;

  const barber = await barberRepository.findById(barberId);
  if (!barber || !barber.isActive) throw ApiError.notFound('Selected barber is not available.');

  const day = normalizeDay(date);
  const lockKey = `barber:${barberId}:day:${day.toISOString().slice(0, 10)}`;

  if (isBarberOnHoliday(barber, day)) {
    throw ApiError.badRequest('This barber is not available on the selected date.');
  }

  if (isPastSlot(date, startTime)) {
    throw ApiError.badRequest('That time has already passed.');
  }

  let resolvedUser = actorUser;
  if (!resolvedUser && guestCode) {
    const found = await userRepository.findByGuestCode(guestCode);
    const phoneMatches = found && phoneDigitsMatch(found.phone, customerPhone);
    if (!found || !phoneMatches) throw ApiError.badRequest('That booking code was not recognized.');
    if (!found.isActive) throw ApiError.forbidden('This account has been deactivated.');
    resolvedUser = found;
  }

  const services = await serviceRepository.find({ _id: { $in: serviceIds }, isActive: true });
  if (services.length !== serviceIds.length) throw ApiError.badRequest('One or more services are unavailable.');

  const totalDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0);
  const endTime = minutesToTime(timeToMinutes(startTime) + totalDuration);

  await assertWithinBusinessHours(day, startTime, endTime, locationId);
  const totals = await computeTotals({ services, couponCode });

  const appointment = await withBookingMutex(lockKey, async () => {
    const overlap = await appointmentRepository.findOverlapping(barberId, day, startTime, endTime);
    if (overlap) throw ApiError.conflict('This barber is already booked for part of that time.');

    let reservedCoupon = null;
    try {
      reservedCoupon = await reserveCouponUse(totals.couponDoc);
      return await appointmentRepository.create({
        customer: resolvedUser?._id || null,
        customerName,
        customerPhone,
        barber: barberId,
        location: locationId || null,
        date: day,
        startTime,
        endTime,
        services: services.map((s) => ({
          service: s._id,
          name: s.name,
          price: s.price,
          durationMinutes: s.durationMinutes,
        })),
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        total: totals.total,
        coupon: reservedCoupon?._id || null,
        source: source || APPOINTMENT_SOURCE.ONLINE,
        createdByAdmin: source !== APPOINTMENT_SOURCE.ONLINE ? actorUser?._id : null,
      });
    } catch (err) {
      if (reservedCoupon) await releaseCouponUse(reservedCoupon._id).catch(() => {});
      throw err;
    }
  });

  await notificationService.notifyAdmins(
    'new_appointment',
    `New appointment: ${customerName} booked ${barber.name} on ${formatCalendarDate(day)} at ${startTime}.`,
    `/admin/appointments?date=${day.toISOString().slice(0, 10)}`
  );

  const email = resolvedUser?.email;
  if (email) {
    emailService
      .sendTemplateEmail(
        email,
        'appointment_confirmation',
        {
          name: customerName,
          date: formatCalendarDate(day),
          startTime,
          barberName: barber.name,
          servicesList: services.map((s) => s.name).join(', '),
          total: totals.total.toFixed(2),
        },
        defaultTemplates.appointmentConfirmation
      )
      .catch(() => {});
  }

  return appointment;
}
async function changeStatus(appointmentId, status, actorUser, req, extra = {}) {
  const appointment = await appointmentRepository.findById(appointmentId, { populate: 'barber customer' });
  if (!appointment) throw ApiError.notFound('Appointment not found.');

  const previousStatus = appointment.status;
  appointment.status = status;
  if (extra.adminNote !== undefined) appointment.adminNote = extra.adminNote;
  if (extra.cancellationReason !== undefined) appointment.cancellationReason = extra.cancellationReason;
  if (extra.paymentMethod !== undefined) appointment.paymentMethod = extra.paymentMethod;
  if (status === APPOINTMENT_STATUS.COMPLETED) {
    appointment.isPaid = true;
    if (!appointment.paymentMethod || appointment.paymentMethod === 'unpaid') {
      appointment.paymentMethod = extra.paymentMethod || 'cash';
    }
  } else if ([APPOINTMENT_STATUS.CANCELED, APPOINTMENT_STATUS.REJECTED, APPOINTMENT_STATUS.NO_SHOW].includes(status)) {
    appointment.isPaid = false;
  }
  await appointment.save();

  await auditService.log(req, {
    actor: actorUser,
    action: 'appointment.status_changed',
    entityType: 'Appointment',
    entityId: appointment._id,
    changes: { from: previousStatus, to: status },
  });

  if (appointment.customer) {
    await notificationService.notifyCustomer(
      appointment.customer._id || appointment.customer,
      'appointment_status_changed',
      `Your appointment on ${formatCalendarDate(appointment.date)} is now ${status}.`,
      '/my-appointments'
    );
  }

  if (status === APPOINTMENT_STATUS.COMPLETED && previousStatus !== APPOINTMENT_STATUS.COMPLETED && appointment.customer) {
    const customerId = appointment.customer._id || appointment.customer;
    const updatedCustomer = await userRepository.updateById(customerId, { $inc: { appointmentsCount: 1 } });
    if (updatedCustomer) {
      const settings = await settingsRepository.findOne({ singleton: 'main' });
      const threshold = settings?.loyaltyAppointmentThreshold || 0;
      const newCount = updatedCustomer.appointmentsCount;
      if (threshold > 0 && newCount % threshold === 0 && updatedCustomer.lastLoyaltyAlertCount !== newCount) {
        await notificationService.notifyAdmins(
          'loyalty_gift',
          `${updatedCustomer.name} just completed ${newCount} appointments — consider sending them a loyalty gift!`,
          `/admin/customers/${customerId}`,
          customerId
        );
        await userRepository.updateById(customerId, { lastLoyaltyAlertCount: newCount });
      }
    }
  }

  return appointment;
}

async function setPaymentStatus(appointmentId, isPaid, actorUser, req, extra = {}) {
  const appointment = await appointmentRepository.findById(appointmentId, { populate: 'barber customer' });
  if (!appointment) throw ApiError.notFound('Appointment not found.');

  const previousIsPaid = appointment.isPaid;
  appointment.isPaid = isPaid;
  if (isPaid && extra.paymentMethod !== undefined) appointment.paymentMethod = extra.paymentMethod;
  if (isPaid && (!appointment.paymentMethod || appointment.paymentMethod === 'unpaid')) {
    appointment.paymentMethod = extra.paymentMethod || 'cash';
  }
  if (!isPaid) appointment.paymentMethod = 'unpaid';
  await appointment.save();

  await auditService.log(req, {
    actor: actorUser,
    action: 'appointment.payment_status_changed',
    entityType: 'Appointment',
    entityId: appointment._id,
    changes: { from: previousIsPaid, to: isPaid },
  });

  return appointment;
}

async function cancelAppointment(appointmentId, reason, actorUser, req) {
  return changeStatus(appointmentId, APPOINTMENT_STATUS.CANCELED, actorUser, req, { cancellationReason: reason });
}

async function rescheduleAppointment(appointmentId, { date, startTime }, actorUser, req) {
  const original = await appointmentRepository.findById(appointmentId);
  if (!original) throw ApiError.notFound('Appointment not found.');
  if (![APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED].includes(original.status)) {
    throw ApiError.badRequest('Only pending or confirmed appointments can be rescheduled.');
  }

  if (isPastSlot(date, startTime)) {
    throw ApiError.badRequest('That time has already passed.');
  }

  const day = normalizeDay(date);
  const totalDuration = timeToMinutes(original.endTime) - timeToMinutes(original.startTime);
  const endTime = minutesToTime(timeToMinutes(startTime) + totalDuration);
  await assertWithinBusinessHours(day, startTime, endTime, original.location);

  const oldDayKey = normalizeDay(original.date).toISOString().slice(0, 10);
  const newDayKey = day.toISOString().slice(0, 10);
  const barberId = String(original.barber);
  const keys = [...new Set([`barber:${barberId}:day:${oldDayKey}`, `barber:${barberId}:day:${newDayKey}`])].sort();

  const runWithLocks = async (index, fn) => {
    if (index >= keys.length) return fn();
    return withBookingMutex(keys[index], () => runWithLocks(index + 1, fn));
  };

  const previous = { date: original.date, startTime: original.startTime, endTime: original.endTime };
  const updated = await runWithLocks(0, async () => {
    const fresh = await appointmentRepository.findById(appointmentId);
    if (!fresh || ![APPOINTMENT_STATUS.PENDING, APPOINTMENT_STATUS.CONFIRMED].includes(fresh.status)) {
      throw ApiError.conflict('This appointment changed while it was being rescheduled. Please refresh and try again.');
    }

    const overlap = await appointmentRepository.findOverlapping(fresh.barber, day, startTime, endTime, {
      excludeId: fresh._id,
    });
    if (overlap) throw ApiError.conflict('This barber is already booked for part of that time.');

    fresh.date = day;
    fresh.startTime = startTime;
    fresh.endTime = endTime;
    await fresh.save();
    return fresh;
  });

  await auditService.log(req, {
    actor: actorUser,
    action: 'appointment.rescheduled',
    entityType: 'Appointment',
    entityId: updated._id,
    changes: { from: previous, to: { date: day, startTime, endTime } },
  });

  return updated;
}
module.exports = {
  createAppointment,
  changeStatus,
  setPaymentStatus,
  cancelAppointment,
  rescheduleAppointment,
  normalizeDay,
  timeToMinutes,
  minutesToTime,
  isBarberOnHoliday,
  isPastSlot,
  formatCalendarDate,
};
