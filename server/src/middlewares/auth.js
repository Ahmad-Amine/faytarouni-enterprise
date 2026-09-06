const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { verifyAccessToken } = require('../utils/tokens');
const { userRepository } = require('../repositories');

function extractToken(req) {
  if (req.cookies?.access_token) return req.cookies.access_token;
  if (req.headers.authorization?.startsWith('Bearer ')) return req.headers.authorization.split(' ')[1];
  return null;
}

const authenticate = catchAsync(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next(ApiError.unauthorized('You must be signed in to do this.'));

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch {
    return next(ApiError.unauthorized('Your session is invalid or has expired.'));
  }

  const user = await userRepository.findById(decoded.sub, { populate: 'role' });
  if (!user) return next(ApiError.unauthorized('This account no longer exists.'));
  if (!user.isActive) return next(ApiError.forbidden('This account has been deactivated.'));

  if (user.passwordChangedAt) {
    const changedAtSeconds = Math.floor(new Date(user.passwordChangedAt).getTime() / 1000);
    if (decoded.iat < changedAtSeconds) {
      return next(ApiError.unauthorized('Password was changed recently. Please sign in again.'));
    }
  }

  req.user = user;
  next();
});

const optionalAuthenticate = catchAsync(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const decoded = verifyAccessToken(token);
    const user = await userRepository.findById(decoded.sub, { populate: 'role' });
    if (user && user.isActive) req.user = user;
  } catch {}
  next();
});

function authorize(...permissions) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    const userPermissions = req.user.role?.permissions || [];
    const hasAll = permissions.every((p) => userPermissions.includes(p));
    if (!hasAll) return next(ApiError.forbidden());
    next();
  };
}

function requireRole(...roleNames) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roleNames.includes(req.user.role?.name)) return next(ApiError.forbidden());
    next();
  };
}

module.exports = { authenticate, optionalAuthenticate, authorize, requireRole };
