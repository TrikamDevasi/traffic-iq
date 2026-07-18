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
const { initSocketIO } = require('./src/services/socket.service');
const { initMqttService, handleTrafficReading } = require('./src/services/mqtt.service');

const PORT = process.env.PORT || 5000;

// ── HTTP Server + Socket.IO ─────────────────────────────────────
const server = http.createServer(app);

// Initialize Socket.IO on the HTTP server
initSocketIO(server);

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

    // Wire MQTT service: warm intersection cache, start offline watchdog
    const mqttHandlers = await initMqttService();

    // Patch config/mqtt.js to delegate traffic readings to our service
    // We do this by overriding the module-level handler via the event emitter
    // exposed by config/mqtt — re-wire via the client's message event.
    // The cleanest approach: re-export handleTrafficReading for mqtt.js to call.
    // mqtt.js handleIncomingMessage already has the routing logic —
    // we register our handler so it's called on each traffic/{id}/reading message.
    require('./src/config/mqtt').onTrafficReading = mqttHandlers.handleTrafficReading;
    logger.info('[BOOT] MQTT service handlers registered');
  } catch (err) {
    logger.warn(`[BOOT] MQTT unavailable — running in degraded mode: ${err.message}`);
  }

  // 4. Start HTTP server (always)
  const serverInst = server.listen(PORT, () => {
    logger.info(`[BOOT] TrafficIQ Backend running on port ${PORT}`);
    logger.info(`[BOOT] Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`[BOOT] Health check: http://localhost:${PORT}/health`);
  });

  serverInst.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`[BOOT] Port ${PORT} already in use. Stop the existing process or change PORT in .env`);
      process.exit(1);
    } else {
      logger.error(`[BOOT] Server error: ${err.message}`);
      process.exit(1);
    }
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
