const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const authService = require('../services/AuthService');
const { setAuthCookies, clearAuthCookies, REFRESH_COOKIE } = require('../utils/tokens');
const { userRepository } = require('../repositories');

exports.register = catchAsync(async (req, res) => {
  const { user, accessToken, refreshToken } = await authService.register(req.body, req);
  setAuthCookies(res, accessToken, refreshToken);
  return new ApiResponse(201, { user: user.toSafeObject() }, 'Account created. Please verify your email.').send(res);
});

exports.login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.login(email, password, req);
  setAuthCookies(res, accessToken, refreshToken);
  return new ApiResponse(200, { user: user.toSafeObject() }, 'Welcome back.').send(res);
});

exports.refresh = catchAsync(async (req, res) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE];
  const { user, accessToken, refreshToken } = await authService.refresh(rawToken, req);
  setAuthCookies(res, accessToken, refreshToken);
  return new ApiResponse(200, { user: user.toSafeObject() }, 'Session refreshed.').send(res);
});

exports.logout = catchAsync(async (req, res) => {
  const rawToken = req.cookies?.[REFRESH_COOKIE];
  await authService.logout(rawToken);
  clearAuthCookies(res);
  return new ApiResponse(200, null, 'Signed out.').send(res);
});

exports.logoutAll = catchAsync(async (req, res) => {
  await authService.logoutAllSessions(req.user._id);
  clearAuthCookies(res);
  return new ApiResponse(200, null, 'Signed out of all devices.').send(res);
});

exports.getMe = catchAsync(async (req, res) => {
  return new ApiResponse(200, { user: req.user.toSafeObject() }).send(res);
});

exports.updateProfile = catchAsync(async (req, res) => {
  const user = await userRepository.updateById(req.user._id, req.body);
  return new ApiResponse(200, { user: user.toSafeObject() }, 'Profile updated.').send(res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  const User = require('../models/User');
  const fullUser = await User.findById(req.user._id).select('+password');
  if (!(await fullUser.comparePassword(req.body.currentPassword))) {
    return next(ApiError.unauthorized('Current password is incorrect.'));
  }
  fullUser.password = req.body.newPassword;
  await fullUser.save();
  return new ApiResponse(200, null, 'Password updated. Please sign in again.').send(res);
});

exports.verifyEmail = catchAsync(async (req, res) => {
  await authService.verifyEmail(req.body.token);
  return new ApiResponse(200, null, 'Email verified.').send(res);
});

exports.resendVerification = catchAsync(async (req, res) => {
  await authService.sendVerificationEmail(req.user);
  return new ApiResponse(200, null, 'Verification email sent.').send(res);
});

exports.forgotPassword = catchAsync(async (req, res) => {
  await authService.requestPasswordReset(req.body.email);
  return new ApiResponse(200, null, 'If that email exists, a reset link has been sent.').send(res);
});

exports.resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.password);
  return new ApiResponse(200, null, 'Password reset. Please sign in.').send(res);
});
