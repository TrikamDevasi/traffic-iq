  /**
 * Route Index
 * Combines all route files and mounts them under /api/v1.
 * Import this single file in app.js.
 *
 * Mount order matters  more specific paths first (e.g. /auth before wildcard).
 */

const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const intersectionRoutes = require('./intersection.routes');
const trafficRoutes = require('./traffic.routes');
const signalRoutes = require('./signal.routes');
const alertRoutes = require('./alert.routes');
const simulationRoutes = require('./simulation.routes');
const adminRoutes = require('./admin.routes');
const analyticsRoutes = require('./analytics.routes');

router.use('/auth',          authRoutes);
router.use('/intersections', intersectionRoutes);
router.use('/traffic',       trafficRoutes);
router.use('/signals',       signalRoutes);
router.use('/alerts',        alertRoutes);
router.use('/simulations',   simulationRoutes);
router.use('/admin',         adminRoutes);
router.use('/analytics',     analyticsRoutes);

module.exports = router;
