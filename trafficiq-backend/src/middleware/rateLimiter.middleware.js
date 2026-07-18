/**
 * Rate Limiter Middleware
 * Three limiters:
 *   generalLimiter       — 100 req / 15 min per IP  (public API)
 *   authLimiter          — 10 req  / 15 min per IP  (login / register)
 *   authenticatedLimiter — 500 req / 15 min per IP  (authenticated routes)
 */

const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP — please try again in 15 minutes.',
  },
  skipSuccessfulRequests: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts — please try again in 15 minutes.',
  },
  skipSuccessfulRequests: false,
});

const authenticatedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Rate limit exceeded — please slow down your requests.',
  },
  skipSuccessfulRequests: false,
});

module.exports = { generalLimiter, authLimiter, authenticatedLimiter };
