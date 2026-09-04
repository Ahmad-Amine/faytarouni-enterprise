const { z } = require('zod');
const { ALL_PERMISSIONS } = require('../config/constants');

const httpsUrlOrEmpty = z.string().trim().refine((value) => {
  if (!value) return true;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}, 'Must be an HTTPS URL.');

const contactSchema = z.object({
  type: z.enum(['whatsapp', 'phone', 'email', 'instagram', 'facebook', 'tiktok', 'other']),
  label: z.string().trim().max(80).optional(),
  value: z.string().trim().min(1).max(500),
}).superRefine((contact, ctx) => {
  if (contact.type === 'email') {
    if (!z.string().email().safeParse(contact.value).success) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'Invalid email address.' });
    return;
  }
  if (contact.type === 'phone' || contact.type === 'whatsapp') {
    if (!/^\+?[0-9 ()-]{7,25}$/.test(contact.value)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'Invalid phone number.' });
    return;
  }
  try {
    const url = new URL(contact.value);
    if (url.protocol !== 'https:') throw new Error('bad scheme');
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'Social/contact links must use HTTPS.' });
  }
});

const roleSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required.'),
    description: z.string().optional(),
    permissions: z.array(z.enum(ALL_PERMISSIONS)).optional(),
  }),
});

const settingsTextSchema = z.object({
  body: z.object({
    key: z.string().trim().min(1),
    en: z.string().optional(),
    ar: z.string().optional(),
  }),
});

const settingsRulesSchema = z.object({
  body: z.object({
    businessName: z.string().optional(),
    logoUrl: httpsUrlOrEmpty.optional(),
    currency: z.string().optional(),
    timezone: z.string().optional(),
    loyaltyAppointmentThreshold: z.number().min(1).optional(),
    whatsappAdminNumber: z.string().optional(),
    primaryColor: z.string().optional(),
  }),
});

const settingsContactsSchema = z.object({
  body: z.object({
    contacts: z.array(contactSchema).max(20),
  }),
});

const emailTemplateSchema = z.object({
  body: z.object({
    key: z.string().trim().min(1),
    subject: z.string().trim().min(1),
    bodyHtml: z.string().trim().min(1),
    description: z.string().optional(),
  }),
});

const whatsappTemplateSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required.'),
    body: z.string().trim().min(1, 'Message body is required.'),
    description: z.string().optional(),
  }),
});

const businessHoursSchema = z.object({
  body: z.object({
    dayOfWeek: z.number().min(0).max(6),
    isOpen: z.boolean(),
    openTime: z.string(),
    closeTime: z.string(),
    slotIntervalMinutes: z.number().min(5).max(120).optional(),
    breaks: z.array(z.object({ start: z.string(), end: z.string() })).optional(),
    location: z.string().optional().nullable(),
  }),
});

const holidaySchema = z.object({
  body: z.object({
    date: z.string().min(1),
    reason: z.string().optional(),
    location: z.string().optional().nullable(),
  }),
});

module.exports = {
  roleSchema,
  settingsTextSchema,
  settingsRulesSchema,
  settingsContactsSchema,
  emailTemplateSchema,
  whatsappTemplateSchema,
  businessHoursSchema,
  holidaySchema,
};
