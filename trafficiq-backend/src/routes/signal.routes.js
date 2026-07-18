  /**
 * Signal Routes
 * GET  /signals/:intersectionId/phase    � current phase (viewer+)
 * GET  /signals/:intersectionId/optimal  � MARL recommendation (viewer+)
 * GET  /signals/:intersectionId/history  � phase log (viewer+)
 * POST /signals/:intersectionId/override � manual override (operator+)
 * POST /signals/:intersectionId/auto     � enable auto MARL mode (operator+)
 */

const express = require('express');
const router = express.Router({ mergeParams: true });

const ctrl = require('../controllers/signal.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireOperator } = require('../middleware/role.middleware');
const { auditLog } = require('../middleware/audit.middleware');

router.use(authenticate);

router.get('/:intersectionId/phase',    ctrl.getCurrentPhase);
router.get('/:intersectionId/optimal',  ctrl.getOptimal);
router.get('/:intersectionId/history',  ctrl.getPhaseHistory);

router.post('/:intersectionId/override', requireOperator, auditLog, ctrl.manualOverride);
router.post('/:intersectionId/auto',     requireOperator, auditLog, ctrl.setAutoMode);

module.exports = router;
