/**
 * Alert Service
 * Creates Alert documents when traffic thresholds are breached.
 * Deduplication: skips creation if an identical unresolved alert exists.
 *
 * Thresholds:
 *   queueLength     > 50 m  -> congestion (medium)
 *   averageWaitTime > 120 s -> high_wait_time (high)
 */

const Alert = require('../models/Alert');
const logger = require('../utils/logger');

function getSocketService() {
  // Lazy require to avoid circular dependency
  return require('./socket.service'); // eslint-disable-line global-require
}

const THRESHOLDS = {
  queueLength:     { value: 50,  type: 'congestion',     severity: 'medium' },
  averageWaitTime: { value: 120, type: 'high_wait_time', severity: 'high'   },
};

async function isDuplicate(intersectionId, type) {
  const existing = await Alert.findOne({ intersectionId, type, isResolved: false });
  return !!existing;
}

async function createAlert({ intersectionId, type, severity, message }) {
  try {
    if (await isDuplicate(intersectionId, type)) {
      logger.debug(`[AlertService] Duplicate suppressed: ${type} @ ${intersectionId}`);
      return null;
    }
    const alert = await Alert.create({ intersectionId, type, severity, message });
    logger.info(`[AlertService] Created [${severity}] ${type} @ ${intersectionId}`);
    try { getSocketService().emitAlert(alert); } catch (e) { /* socket not ready */ }
    return alert;
  } catch (err) {
    logger.error(`[AlertService] createAlert failed: ${err.message}`);
    return null;
  }
}

async function resolveAlert(alertId, resolvedById) {
  try {
    const alert = await Alert.findByIdAndUpdate(
      alertId,
      { isResolved: true, resolvedBy: resolvedById, resolvedAt: new Date() },
      { new: true },
    );
    if (alert) logger.info(`[AlertService] Resolved: ${alertId}`);
    return alert;
  } catch (err) {
    logger.error(`[AlertService] resolveAlert failed: ${err.message}`);
    return null;
  }
}

async function checkThresholds(intersectionId, reading) {
  const checks = [
    {
      condition: reading.queueLength > THRESHOLDS.queueLength.value,
      type: THRESHOLDS.queueLength.type,
      severity: THRESHOLDS.queueLength.severity,
      message: `Queue length ${reading.queueLength}m exceeds ${THRESHOLDS.queueLength.value}m at ${intersectionId}`,
    },
    {
      condition: reading.averageWaitTime > THRESHOLDS.averageWaitTime.value,
      type: THRESHOLDS.averageWaitTime.type,
      severity: THRESHOLDS.averageWaitTime.severity,
      message: `Wait time ${reading.averageWaitTime}s exceeds ${THRESHOLDS.averageWaitTime.value}s at ${intersectionId}`,
    },
  ];
  for (const check of checks) {
    if (check.condition) await createAlert({ intersectionId, ...check });
  }
}

async function createDeviceOfflineAlert(intersectionId) {
  await createAlert({
    intersectionId,
    type: 'device_offline',
    severity: 'critical',
    message: `Edge device at ${intersectionId} has not reported in 60 seconds`,
  });
}

module.exports = { createAlert, resolveAlert, checkThresholds, createDeviceOfflineAlert, THRESHOLDS };
