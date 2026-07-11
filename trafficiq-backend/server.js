/**
 * TrafficIQ Backend — Entry Point
 * Initializes environment validation, connects all infrastructure,
 * starts the Express server with Socket.IO.
 */

require('dotenv').config();

// ── Validate Environment ─────────────────────────────────────────
const validateEnv = require('./src/config/env');
validateEnv();

// ── Imports ──────────────────────────────────────────────────────
const http = require('http');
const app = require('./src/app');
const logger = require('./src/utils/logger');
const { connectDB } = require('./src/config/db');
const { connectRedis, isRedisConnected } = require('./src/config/redis');
const { connectMQTT } = require('./src/config/mqtt');
const { selfTest: redisSelfTest } = require('./src/services/redis.service');

const PORT = process.env.PORT || 5000;

// ── HTTP Server + Socket.IO ─────────────────────────────────────
const server = http.createServer(app);

// Socket.IO will be initialized in Day 2
// const { Server } = require('socket.io');
// const io = new Server(server, { cors: { origin: process.env.CLIENT_URL } });

// ── Bootstrap ────────────────────────────────────────────────────

async function startServer() {
  // 1. Connect MongoDB (non-fatal — server starts in degraded mode if unavailable)
  try {
    logger.info('[BOOT] Connecting to MongoDB...');
    await connectDB();
  } catch (err) {
    logger.warn(`[BOOT] MongoDB unavailable — running in degraded mode: ${err.message}`);
  }

  // 2. Connect Redis (non-fatal)
  try {
    logger.info('[BOOT] Connecting to Redis...');
    await connectRedis();
    await new Promise((r) => setTimeout(r, 500));
    if (isRedisConnected()) {
      await redisSelfTest();
    } else {
      logger.warn('[BOOT] Redis not connected — self-test skipped');
    }
  } catch (err) {
    logger.warn(`[BOOT] Redis unavailable — running in degraded mode: ${err.message}`);
  }

  // 3. Connect MQTT (non-fatal)
  try {
    logger.info('[BOOT] Connecting to MQTT broker...');
    await connectMQTT();
  } catch (err) {
    logger.warn(`[BOOT] MQTT unavailable — running in degraded mode: ${err.message}`);
  }

  // 4. Start HTTP server (always)
  server.listen(PORT, () => {
    logger.info(`[BOOT] TrafficIQ Backend running on port ${PORT}`);
    logger.info(`[BOOT] Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`[BOOT] Health check: http://localhost:${PORT}/health`);
  });
}

// ── Graceful Shutdown ────────────────────────────────────────────

process.on('SIGTERM', async () => {
  logger.info('[BOOT] SIGTERM received — shutting down gracefully');
  server.close(() => {
    const mongoose = require('mongoose');
    mongoose.connection.close();
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason) => {
  logger.error('[BOOT] Unhandled Promise Rejection:', { reason: reason?.message || reason });
});

startServer();
