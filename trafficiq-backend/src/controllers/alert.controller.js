  /**
 * Alert Controller
 * List, get, resolve, and get stats for system alerts.
 * Resolve is operator+; all reads are viewer+.
 */

const Alert = require('../models/Alert');
const { resolveAlert } = require('../services/alert.service');
const ApiResponse = require('../utils/apiResponse');

// -- List alerts (filterable) --------------------------------------
// GET /alerts?severity=high&type=congestion&intersectionId=INT-001&isResolved=false&page=1&limit=20

async function listAlerts(req, res, next) {
  try {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.severity)       filter.severity       = req.query.severity;
    if (req.query.type)           filter.type           = req.query.type;
    if (req.query.intersectionId) filter.intersectionId = req.query.intersectionId;
    if (req.query.isResolved !== undefined) {
      filter.isResolved = req.query.isResolved === 'true';
    }
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to)   filter.createdAt.$lte = new Date(req.query.to);
    }

    const [items, total] = await Promise.all([
      Alert.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Alert.countDocuments(filter),
    ]);

    return ApiResponse.paginated(res, 'Alerts retrieved', items, { page, limit, total });
  } catch (err) {
    next(err);
  }
}

// -- Get single alert ----------------------------------------------
// GET /alerts/:id

async function getAlert(req, res, next) {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) return ApiResponse.error(res, 'Alert not found', 404);
    return ApiResponse.success(res, 'Alert retrieved', alert);
  } catch (err) {
    next(err);
  }
}

// -- Resolve alert (operator+) -------------------------------------
// PATCH /alerts/:id/resolve

async function resolve(req, res, next) {
  try {
    const alert = await resolveAlert(req.params.id, req.user.id);
    if (!alert) return ApiResponse.error(res, 'Alert not found or already resolved', 404);
    return ApiResponse.success(res, 'Alert resolved', alert);
  } catch (err) {
    next(err);
  }
}

// -- Alert stats ---------------------------------------------------
// GET /alerts/stats

async function getStats(req, res, next) {
  try {
    const [
      total,
      active,
      critical,
      byType,
      bySeverity,
    ] = await Promise.all([
      Alert.countDocuments(),
      Alert.countDocuments({ isResolved: false }),
      Alert.countDocuments({ severity: 'critical', isResolved: false }),
      Alert.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      Alert.aggregate([
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
    ]);

    const typeMap     = Object.fromEntries(byType.map((r) => [r._id, r.count]));
    const severityMap = Object.fromEntries(bySeverity.map((r) => [r._id, r.count]));

    return ApiResponse.success(res, 'Alert stats retrieved', {
      total,
      active,
      resolved: total - active,
      critical,
      byType:     typeMap,
      bySeverity: severityMap,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listAlerts, getAlert, resolve, getStats };
