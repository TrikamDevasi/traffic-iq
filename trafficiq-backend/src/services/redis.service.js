/**
 * Redis Service
 * Helper functions for common Redis operations (SET/GET/DEL).
 * Includes a quick self-test on import.
 */

const { redis } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Set a key with optional TTL (seconds).
 * @param {string} key
 * @param {string} value
 * @param {number} [ttlSeconds] — optional TTL
 */
async function setCache(key, value, ttlSeconds) {
  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    if (ttlSeconds) {
      await redis.set(key, serialized, 'EX', ttlSeconds);
    } else {
      await redis.set(key, serialized);
    }
  } catch (err) {
    logger.error(`[RedisService] SET ${key} failed: ${err.message}`);
  }
}

/**
 * Get a cached value by key.
 * @param {string} key
 * @returns {Promise<string|null>}
 */
async function getCache(key) {
  try {
    return await redis.get(key);
  } catch (err) {
    logger.error(`[RedisService] GET ${key} failed: ${err.message}`);
    return null;
  }
}

/**
 * Delete one or more keys.
 * @param  {...string} keys
 */
async function delCache(...keys) {
  try {
    await redis.del(...keys);
  } catch (err) {
    logger.error(`[RedisService] DEL failed: ${err.message}`);
  }
}

/**
 * Set a hash field.
 * @param {string} key
 * @param {Object} fieldValues — { field: value, ... }
 * @param {number} [ttlSeconds]
 */
async function setHash(key, fieldValues, ttlSeconds) {
  try {
    await redis.hset(key, fieldValues);
    if (ttlSeconds) {
      await redis.expire(key, ttlSeconds);
    }
  } catch (err) {
    logger.error(`[RedisService] HSET ${key} failed: ${err.message}`);
  }
}

/**
 * Get all fields of a hash.
 * @param {string} key
 * @returns {Promise<Object|null>}
 */
async function getHash(key) {
  try {
    return await redis.hgetall(key);
  } catch (err) {
    logger.error(`[RedisService] HGETALL ${key} failed: ${err.message}`);
    return null;
  }
}

/**
 * Push to a list.
 * @param {string} key
 * @param {string} value
 */
async function pushToList(key, value) {
  try {
    await redis.rpush(key, typeof value === 'string' ? value : JSON.stringify(value));
  } catch (err) {
    logger.error(`[RedisService] RPUSH ${key} failed: ${err.message}`);
  }
}

/**
 * Quick self-test — verifies Redis connectivity with SET/GET/DEL.
 * @returns {Promise<boolean>}
 */
async function selfTest() {
  const testKey = 'trafficiq:selftest';
  const testValue = 'ok';
  try {
    await redis.set(testKey, testValue, 'EX', 10);
    const result = await redis.get(testKey);
    await redis.del(testKey);
    if (result === testValue) {
      logger.info('[RedisService] Self-test passed ✓');
      return true;
    }
    logger.warn('[RedisService] Self-test failed: value mismatch');
    return false;
  } catch (err) {
    logger.error(`[RedisService] Self-test failed: ${err.message}`);
    return false;
  }
}

module.exports = {
  setCache,
  getCache,
  delCache,
  setHash,
  getHash,
  pushToList,
  selfTest,
};
