const { z } = require('zod');
const { objectId } = require('./common');

const httpsUrlOrEmpty = z.string().trim().refine((value) => {
  if (!value) return true;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}, 'Must be an HTTPS URL.');

const categorySchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required.'),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
    order: z.number().optional(),
  }),
});

const serviceSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required.'),
    category: objectId.optional().nullable(),
    description: z.string().optional(),
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
    bio: z.string().optional(),
    specialties: z.array(z.string()).optional(),
    services: z.array(objectId).optional(),
    location: objectId.optional().nullable(),
    isActive: z.boolean().optional(),
    order: z.number().optional(),
    holidays: z.array(z.string()).optional(),
  }),
});

module.exports = { categorySchema, serviceSchema, barberSchema };
