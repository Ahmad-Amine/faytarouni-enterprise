const { z } = require('zod');
const { isSupportedE164 } = require('../utils/phone');
const { objectId } = require('./common');

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const createAppointmentSchema = z.object({
  body: z.object({
    barberId: objectId,
    serviceIds: z.array(objectId).min(1, 'At least one service must be selected.'),
    date: z.string().min(1, 'Date is required.'),
    startTime: z.string().regex(timeRegex, 'A valid time is required.'),
    customerName: z.string().trim().min(1, 'Name is required.'),
    customerPhone: z.string().trim().refine(isSupportedE164, 'Phone number must include a supported country code.'),
    couponCode: z.string().optional(),
    locationId: objectId.optional(),
  }),
});

const walkInSchema = createAppointmentSchema;

const rescheduleSchema = z.object({
  body: z.object({
    date: z.string().min(1),
    startTime: z.string().regex(timeRegex, 'A valid time is required.'),
  }),
  params: z.object({ id: objectId }),
});

const cancelSchema = z.object({
  body: z.object({ reason: z.string().optional() }),
  params: z.object({ id: objectId }),
});

const statusChangeSchema = z.object({
  body: z.object({
    status: z.enum(['pending', 'confirmed', 'rejected', 'canceled', 'completed', 'no_show']),
    adminNote: z.string().optional(),
    paymentMethod: z.enum(['cash', 'card', 'unpaid']).optional(),
  }),
  params: z.object({ id: objectId }),
});

const paymentStatusSchema = z.object({
  body: z.object({
    isPaid: z.boolean(),
    paymentMethod: z.enum(['cash', 'card', 'unpaid']).optional(),
  }),
  params: z.object({ id: objectId }),
});

const reviewSchema = z.object({
  body: z.object({
    appointmentId: objectId,
    rating: z.number().min(1).max(5),
    comment: z.string().max(1000).optional(),
  }),
});

module.exports = {
  createAppointmentSchema,
  walkInSchema,
  rescheduleSchema,
  cancelSchema,
  statusChangeSchema,
  paymentStatusSchema,
  reviewSchema,
};
