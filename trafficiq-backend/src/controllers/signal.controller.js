  /**
 * Signal Controller
 * Manages signal phase state per intersection.
 * Manual override and auto-mode toggling are operator+ actions, logged to AuditLog.
 *
 * Phase decisions are persisted to SignalDecision and published via MQTT.
 * The MARL engine is consulted for the optimal phase on getOptimalPhase().
 */

const SignalDecision = require('../models/SignalDecision');
const AuditLog = require('../models/AuditLog');
const Intersection = require('../models/Intersection');
const { getCache, setCache } = require('../services/redis.service');
const { publishSignalCommand } = require('../services/mqtt.service');
const { getOptimalPhase } = require('../services/marl.service');
const { emitSignalChange } = require('../services/socket.service');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

const PHASE_CACHE_KEY = (id) => `signal:${id}:phase`;
const MODE_CACHE_KEY  = (id) => `signal:${id}:mode`;   // 'auto' | 'manual'
const PHASE_TTL = 120; // seconds

// -- Helper: resolve and validate intersection ---------------------

async function resolveIntersection(intersectionId) {
  const doc = await Intersection.findOne({ intersectionId, isActive: true });
  return doc;
}

// -- Get current phase ---------------------------------------------
// GET /signals/:intersectionId/phase

async function getCurrentPhase(req, res, next) {
  try {
    const { intersectionId } = req.params;
    const intersection = await resolveIntersection(intersectionId);
    if (!intersection) return ApiResponse.error(res, `Intersection ${intersectionId} not found or inactive`, 404);

    // Try Redis first
    const cached = await getCache(PHASE_CACHE_KEY(intersectionId));
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return ApiResponse.success(res, 'Current phase retrieved (cached)', { intersectionId, ...parsed });
      } catch { /* fall through */ }
    }

    // Fall back to latest SignalDecision in DB
    const latest = await SignalDecision.findOne({ intersectionId }).sort({ timestamp: -1 });
    if (!latest) {
      return ApiResponse.success(res, 'No phase recorded yet � using default', {
        intersectionId,
        activePhase: 0,
        greenDuration: 30,
        decisionSource: 'FALLBACK',
      });
    }

    return ApiResponse.success(res, 'Current phase retrieved', latest);
  } catch (err) {
    next(err);
  }
}

// -- Manual override (operator+) -----------------------------------
// POST /signals/:intersectionId/override   body: { phase: 0-3, duration: 15-120 }

async function manualOverride(req, res, next) {
  try {
    const { intersectionId } = req.params;
    const { phase, duration } = req.body;

    if (phase === undefined || phase < 0 || phase > 3) {
      return ApiResponse.error(res, 'phase must be an integer between 0 and 3', 400);
    }
    const safeDuration = Math.min(120, Math.max(15, parseInt(duration, 10) || 30));

    const intersection = await resolveIntersection(intersectionId);
    if (!intersection) return ApiResponse.error(res, `Intersection ${intersectionId} not found or inactive`, 404);

    // Persist decision
    const decision = await SignalDecision.create({
      intersectionId,
      activePhase:    phase,
      greenDuration:  safeDuration,
      decisionSource: 'MANUAL',
      qmixReward:     0,
    });

    // Cache new phase
    await setCache(PHASE_CACHE_KEY(intersectionId), { activePhase: phase, greenDuration: safeDuration, decisionSource: 'MANUAL' }, PHASE_TTL);
    await setCache(MODE_CACHE_KEY(intersectionId), 'manual', 3600);

    // Publish MQTT command
    await publishSignalCommand(intersectionId, phase, safeDuration, 'MANUAL');

    // Emit Socket.IO event
    emitSignalChange(intersectionId, phase, safeDuration, 'MANUAL');

    // Write audit log
    await AuditLog.create({
      userId:   req.user.id,
      action:   `POST /signals/${intersectionId}/override`,
      resource: 'signals',
      details:  { intersectionId, phase, duration: safeDuration },
      ip:       req.ip,
    });

    logger.info(`[SignalCtrl] Manual override: ${intersectionId} -> phase ${phase} (${safeDuration}s) by user ${req.user.id}`);
    return ApiResponse.success(res, 'Signal override applied', decision, 201);
  } catch (err) {
    next(err);
  }
}

// -- Enable MARL auto-mode (operator+) ----------------------------
// POST /signals/:intersectionId/auto

async function setAutoMode(req, res, next) {
  try {
    const { intersectionId } = req.params;
    const intersection = await resolveIntersection(intersectionId);
    if (!intersection) return ApiResponse.error(res, `Intersection ${intersectionId} not found or inactive`, 404);

    // Set mode flag in Redis � MQTT service cycle will pick this up
    await setCache(MODE_CACHE_KEY(intersectionId), 'auto', 3600);

    logger.info(`[SignalCtrl] Auto mode enabled: ${intersectionId} by user ${req.user.id}`);
    return ApiResponse.success(res, `MARL auto-mode enabled for ${intersectionId}`);
  } catch (err) {
    next(err);
  }
}

// -- Get optimal phase from MARL (viewer+) -------------------------
// GET /signals/:intersectionId/optimal

async function getOptimal(req, res, next) {
  try {
    const { intersectionId } = req.params;

    // Build a minimal observation vector (placeholder if live reading unavailable)
    const cached = await getCache(`traffic:${intersectionId}:latest`);
    let obs = new Array(50).fill(0);
    if (cached) {
      try {
        const reading = JSON.parse(cached);
        // Fill first few dims with vehicle counts
        obs[0] = (reading.vehicleCounts && reading.vehicleCounts.total) || 0;
        obs[4] = reading.queueLength    || 0;
        obs[8] = reading.averageWaitTime || 0;
      } catch { /* use zeros */ }
    }

    const result = await getOptimalPhase(intersectionId, obs, {});
    
    if (result.fallback) {
      return ApiResponse.success(res, 'Optimal phase retrieved (FALLBACK)', { intersectionId, ...result });
    }

    return ApiResponse.success(res, 'Optimal phase retrieved', { intersectionId, ...result });
  } catch (err) {
    next(err);
  }
}

// -- Phase history (viewer+) ---------------------------------------
// GET /signals/:intersectionId/history?page=1&limit=20

async function getPhaseHistory(req, res, next) {
  try {
    const { intersectionId } = req.params;
    const page  = Math.max(1, parseInt(req.query.page,  10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
    const skip  = (page - 1) * limit;

    const [items, total] = await Promise.all([
      SignalDecision.find({ intersectionId }).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      SignalDecision.countDocuments({ intersectionId }),
    ]);

    return ApiResponse.paginated(res, 'Phase history retrieved', items, { page, limit, total });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getCurrentPhase,
  manualOverride,
  setAutoMode,
  getOptimal,
  getPhaseHistory,
};
