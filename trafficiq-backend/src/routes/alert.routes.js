  /**
 * Alert Routes
 * GET   /alerts          � list (viewer+)
 * GET   /alerts/stats    � aggregate counts (viewer+)
 * GET   /alerts/:id      � single (viewer+)
 * PATCH /alerts/:id/resolve � resolve (operator+)
 */

const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/alert.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireOperator } = require('../middleware/role.middleware');
const { auditLog } = require('../middleware/audit.middleware');

router.use(authenticate);

// NOTE: /stats before /:id to avoid being swallowed as a Mongo ObjectId
router.get('/stats',      ctrl.getStats);
router.get('/',           ctrl.listAlerts);
router.get('/:id',        ctrl.getAlert);
router.patch('/:id/resolve', requireOperator, auditLog, ctrl.resolve);

module.exports = router;
