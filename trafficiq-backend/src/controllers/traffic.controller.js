  /**
 * Traffic Controller
 * Handles traffic reading queries � latest (Redis-cached), historical ranges,
 * live snapshot for all intersections, and aggregated stats.
 */

const TrafficReading = require('../models/TrafficReading');
const Intersection = require('../models/Intersection');
const { getCache } = require('../services/redis.service');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

// -- Live snapshot � all intersections -----------------------------
// GET /traffic/live

async function getLive(req, res, next) {
  try {
    const intersections = await Intersection.find({ isActive: true }, { intersectionId: 1 }).lean();

    const results = await Promise.all(
      intersections.map(async ({ intersectionId }) => {
        const cached = await getCache(`traffic:${intersectionId}:latest`);
        if (cached) {
          try { return JSON.parse(cached); } catch { /* fall through to DB */ }
        }
        // Cache miss � fetch latest from DB
        const reading = await TrafficReading.findOne({ intersectionId })
          .sort({ timestamp: -1 })
          .lean();
        return reading || { intersectionId, vehicleCounts: null, queueLength: null, averageWaitTime: null };
      }),
    );

    return ApiResponse.success(res, 'Live traffic data retrieved', results);
  } catch (err) {
    next(err);
  }
}

// -- Latest reading for one intersection --------------------------
// GET /traffic/:intersectionId/latest

async function getLatest(req, res, next) {
  try {
    const { intersectionId } = req.params;

    // Try Redis cache first
    const cached = await getCache(`traffic:${intersectionId}:latest`);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        logger.debug(`[TrafficCtrl] Cache HIT: ${intersectionId}`);
        return ApiResponse.success(res, 'Latest reading retrieved (cached)', parsed);
      } catch { /* fall through */ }
    }

    logger.debug(`[TrafficCtrl] Cache MISS: ${intersectionId}`);
    const reading = await TrafficReading.findOne({ intersectionId }).sort({ timestamp: -1 });
    if (!reading) return ApiResponse.error(res, `No readings found for ${intersectionId}`, 404);
    return ApiResponse.success(res, 'Latest reading retrieved', reading);
  } catch (err) {
    next(err);
  }
}

// -- Historical readings (time-range, paginated) -------------------
// GET /traffic/:intersectionId/history?from=ISO&to=ISO&page=1&limit=50

async function getHistory(req, res, next) {
  try {
    const { intersectionId } = req.params;
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(200, parseInt(req.query.limit, 10) || 50);
    const skip  = (page - 1) * limit;

    const timeFilter = {};
    if (req.query.from) timeFilter.$gte = new Date(req.query.from);
    if (req.query.to)   timeFilter.$lte = new Date(req.query.to);

    const filter = { intersectionId };
    if (Object.keys(timeFilter).length) filter.timestamp = timeFilter;

    const [items, total] = await Promise.all([
      TrafficReading.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      TrafficReading.countDocuments(filter),
    ]);

    return ApiResponse.paginated(res, 'Traffic history retrieved', items, { page, limit, total });
  } catch (err) {
    next(err);
  }
}

// -- Aggregated stats for one intersection -------------------------
// GET /traffic/:intersectionId/stats?period=24h

async function getStats(req, res, next) {
  try {
    const { intersectionId } = req.params;
    const period = req.query.period || '24h';
    const hours  = period === '7d' ? 168 : period === '6h' ? 6 : 24;
    const since  = new Date(Date.now() - hours * 60 * 60 * 1000);

    const agg = await TrafficReading.aggregate([
      { $match: { intersectionId, timestamp: { $gte: since } } },
      {
        $group: {
          _id: null,
          avgWaitTime:     { $avg: '$averageWaitTime' },
          maxWaitTime:     { $max: '$averageWaitTime' },
          avgQueueLength:  { $avg: '$queueLength' },
          maxQueueLength:  { $max: '$queueLength' },
          avgVehicles:     { $avg: '$vehicleCounts.total' },
          totalReadings:   { $sum: 1 },
          firstReading:    { $min: '$timestamp' },
          lastReading:     { $max: '$timestamp' },
        },
      },
    ]);

    const stats = agg[0]
      ? {
          intersectionId,
          period,
          avgWaitTime:     parseFloat((agg[0].avgWaitTime    || 0).toFixed(1)),
          maxWaitTime:     parseFloat((agg[0].maxWaitTime    || 0).toFixed(1)),
          avgQueueLength:  parseFloat((agg[0].avgQueueLength || 0).toFixed(1)),
          maxQueueLength:  parseFloat((agg[0].maxQueueLength || 0).toFixed(1)),
          avgVehicles:     parseFloat((agg[0].avgVehicles    || 0).toFixed(1)),
          totalReadings:   agg[0].totalReadings,
          from: agg[0].firstReading,
          to:   agg[0].lastReading,
        }
      : { intersectionId, period, totalReadings: 0 };

    return ApiResponse.success(res, 'Traffic stats retrieved', stats);
  } catch (err) {
    next(err);
  }
}

module.exports = { getLive, getLatest, getHistory, getStats };
