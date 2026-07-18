  /**
 * Traffic Routes
 * GET /traffic/live                          � all intersections current state
 * GET /traffic/:intersectionId/latest        � Redis-cached latest reading
 * GET /traffic/:intersectionId/history       � paginated historical readings
 * GET /traffic/:intersectionId/stats         � aggregated stats
 */

const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/traffic.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

// NOTE: /live before /:intersectionId
router.get('/live',                    ctrl.getLive);
router.get('/:intersectionId/latest',  ctrl.getLatest);
router.get('/:intersectionId/history', ctrl.getHistory);
router.get('/:intersectionId/stats',   ctrl.getStats);

module.exports = router;
