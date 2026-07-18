/**
 * MQTT Service
 * Subscribes to traffic/{intersectionId}/reading, validates payloads,
 * saves TrafficReading to MongoDB, caches in Redis, emits via Socket.IO,
 * and runs alert threshold checks.
 *
 * Also runs a 60s watchdog to fire device_offline alerts.
 */

const TrafficReading = require('../models/TrafficReading');
const Intersection = require('../models/Intersection');
const { setCache } = require('./redis.service');
const { checkThresholds, createDeviceOfflineAlert } = require('./alert.service');
const { emitTrafficUpdate } = require('./socket.service');
const { publish } = require('../config/mqtt');
const logger = require('../utils/logger');

const LATEST_READING_TTL = 30; // seconds
const PHASE_STATE_TTL    = 60; // seconds
const OFFLINE_THRESHOLD_MS = 60 * 1000;

const lastSeenAt = new Map();
const knownIntersections = new Set();
let intersectionsLoaded = false;
let watchdogTimer = null;

async function ensureIntersectionsLoaded() {
  if (intersectionsLoaded) return;
  try {
    const docs = await Intersection.find({ isActive: true }, { intersectionId: 1 }).lean();
    docs.forEach((d) => knownIntersections.add(d.intersectionId));
    intersectionsLoaded = true;
    logger.info(`[MqttService] Loaded ${knownIntersections.size} active intersections`);
  } catch (err) {
    logger.error(`[MqttService] Failed to load intersections: ${err.message}`);
  }
}

async function handleTrafficReading(intersectionId, payload) {
  await ensureIntersectionsLoaded();

  if (!knownIntersections.has(intersectionId)) {
    logger.warn(`[MqttService] Unknown intersectionId: ${intersectionId}`);
    return;
  }

  const { vehicleCounts, queueLength, averageWaitTime, detectionConfidence, inferenceTimeMs } = payload;

  if (
    !vehicleCounts ||
    typeof vehicleCounts.total !== 'number' ||
    typeof queueLength !== 'number' ||
    typeof averageWaitTime !== 'number' ||
    typeof detectionConfidence !== 'number' ||
    typeof inferenceTimeMs !== 'number'
  ) {
    logger.warn(`[MqttService] Invalid payload for ${intersectionId} — skipping`);
    return;
  }

  try {
    const reading = await TrafficReading.create({
      intersectionId,
      vehicleCounts,
      queueLength,
      averageWaitTime,
      detectionConfidence,
      inferenceTimeMs,
      timestamp: new Date(),
    });

    await setCache(
      `traffic:${intersectionId}:latest`,
      { intersectionId, vehicleCounts, queueLength, averageWaitTime, detectionConfidence, inferenceTimeMs, timestamp: reading.timestamp },
      LATEST_READING_TTL,
    );

    lastSeenAt.set(intersectionId, new Date());
    emitTrafficUpdate(intersectionId, reading);
    await checkThresholds(intersectionId, { queueLength, averageWaitTime });

    logger.debug(`[MqttService] Saved reading for ${intersectionId}: ${vehicleCounts.total} vehicles`);
  } catch (err) {
    logger.error(`[MqttService] Error saving reading for ${intersectionId}: ${err.message}`);
  }
}

async function publishSignalCommand(intersectionId, phase, duration, source) {
  const topic = `signal/${intersectionId}/command`;
  const payload = { intersectionId, phase, duration, source: source || 'MARL', timestamp: new Date().toISOString() };
  const sent = publish(topic, payload);
  if (sent) {
    await setCache(`signal:${intersectionId}:phase`, { phase, duration, source }, PHASE_STATE_TTL);
    logger.info(`[MqttService] Signal command: ${intersectionId} -> phase ${phase} (${duration}s) [${source || 'MARL'}]`);
  }
  return sent;
}

async function runOfflineWatchdog() {
  const now = Date.now();
  for (const id of knownIntersections) {
    const last = lastSeenAt.get(id);
    if (last && now - last.getTime() > OFFLINE_THRESHOLD_MS) {
      logger.warn(`[MqttService] Watchdog: ${id} offline (${Math.round((now - last.getTime()) / 1000)}s ago)`);
      await createDeviceOfflineAlert(id);
    }
  }
}

async function initMqttService() {
  await ensureIntersectionsLoaded();
  if (watchdogTimer) clearInterval(watchdogTimer);
  watchdogTimer = setInterval(runOfflineWatchdog, OFFLINE_THRESHOLD_MS);
  logger.info('[MqttService] Initialized — offline watchdog active');
  return { handleTrafficReading };
}

module.exports = { initMqttService, handleTrafficReading, publishSignalCommand };
