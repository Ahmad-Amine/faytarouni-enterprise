const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const logger = require('../utils/logger');
const env = require('../config/env');

function normalize(err) {
  if (err.name === 'CastError') return ApiError.badRequest(`Invalid value for ${err.path}: ${err.value}`);
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return ApiError.conflict(`That ${field} is already in use.`);
  }
  if (err.name === 'ValidationError') {
    return ApiError.badRequest(Object.values(err.errors).map((e) => e.message).join(' '));
  }
  if (err.name === 'JsonWebTokenError') return ApiError.unauthorized('Invalid session. Please sign in again.');
  if (err.name === 'TokenExpiredError') return ApiError.unauthorized('Session expired. Please sign in again.');
  return err;
}

module.exports = function errorHandler(err, req, res, next) {
  const error = err instanceof ApiError ? err : normalize(err);
  const statusCode = error.statusCode || 500;
  const isOperational = error.isOperational || statusCode < 500;

  if (!isOperational) {
    logger.error('UNEXPECTED ERROR', { message: err.message, stack: env.isProd ? undefined : err.stack });
  }

  const message = isOperational ? error.message : 'Something went wrong. Please try again.';
  return new ApiResponse(statusCode, env.isProd ? null : error.details || null, message).send(res);
};
