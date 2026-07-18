/**
 * Analytics Routes
 * All routes require viewer+ role.
 */

const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/analytics.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/trends', ctrl.getTrends);
router.get('/heatmap', ctrl.getHeatmap);
router.get('/kpis', ctrl.getKpis);

module.exports = router;
