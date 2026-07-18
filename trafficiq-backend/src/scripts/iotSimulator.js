#!/usr/bin/env node
/**
 * IoT Simulator
 * Publishes fake traffic readings for all 12 intersections via MQTT.
 *
 * Usage:
 *   node src/scripts/iotSimulator.js
 *   INTERVAL_SEC=3 SCENARIO=rush node src/scripts/iotSimulator.js
 *
 * Topic: traffic/{intersectionId}/reading
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mqtt = require('mqtt');
const logger = require('../utils/logger');

const INTERVAL_SEC = parseInt(process.env.INTERVAL_SEC || '5', 10);
const SCENARIO     = process.env.SCENARIO || 'normal';

const INTERSECTION_IDS = [
  'INT-001', 'INT-002', 'INT-003', 'INT-004',
  'INT-005', 'INT-006', 'INT-007', 'INT-008',
  'INT-009', 'INT-010', 'INT-011', 'INT-012',
];

const PROFILES = {
  normal: { carsRange: [5, 25],  busesRange: [0, 3], trucksRange: [0, 3], motoRange: [3, 15] },
  rush:   { carsRange: [20, 80], busesRange: [2, 8], trucksRange: [1, 5], motoRange: [10, 40] },
  light:  { carsRange: [0, 8],   busesRange: [0, 1], trucksRange: [0, 1], motoRange: [0, 5] },
};

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function generateReading(intersectionId, scenario) {
  const p = PROFILES[scenario] || PROFILES.normal;
  const cars = randInt(...p.carsRange);
  const buses = randInt(...p.busesRange);
  const trucks = randInt(...p.trucksRange);
  const motorcycles = randInt(...p.motoRange);
  const total = cars + buses + trucks + motorcycles;

  return {
    intersectionId,
    vehicleCounts: { cars, buses, trucks, motorcycles, total },
    queueLength:       Math.min(parseFloat((total * 4.5 * randFloat(0.5, 1.2)).toFixed(1)), 300),
    averageWaitTime:   Math.min(parseFloat((total * randFloat(0.8, 2.5)).toFixed(1)), 300),
    detectionConfidence: randFloat(0.82, 0.99),
    inferenceTimeMs:     randInt(15, 180),
    timestamp:           new Date().toISOString(),
  };
}

function getCurrentScenario() {
  if (SCENARIO !== 'normal') return SCENARIO;
  const hour = new Date().getHours();
  if ((hour >= 7 && hour < 9) || (hour >= 17 && hour < 19)) return 'rush';
  if (hour >= 0 && hour < 5) return 'light';
  return 'normal';
}

const clientId = `trafficiq-simulator-${Math.random().toString(16).slice(2, 8)}`;
const client = mqtt.connect(process.env.MQTT_BROKER_URL, {
  clientId,
  username: process.env.MQTT_USERNAME || undefined,
  password: process.env.MQTT_PASSWORD || undefined,
  clean: true,
  reconnectPeriod: 3000,
  connectTimeout: 10000,
});

let publishCount = 0;
let intervalHandle = null;

function publishRound() {
  const scenario = getCurrentScenario();
  INTERSECTION_IDS.forEach((id) => {
    const reading = generateReading(id, scenario);
    client.publish(`traffic/${id}/reading`, JSON.stringify(reading), { qos: 1 }, (err) => {
      if (err) logger.error(`[IoTSimulator] Publish error for ${id}: ${err.message}`);
    });
  });
  publishCount++;
  if (publishCount % 10 === 0) {
    logger.info(`[IoTSimulator] ${publishCount} rounds published — scenario: ${scenario}`);
  }
}

client.on('connect', () => {
  logger.info(`[IoTSimulator] Connected to ${process.env.MQTT_BROKER_URL} | interval: ${INTERVAL_SEC}s | scenario: ${SCENARIO}`);
  publishRound();
  intervalHandle = setInterval(publishRound, INTERVAL_SEC * 1000);
});

client.on('error', (err) => logger.error(`[IoTSimulator] MQTT error: ${err.message}`));
client.on('offline', () => logger.warn('[IoTSimulator] MQTT offline — will retry'));
client.on('reconnect', () => logger.info('[IoTSimulator] Reconnecting...'));

function shutdown() {
  logger.info(`[IoTSimulator] Shutting down... (${publishCount} rounds published)`);
  if (intervalHandle) clearInterval(intervalHandle);
  client.end(false, {}, () => process.exit(0));
}

process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);
