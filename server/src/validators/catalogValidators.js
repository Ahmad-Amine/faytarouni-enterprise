const { z } = require('zod');
const { objectId } = require('./common');

const httpsUrlOrEmpty = z.string().trim().refine((value) => {
  if (!value) return true;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}, 'Must be an HTTPS URL.');

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:MM.');

const barberBreak = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
    start: hhmm,
    end: hhmm,
  })
  .refine((b) => b.start < b.end, { message: 'Break end must be after its start.', path: ['end'] });

const categorySchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required.'),
    nameAr: z.string().trim().max(200).optional(),
    description: z.string().optional(),
    descriptionAr: z.string().max(5000).optional(),
    isActive: z.boolean().optional(),
    order: z.number().optional(),
  }),
});

const serviceSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required.'),
    nameAr: z.string().trim().max(200).optional(),
    category: objectId.optional().nullable(),
    description: z.string().optional(),
    descriptionAr: z.string().max(5000).optional(),
    imageUrl: httpsUrlOrEmpty.optional(),
    price: z.number().min(0, 'Price must be positive.'),
    durationMinutes: z.number().min(5, 'Duration must be at least 5 minutes.'),
    isVip: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
});

const barberSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required.'),
    user: objectId.optional().nullable(),
    photoUrl: httpsUrlOrEmpty.optional(),
    nameAr: z.string().trim().max(200).optional(),
    bio: z.string().optional(),
    bioAr: z.string().max(5000).optional(),
    specialties: z.array(z.string()).optional(),
    specialtiesAr: z.array(z.string()).optional(),
    breaks: z.array(barberBreak).max(30).optional(),
    services: z.array(objectId).optional(),
    location: objectId.optional().nullable(),
    isActive: z.boolean().optional(),
    order: z.number().optional(),
    holidays: z.array(z.string()).optional(),
  }),
});

module.exports = { categorySchema, serviceSchema, barberSchema };
