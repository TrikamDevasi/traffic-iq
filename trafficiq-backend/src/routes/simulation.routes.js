  /**
 * Simulation Routes
 * POST /simulations/run      � trigger run (operator+)
 * GET  /simulations/latest   � most recent completed run (viewer+)
 * GET  /simulations          � list all runs (viewer+)
 * GET  /simulations/:runId   � single run (viewer+)
 */

const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/simulation.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireOperator } = require('../middleware/role.middleware');
const { auditLog } = require('../middleware/audit.middleware');

router.use(authenticate);

// NOTE: /latest and /run before /:runId
router.post('/run',         requireOperator, auditLog, ctrl.runSimulationCtrl);
router.get('/latest',       ctrl.getLatestCtrl);
router.get('/',             ctrl.listRunsCtrl);
router.get('/:runId',       ctrl.getRunCtrl);

module.exports = router;
