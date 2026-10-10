const { z } = require('zod');
const { isSupportedE164 } = require('../utils/phone');

const httpsUrlOrEmpty = z.string().trim().refine((value) => {
  if (!value) return true;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}, 'Must be an HTTPS URL.');

const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Name is required.').max(80),
    email: z.string().email('A valid email is required.'),
    phone: z.string().trim().refine(isSupportedE164, 'Phone number must include a supported country code.'),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    birthday: z.string().optional().nullable(),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('A valid email is required.'),
    password: z.string().min(1, 'Password is required.'),
  }),
});

const forgotPasswordSchema = z.object({
  body: z.object({ email: z.string().email('A valid email is required.') }),
});

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required.'),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
  }),
});

const verifyEmailSchema = z.object({
  body: z.object({ token: z.string().min(1, 'Verification token is required.') }),
});

const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(80).optional(),
    phone: z.string().trim().refine(isSupportedE164, 'Phone number must include a supported country code.').optional(),
    birthday: z.string().optional().nullable(),
    avatarUrl: httpsUrlOrEmpty.optional(),
  }),
});

const updatePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, 'New password must be at least 8 characters.'),
  }),
});

const customerApprovalSchema = z.object({
  body: z.object({
    status: z.enum(['pending', 'approved', 'rejected']),
  }),
});

module.exports = {
  customerApprovalSchema,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  updateProfileSchema,
  updatePasswordSchema,
};
