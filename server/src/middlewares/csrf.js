const crypto = require('crypto');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

const CSRF_COOKIE = 'csrf_token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit cookie CSRF protection, signed with CSRF_SECRET so the
 * token itself can't be forged even if an attacker could somehow guess or
 * observe its format (defense in depth on top of the double-submit
 * design, which alone only relies on same-origin cookie access).
 */
function sign(value) {
  return crypto.createHmac('sha256', env.csrfSecret).update(value).digest('hex');
}

function issueCsrfCookie(req, res, next) {
  const existing = req.cookies?.[CSRF_COOKIE];
  if (existing && isValidToken(existing)) {
    req.csrfToken = existing;
    return next();
  }

  const raw = crypto.randomBytes(24).toString('hex');
  const token = `${raw}.${sign(raw)}`;
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: env.isProd,
    // Browser traffic reaches the API through the frontend same-origin proxy.
    // Lax keeps the CSRF cookie first-party and Safari-compatible.
    sameSite: 'lax',
  });
  req.csrfToken = token;
  next();
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function isValidToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return false;
  const [raw, signature] = token.split('.');
  return safeEqual(sign(raw), signature);
}

function verifyCsrf(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || !isValidToken(cookieToken) || !safeEqual(cookieToken, headerToken)) {
    return next(ApiError.forbidden('Invalid or missing CSRF token.'));
  }
  next();
}

module.exports = { issueCsrfCookie, verifyCsrf, CSRF_COOKIE };
