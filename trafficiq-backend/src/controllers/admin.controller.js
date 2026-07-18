  /**
 * Admin Controller
 * User management (list, get, update role, deactivate) and system health.
 * All routes in this controller require admin role � enforced at the route level.
 */

const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Intersection = require('../models/Intersection');
const Alert = require('../models/Alert');
const TrafficReading = require('../models/TrafficReading');
const { isConnected: isMongoConnected } = require('../config/db');
const { isRedisConnected } = require('../config/redis');
const { isMQTTConnected } = require('../config/mqtt');
const { isMlServiceHealthy } = require('../services/marl.service');
const { getConnectedCount } = require('../services/socket.service');
const { broadcastSystemMessage } = require('../services/socket.service');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

// -- System health -------------------------------------------------
// GET /admin/health

async function getSystemHealth(req, res, next) {
  try {
    const [mlHealthy, socketCount] = await Promise.all([
      isMlServiceHealthy(),
      getConnectedCount(),
    ]);

    const status = {
      api:     { status: 'connected' },
      mongodb: { status: isMongoConnected() ? 'connected' : 'disconnected' },
      redis:   { status: isRedisConnected()  ? 'connected' : 'disconnected' },
      mqtt:    { status: isMQTTConnected()   ? 'connected' : 'disconnected' },
      mlService: { status: mlHealthy ? 'connected' : 'disconnected', url: process.env.ML_SERVICE_URL },
      socketClients: socketCount,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };

    const allGreen = isMongoConnected() && isRedisConnected();
    return ApiResponse.success(res, allGreen ? 'All systems operational' : 'Degraded mode', status);
  } catch (err) {
    next(err);
  }
}

// -- Dashboard stats -----------------------------------------------
// GET /admin/stats

async function getDashboardStats(req, res, next) {
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalIntersections,
      activeIntersections,
      totalUsers,
      activeAlerts,
      readingsToday,
      topCongested,
    ] = await Promise.all([
      Intersection.countDocuments(),
      Intersection.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true }),
      Alert.countDocuments({ isResolved: false }),
      TrafficReading.countDocuments({ timestamp: { $gte: since24h } }),
      TrafficReading.aggregate([
        { $match: { timestamp: { $gte: since24h } } },
        { $group: { _id: '$intersectionId', avgWait: { $avg: '$averageWaitTime' } } },
        { $sort: { avgWait: -1 } },
        { $limit: 1 },
      ]),
    ]);

    return ApiResponse.success(res, 'Dashboard stats retrieved', {
      intersections: { total: totalIntersections, active: activeIntersections },
      users: { active: totalUsers },
      alerts: { active: activeAlerts },
      traffic: { readingsToday },
      topCongested: topCongested[0] || null,
    });
  } catch (err) {
    next(err);
  }
}

// -- Audit logs (paginated) ----------------------------------------
// GET /admin/audit?userId=&action=&page=1&limit=50

async function getAuditLogs(req, res, next) {
  try {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(200, parseInt(req.query.limit, 10) || 50);
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.userId)   filter.userId   = req.query.userId;
    if (req.query.resource) filter.resource = req.query.resource;
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to)   filter.createdAt.$lte = new Date(req.query.to);
    }

    const [items, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email role')
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return ApiResponse.paginated(res, 'Audit logs retrieved', items, { page, limit, total });
  } catch (err) {
    next(err);
  }
}

// -- List users ----------------------------------------------------
// GET /admin/users?role=operator&isActive=true&page=1&limit=20

async function listUsers(req, res, next) {
  try {
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.role)     filter.role     = req.query.role;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.search)   filter.name     = { $regex: req.query.search, $options: 'i' };

    const [items, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);

    return ApiResponse.paginated(res, 'Users retrieved', items, { page, limit, total });
  } catch (err) {
    next(err);
  }
}

// -- Get single user -----------------------------------------------
// GET /admin/users/:id

async function getUser(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return ApiResponse.error(res, 'User not found', 404);
    return ApiResponse.success(res, 'User retrieved', user);
  } catch (err) {
    next(err);
  }
}

// -- Promote/update user -------------------------------------------
// PUT /admin/users/:id   body: { role?, assignedIntersections? }

async function updateUser(req, res, next) {
  try {
    const allowedFields = ['role', 'assignedIntersections', 'name'];
    const update = {};
    allowedFields.forEach((f) => { if (req.body[f] !== undefined) update[f] = req.body[f]; });

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!user) return ApiResponse.error(res, 'User not found', 404);

    logger.info(`[AdminCtrl] User ${req.params.id} updated by admin ${req.user.id}: ${JSON.stringify(update)}`);
    return ApiResponse.success(res, 'User updated', user);
  } catch (err) {
    next(err);
  }
}

// -- Deactivate user -----------------------------------------------
// PATCH /admin/users/:id/deactivate

async function deactivateUser(req, res, next) {
  try {
    if (req.params.id === req.user.id) {
      return ApiResponse.error(res, 'You cannot deactivate your own account', 400);
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true },
    );
    if (!user) return ApiResponse.error(res, 'User not found', 404);

    logger.info(`[AdminCtrl] User ${req.params.id} deactivated by admin ${req.user.id}`);
    return ApiResponse.success(res, 'User deactivated', user);
  } catch (err) {
    next(err);
  }
}

// -- Broadcast system message --------------------------------------
// POST /admin/broadcast   body: { message, level }

async function broadcast(req, res, next) {
  try {
    const { message, level } = req.body;
    if (!message) return ApiResponse.error(res, 'message is required', 400);
    broadcastSystemMessage(message, level || 'info');
    logger.info(`[AdminCtrl] Broadcast sent by admin ${req.user.id}: "${message}"`);
    return ApiResponse.success(res, 'Broadcast sent');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getSystemHealth,
  getDashboardStats,
  getAuditLogs,
  listUsers,
  getUser,
  updateUser,
  deactivateUser,
  broadcast,
};
