/**
 * MQTT Client Module
 * Connects to a Mosquitto broker, subscribes to traffic and signal topics,
 * and provides publish/subscribe helpers.
 */

const mqtt = require('mqtt');
const logger = require('../utils/logger');

let client = null;
let isConnectedFlag = false;

// Topic patterns (using + for single-level wildcard)
const SUBSCRIBE_TOPICS = [
  'traffic/+/reading',
  'signal/+/command',
];

/**
 * Connect to the MQTT broker and subscribe to topics.
 * @returns {Promise<void>}
 */
function connectMQTT() {
  return new Promise((resolve) => {
    const options = {
      clientId: `trafficiq-backend-${Math.random().toString(16).slice(2, 8)}`,
      username: process.env.MQTT_USERNAME || undefined,
      password: process.env.MQTT_PASSWORD || undefined,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
    };

    client = mqtt.connect(process.env.MQTT_BROKER_URL, options);

    client.on('connect', () => {
      isConnectedFlag = true;
      logger.info(`[MQTT] Connected to broker: ${process.env.MQTT_BROKER_URL}`);

      // Subscribe to topics
      client.subscribe(SUBSCRIBE_TOPICS, { qos: 1 }, (err, granted) => {
        if (err) {
          logger.error(`[MQTT] Subscribe error: ${err.message}`);
        } else {
          granted.forEach((g) => {
            logger.info(`[MQTT] Subscribed to: ${g.topic} (QoS ${g.qos})`);
          });
        }
      });

      resolve();
    });

    client.on('message', (topic, payload) => {
      try {
        const message = JSON.parse(payload.toString());
        logger.debug(`[MQTT] Message on ${topic}: ${JSON.stringify(message)}`);
        handleIncomingMessage(topic, message);
      } catch (err) {
        logger.warn(`[MQTT] Failed to parse message on ${topic}: ${err.message}`);
      }
    });

    client.on('error', (err) => {
      logger.error(`[MQTT] Client error: ${err.message}`);
      isConnectedFlag = false;
    });

    client.on('offline', () => {
      logger.warn('[MQTT] Client offline');
      isConnectedFlag = false;
    });

    client.on('reconnect', () => {
      logger.info('[MQTT] Attempting reconnect...');
    });

    client.on('close', () => {
      isConnectedFlag = false;
      logger.warn('[MQTT] Connection closed');
    });

    // If connection doesn't resolve within timeout, continue anyway
    setTimeout(() => {
      if (!isConnectedFlag) {
        logger.warn('[MQTT] Connection timeout — continuing without broker');
        resolve();
      }
    }, 10000);
  });
}

/**
 * Handle incoming MQTT messages by topic pattern.
 * @param {string} topic
 * @param {Object} message
 */
function handleIncomingMessage(topic, message) {
  const parts = topic.split('/');
  // parts[0] = "traffic" or "signal"
  // parts[1] = intersectionId
  // parts[2] = "reading" or "command"

  if (parts[0] === 'traffic' && parts[2] === 'reading') {
    logger.info(`[MQTT] Traffic reading from ${parts[1]}: ${JSON.stringify(message)}`);
    // Integration with data pipeline will be wired in Day 2
  } else if (parts[0] === 'signal' && parts[2] === 'command') {
    logger.info(`[MQTT] Signal command for ${parts[1]}: ${JSON.stringify(message)}`);
  }
}

/**
 * Publish a message to an MQTT topic.
 * @param {string} topic
 * @param {Object} payload
 * @returns {boolean} — true if published, false otherwise
 */
function publish(topic, payload) {
  if (!client || !isConnectedFlag) {
    logger.warn(`[MQTT] Cannot publish — not connected. Topic: ${topic}`);
    return false;
  }

  try {
    client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
      if (err) {
        logger.error(`[MQTT] Publish error on ${topic}: ${err.message}`);
      } else {
        logger.debug(`[MQTT] Published to ${topic}`);
      }
    });
    return true;
  } catch (err) {
    logger.error(`[MQTT] Publish failed: ${err.message}`);
    return false;
  }
}

/**
 * Publish a signal command to an intersection.
 * @param {string} intersectionId
 * @param {number} phase — active phase (0-3)
 * @param {number} duration — green duration in seconds
 */
function publishSignalCommand(intersectionId, phase, duration) {
  const topic = `signal/${intersectionId}/command`;
  const payload = {
    intersectionId,
    phase,
    duration,
    timestamp: new Date().toISOString(),
  };
  return publish(topic, payload);
}

/**
 * Test publish/subscribe round-trip.
 * @returns {Promise<boolean>}
 */
async function testPubSub() {
  return new Promise((resolve) => {
    if (!client || !isConnectedFlag) {
      logger.warn('[MQTT] Test skipped — not connected');
      resolve(false);
      return;
    }

    const testTopic = 'trafficiq/test';
    const testPayload = { test: true, timestamp: Date.now() };

    client.subscribe(testTopic, { qos: 0 }, (err) => {
      if (err) {
        logger.error(`[MQTT] Test subscribe failed: ${err.message}`);
        resolve(false);
        return;
      }

      client.once('message', (topic, payload) => {
        try {
          const received = JSON.parse(payload.toString());
          if (received.test === true) {
            logger.info('[MQTT] Pub/Sub self-test passed ✓');
            client.unsubscribe(testTopic);
            resolve(true);
          }
        } catch {
          resolve(false);
        }
      });

      publish(testTopic, testPayload);

      // Timeout fallback
      setTimeout(() => {
        logger.warn('[MQTT] Pub/Sub self-test timed out');
        client.unsubscribe(testTopic);
        resolve(false);
      }, 5000);
    });
  });
}

/**
 * Check if MQTT client is connected.
 * @returns {boolean}
 */
function isMQTTConnected() {
  return isConnectedFlag;
}

module.exports = {
  connectMQTT,
  publish,
  publishSignalCommand,
  testPubSub,
  isMQTTConnected,
};
