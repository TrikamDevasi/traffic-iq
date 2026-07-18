/**
 * Audit Middleware
 * Writes an AuditLog document for every mutating HTTP request (POST/PUT/PATCH/DELETE).
 * Fires on res.finish (after response sent) — zero added latency.
 */

const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * @type {import('express').RequestHandler}
 */
function auditLog(req, res, next) {
  if (!MUTATING_METHODS.has(req.method)) {
    return next();
  }

  res.on('finish', async () => {
    if (!req.user || res.statusCode >= 400) return;

    try {
      const resource = extractResource(req.originalUrl);
      const action = `${req.method} ${req.route ? req.route.path : req.originalUrl}`;

      await AuditLog.create({
        userId: req.user.id,
        action,
        resource,
        details: {
          params: req.params || {},
          query: req.query || {},
          bodyKeys: req.body ? Object.keys(req.body) : [],
          statusCode: res.statusCode,
        },
        ip: req.ip || null,
      });
    } catch (err) {
      logger.error(`[AuditLog] Failed to write audit entry: ${err.message}`);
    }
  });

  next();
}

function extractResource(url) {
  const path = url.split('?')[0];
  const parts = path.replace(/^\/api\/v\d+\//, '').split('/');
  return parts[0] || 'unknown';
}

module.exports = { auditLog };
