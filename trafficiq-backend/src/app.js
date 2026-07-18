/**
 * Express Application Configuration
 * Sets up middleware, routes, and health endpoint.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { requestLogger } = require('./utils/logger');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

const app = express();

// -- Security Middleware -----------------------------------------

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// -- Rate Limiting -----------------------------------------------
// Baseline general limiter on all /api/ routes.
// Stricter per-route limiters are applied inside route files.
const { generalLimiter } = require('./middleware/rateLimiter.middleware');
app.use('/api/', generalLimiter);

// Parse cookies (refresh token httpOnly cookie)
app.use(cookieParser());

// -- Request Logging --------------------------------------------
app.use(requestLogger);

// -- Health Check (public, no auth) ----------------------------
const { isConnected: isMongoConnected } = require('./config/db');
const { isRedisConnected }              = require('./config/redis');
const { isMQTTConnected }               = require('./config/mqtt');

app.get('/health', (req, res) => {
  const mongoOk = isMongoConnected();
  const redisOk = isRedisConnected();
  const mqttOk  = isMQTTConnected();
  const allHealthy = mongoOk && redisOk && mqttOk;

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      mongodb: { status: mongoOk ? 'connected' : 'disconnected' },
      redis:   { status: redisOk ? 'connected' : 'disconnected' },
      mqtt:    { status: mqttOk  ? 'connected' : 'disconnected' },
    },
    environment: process.env.NODE_ENV || 'development',
  });
});

// -- API Routes -------------------------------------------------
// All routes are combined in routes/index.js
app.use('/api/v1', require('./routes/index'));

// Convenience ping (no auth)
app.get('/api/v1/ping', (req, res) => {
  res.json({ message: 'TrafficIQ API is running', timestamp: new Date().toISOString() });
});

// -- 404 + Global Error Handler ---------------------------------
// Must be AFTER all routes
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
