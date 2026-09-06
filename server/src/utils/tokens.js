const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { durationToMs } = require('./duration');

function signAccessToken(payload) {
  return jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessExpiresIn });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresIn });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

// Browser API traffic is same-origin via the frontend reverse proxy. This
// avoids Safari/iOS third-party-cookie restrictions while keeping cookies
// Secure in production and unavailable to cross-site requests by default.
function cookieAttributes() {
  return { secure: env.isProd, sameSite: 'lax' };
}

function accessCookieOptions() {
  return {
    httpOnly: true,
    ...cookieAttributes(),
    maxAge: durationToMs(env.jwt.accessExpiresIn, 15 * 60 * 1000),
  };
}

function refreshCookieOptions() {
  return {
    httpOnly: true,
    ...cookieAttributes(),
    maxAge: durationToMs(env.jwt.refreshExpiresIn, 30 * 24 * 60 * 60 * 1000),
    path: `${env.apiPrefix}/auth`,
  };
}

function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie(ACCESS_COOKIE, accessToken, accessCookieOptions());
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
}

function clearAuthCookies(res) {
  const attrs = cookieAttributes();
  res.clearCookie(ACCESS_COOKIE, { path: '/', httpOnly: true, ...attrs });
  res.clearCookie(REFRESH_COOKIE, { path: `${env.apiPrefix}/auth`, httpOnly: true, ...attrs });
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
};
