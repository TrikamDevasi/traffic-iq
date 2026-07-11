/**
 * MongoDB Connection Module
 * Connects to MongoDB Atlas with retry logic, connection pooling,
 * and event listeners for connected/error/disconnected states.
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const MONGO_OPTIONS = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4, // Use IPv4, skip IPv6
};

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

let retryCount = 0;

/**
 * Connect to MongoDB with retry logic.
 * @param {number} retriesLeft — number of retries remaining
 * @returns {Promise<typeof mongoose>}
 */
async function connectDB(retriesLeft = MAX_RETRIES) {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, MONGO_OPTIONS);
    retryCount = 0;
    logger.info(`[MongoDB] Connected: ${conn.connection.host}:${conn.connection.port}/${conn.connection.name}`);
    return conn;
  } catch (err) {
    if (retriesLeft > 0) {
      retryCount++;
      logger.warn(`[MongoDB] Connection attempt failed. Retrying in ${RETRY_DELAY_MS / 1000}s... (${MAX_RETRIES - retriesLeft + 1}/${MAX_RETRIES})`);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      return connectDB(retriesLeft - 1);
    }
    logger.error(`[MongoDB] Failed to connect after ${MAX_RETRIES} retries: ${err.message}`);
    return null;
  }
}

// ── Event Listeners ──────────────────────────────────────────────

mongoose.connection.on('connected', () => {
  logger.info('[MongoDB] Mongoose connected to DB');
});

mongoose.connection.on('error', (err) => {
  logger.error(`[MongoDB] Mongoose connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('[MongoDB] Mongoose disconnected from DB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  logger.info('[MongoDB] Connection closed due to app termination');
  process.exit(0);
});

/**
 * Check if MongoDB is connected.
 * @returns {boolean}
 */
function isConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = { connectDB, isConnected };
