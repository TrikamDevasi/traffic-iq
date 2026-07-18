/**
 * Role Middleware
 * RBAC guard — restricts access based on req.user.role.
 *
 * Role hierarchy: admin > operator > viewer
 * Usage: router.delete('/:id', authenticate, checkRole('admin'), handler)
 */

const ApiResponse = require('../utils/apiResponse');

// Numeric rank — higher = more privileged
const ROLE_RANK = {
  viewer: 1,
  operator: 2,
  admin: 3,
};

/**
 * Factory that returns a middleware requiring one of the specified roles.
 * Allows multiple accepted roles: checkRole('admin', 'operator')
 *
 * @param {...string} roles — one or more allowed role names
 * @returns {import('express').RequestHandler}
 */
function checkRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.error(res, 'Authentication required', 401);
    }

    const userRank = ROLE_RANK[req.user.role] ?? 0;
    const allowed = roles.some((r) => ROLE_RANK[r] !== undefined && userRank >= ROLE_RANK[r]);

    if (!allowed) {
      return ApiResponse.error(
        res,
        `Access denied — requires one of: ${roles.join(', ')}`,
        403,
      );
    }

    next();
  };
}

/** Convenience: require admin role only. */
const requireAdmin = checkRole('admin');

/** Convenience: require operator or admin. */
const requireOperator = checkRole('operator');

module.exports = { checkRole, requireAdmin, requireOperator };
