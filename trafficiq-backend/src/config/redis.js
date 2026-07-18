/**
 * Redis Client Module (ioredis)
 * Auto-reconnect logic with event logging.
 */

const Redis = require('ioredis');
const logger = require('../utils/logger');

const redis = new Redis(process.env.REDIS_URL, {
  retryStrategy(times) {
    const isOptional = process.env.REDIS_OPTIONAL === 'true';
    if (isOptional && times >= 3) {
      logger.warn(`[Redis] Giving up reconnect after ${times} attempts (REDIS_OPTIONAL=true)`);
      return null; // Stop retrying
    }
    const delay = Math.min(times * 200, 5000);
    logger.warn(`[Redis] Reconnecting in ${delay}ms (attempt ${times})`);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: true,
});

// ── Event Listeners ──────────────────────────────────────────────

redis.on('connect', () => {
  logger.info('[Redis] Client connected');
});

redis.on('ready', () => {
  logger.info('[Redis] Client ready');
});

redis.on('error', (err) => {
  logger.error(`[Redis] Error: ${err.message}`);
});

redis.on('close', () => {
  logger.warn('[Redis] Connection closed');
});

redis.on('reconnecting', (delay) => {
  logger.info(`[Redis] Reconnecting in ${delay}ms`);
});

/**
 * Connect to Redis (lazy connect mode).
 */
async function connectRedis() {
  try {
    await redis.connect();
  } catch (err) {
    logger.error(`[Redis] Failed to connect: ${err.message}`);
  }
}

/**
 * Check if Redis is connected.
 * @returns {boolean}
 */
function isRedisConnected() {
  return redis.status === 'ready';
}

module.exports = { redis, connectRedis, isRedisConnected };
