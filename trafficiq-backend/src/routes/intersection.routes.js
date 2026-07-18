  /**
 * Intersection Routes
 * GET    /intersections           � list (viewer+)
 * GET    /intersections/nearby    � geospatial (viewer+)
 * GET    /intersections/:id       � single (viewer+)
 * POST   /intersections           � create (admin)
 * PUT    /intersections/:id       � update (admin)
 * DELETE /intersections/:id       � delete (admin)
 */

const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/intersection.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { requireAdmin } = require('../middleware/role.middleware');
const { auditLog } = require('../middleware/audit.middleware');

// All routes require authentication
router.use(authenticate);

// NOTE: /nearby must come BEFORE /:id to avoid being caught as an intersectionId param
router.get('/nearby', ctrl.getNearby);
router.get('/',       ctrl.listIntersections);
router.get('/:id',    ctrl.getIntersection);

router.post('/',    requireAdmin, auditLog, ctrl.createIntersection);
router.put('/:id',  requireAdmin, auditLog, ctrl.updateIntersection);
router.delete('/:id', requireAdmin, auditLog, ctrl.deleteIntersection);

module.exports = router;
