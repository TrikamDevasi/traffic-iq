  /**
 * Admin Routes � all require admin role
 * GET   /admin/health                 � system health
 * GET   /admin/stats                  � dashboard KPIs
 * GET   /admin/audit                  � audit log
 * GET   /admin/users                  � list users
 * GET   /admin/users/:id              � single user
 * PUT   /admin/users/:id              � update role / intersections
 * PATCH /admin/users/:id/deactivate   � deactivate user
 * POST  /admin/broadcast              � Socket.IO broadcast
 */

const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');
const { auditLog } = require('../middleware/audit.middleware');

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

router.get('/health',               ctrl.getSystemHealth);
router.get('/stats',                ctrl.getDashboardStats);
router.get('/audit',                ctrl.getAuditLogs);

router.get('/users',                ctrl.listUsers);
router.get('/users/:id',            ctrl.getUser);
router.put('/users/:id',            auditLog, ctrl.updateUser);
router.patch('/users/:id/deactivate', auditLog, ctrl.deactivateUser);

router.post('/broadcast',           auditLog, ctrl.broadcast);

module.exports = router;
