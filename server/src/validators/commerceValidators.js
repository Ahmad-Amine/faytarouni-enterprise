const { z } = require('zod');

const couponSchema = z.object({
  body: z.object({
    code: z.string().trim().min(1, 'Code is required.'),
    type: z.enum(['percentage', 'fixed']),
    value: z.number().min(0),
    minSpend: z.number().min(0).optional(),
    usageLimit: z.number().min(1).optional().nullable(),
    expiresAt: z.string().optional().nullable(),
    isActive: z.boolean().optional(),
  }),
});

const taxSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required.'),
    rate: z.number().min(0).max(100),
    isActive: z.boolean().optional(),
    appliesToProducts: z.boolean().optional(),
    appliesToServices: z.boolean().optional(),
  }),
});

const locationSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required.'),
    address: z.string().optional(),
    phone: z.string().optional(),
    timezone: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

module.exports = { couponSchema, taxSchema, locationSchema };
