const { userRepository, roleRepository } = require('../repositories');
const RefreshToken = require('../models/RefreshToken');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require('../utils/tokens');
const { generateToken, hashToken } = require('../utils/crypto');
const { generateUniqueGuestCode } = require('../utils/guestCode');
const emailService = require('./EmailService');
const defaultTemplates = require('../emails/defaultTemplates');
const { settingsRepository } = require('../repositories');
const auditService = require('./AuditService');
const { durationToMs } = require('../utils/duration');

function accessPayload(user) {
  return { sub: user._id.toString(), role: user.role.name, permissions: user.role.permissions };
}

async function issueSession(user, req) {
  const accessToken = signAccessToken(accessPayload(user));
  const refreshToken = signRefreshToken({ sub: user._id.toString() });

  await RefreshToken.create({
    user: user._id,
    tokenHash: hashToken(refreshToken),
    userAgent: req.headers['user-agent'] || '',
    ip: req.ip,
    expiresAt: new Date(Date.now() + durationToMs(env.jwt.refreshExpiresIn, 30 * 24 * 60 * 60 * 1000)),
  });

  return { accessToken, refreshToken };
}

async function register(payload, req) {
  const existing = await userRepository.findByEmail(payload.email);
  if (existing) throw ApiError.conflict('An account with this email already exists.');

  const customerRole = await roleRepository.findOne({ name: 'customer' });
  if (!customerRole) throw ApiError.internal('Customer role is not seeded. Run the seed script.');

  const guestBookingCode = await generateUniqueGuestCode();
  const user = await userRepository.create({ ...payload, role: customerRole._id, guestBookingCode });
  await user.populate('role');

  await sendVerificationEmail(user);

  const tokens = await issueSession(user, req);
  await auditService.log(req, { actor: user, action: 'auth.register', entityType: 'User', entityId: user._id });
  return { user, ...tokens };
}

async function login(email, password, req) {
  const user = await userRepository.findByEmail(email, { withPassword: true });
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Incorrect email or password.');
  }
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated.');

  const tokens = await issueSession(user, req);
  await auditService.log(req, { actor: user, action: 'auth.login', entityType: 'User', entityId: user._id });
  return { user, ...tokens };
}

async function refresh(rawToken, req) {
  if (!rawToken) throw ApiError.unauthorized('No refresh token provided.');

  let decoded;
  try {
    decoded = verifyRefreshToken(rawToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token.');
  }

  const tokenHash = hashToken(rawToken);
  const stored = await RefreshToken.findOne({ tokenHash });

  if (!stored || stored.revokedAt) {
    if (stored)
      await RefreshToken.updateMany({ user: stored.user, revokedAt: null }, { revokedAt: new Date() });
    throw ApiError.unauthorized('Refresh token has been revoked. Please sign in again.');
  }

  const user = await userRepository.findById(decoded.sub, { populate: 'role' });
  if (!user || !user.isActive) throw ApiError.unauthorized('Account not available.');

  const newAccessToken = signAccessToken(accessPayload(user));
  const newRefreshToken = signRefreshToken({ sub: user._id.toString() });
  const newHash = hashToken(newRefreshToken);

  stored.revokedAt = new Date();
  stored.replacedByHash = newHash;
  await stored.save();

  await RefreshToken.create({
    user: user._id,
    tokenHash: newHash,
    userAgent: req.headers['user-agent'] || '',
    ip: req.ip,
    expiresAt: new Date(Date.now() + durationToMs(env.jwt.refreshExpiresIn, 30 * 24 * 60 * 60 * 1000)),
  });

  return { user, accessToken: newAccessToken, refreshToken: newRefreshToken };
}

async function logout(rawToken) {
  if (!rawToken) return;
  await RefreshToken.updateOne({ tokenHash: hashToken(rawToken) }, { revokedAt: new Date() });
}

async function logoutAllSessions(userId) {
  await RefreshToken.updateMany({ user: userId, revokedAt: null }, { revokedAt: new Date() });
}

async function sendVerificationEmail(user) {
  const { raw, hashed } = generateToken();
  user.emailVerificationTokenHash = hashed;
  user.emailVerificationExpires = new Date(Date.now() + env.emailTokenTtlHours * 60 * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  const settings = await settingsRepository.findOne({ singleton: 'main' });
  const verifyUrl = `${env.clientUrl}/verify-email?token=${raw}`;

  await emailService.sendTemplateEmail(
    user.email,
    'email_verification',
    {
      name: user.name,
      businessName: settings?.businessName || 'Faytarouni Barbershop',
      verifyUrl,
      ttlHours: env.emailTokenTtlHours,
    },
    defaultTemplates.emailVerification
  );
}

async function verifyEmail(rawToken) {
  const hashed = hashToken(rawToken);
  const user = await userRepository.findByEmailVerificationHash(hashed);
  if (!user) throw ApiError.badRequest('Verification link is invalid or has expired.');

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = null;
  user.emailVerificationExpires = null;
  await user.save({ validateBeforeSave: false });
  return user;
}

async function requestPasswordReset(email) {
  const user = await userRepository.findByEmail(email);
  if (!user)
    return;

  const { raw, hashed } = generateToken();
  user.passwordResetTokenHash = hashed;
  user.passwordResetExpires = new Date(Date.now() + env.resetTokenTtlHours * 60 * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  const settings = await settingsRepository.findOne({ singleton: 'main' });
  const resetUrl = `${env.clientUrl}/reset-password?token=${raw}`;

  await emailService.sendTemplateEmail(
    user.email,
    'password_reset',
    {
      name: user.name,
      businessName: settings?.businessName || 'Faytarouni Barbershop',
      resetUrl,
      ttlHours: env.resetTokenTtlHours,
    },
    defaultTemplates.passwordReset
  );
}

async function resetPassword(rawToken, newPassword) {
  const hashed = hashToken(rawToken);
  const user = await userRepository.findByPasswordResetHash(hashed);
  if (!user) throw ApiError.badRequest('Reset link is invalid or has expired.');

  user.password = newPassword;
  user.passwordResetTokenHash = null;
  user.passwordResetExpires = null;
  await user.save();
  await logoutAllSessions(user._id);
  return user;
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAllSessions,
  sendVerificationEmail,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
};
