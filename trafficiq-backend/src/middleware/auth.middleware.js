/**
 * Auth Middleware
 * Verifies the JWT access token from the Authorization header.
 * Attaches { id, role } to req.user on success.
 *
 * Expected header: Authorization: Bearer <token>
 */

const jwt = require('jsonwebtoken');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Protect routes — requires a valid Bearer token.
 * @type {import('express').RequestHandler}
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return ApiResponse.error(res, 'No token provided — authorization required', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach minimal payload to request — controllers can re-fetch full user if needed
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return ApiResponse.error(res, 'Access token expired — please refresh', 401);
    }
    if (err.name === 'JsonWebTokenError') {
      return ApiResponse.error(res, 'Invalid token', 401);
    }
    logger.error(`[AuthMiddleware] JWT verification error: ${err.message}`);
    return ApiResponse.error(res, 'Authentication failed', 401);
  }
}

module.exports = { authenticate };
