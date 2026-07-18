/**
 * Global Error Handler Middleware
 * Must be registered LAST in app.js (after all routes).
 * Catches any error passed via next(err) and returns a standardized ApiResponse.error() envelope.
 */

const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

const isProd = process.env.NODE_ENV === 'production';

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  logger.error(`[ErrorHandler] ${req.method} ${req.originalUrl} — ${err.message}`, {
    stack: err.stack,
    statusCode: err.statusCode || err.status,
    userId: req.user ? req.user.id : null,
    ip: req.ip,
  });

  // Mongoose validation
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return ApiResponse.error(res, 'Validation failed', 422, messages);
  }

  // Duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return ApiResponse.error(res, `Duplicate value for ${field}`, 409);
  }

  // Cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return ApiResponse.error(res, `Invalid ${err.path}: ${err.value}`, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.error(res, 'Invalid token', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return ApiResponse.error(res, 'Token expired', 401);
  }

  // Explicit HTTP status errors
  if (err.statusCode || err.status) {
    const code = err.statusCode || err.status;
    const message = isProd && code >= 500 ? 'Internal server error' : err.message;
    return ApiResponse.error(res, message, code);
  }

  // Fallback 500
  return ApiResponse.error(
    res,
    isProd ? 'Internal server error' : err.message,
    500,
  );
}

function notFoundHandler(req, res) {
  return ApiResponse.error(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

module.exports = { errorHandler, notFoundHandler };
