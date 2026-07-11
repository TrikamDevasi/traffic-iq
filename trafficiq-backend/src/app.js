/**
 * Express Application Configuration
 * Sets up middleware, routes, and health endpoint.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { requestLogger } = require('./utils/logger');

const app = express();

// ── Security Middleware ──────────────────────────────────────────

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate Limiting ────────────────────────────────────────────────

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

app.use('/api/', generalLimiter);

// ── Request Logging ──────────────────────────────────────────────

app.use(requestLogger);

// ── Health Check Endpoint ────────────────────────────────────────

const { isConnected: isMongoConnected } = require('./config/db');
const { isRedisConnected } = require('./config/redis');
const { isMQTTConnected } = require('./config/mqtt');

app.get('/health', async (req, res) => {
  const mongoOk = isMongoConnected();
  const redisOk = isRedisConnected();
  const mqttOk = isMQTTConnected();

  const allHealthy = mongoOk && redisOk && mqttOk;

  const status = {
    status: allHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      mongodb: {
        status: mongoOk ? 'connected' : 'disconnected',
      },
      redis: {
        status: redisOk ? 'connected' : 'disconnected',
      },
      mqtt: {
        status: mqttOk ? 'connected' : 'disconnected',
      },
    },
    environment: process.env.NODE_ENV || 'development',
  };

  res.status(allHealthy ? 200 : 503).json(status);
});

// ── API Routes (placeholder — will be wired in Day 2-3) ──────────

app.get('/api/v1/ping', (req, res) => {
  res.json({ message: 'TrafficIQ API is running', timestamp: new Date().toISOString() });
});

// ── 404 Handler ──────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

// ── Global Error Handler ─────────────────────────────────────────

app.use((err, req, res, _next) => {
  const logger = require('./utils/logger');
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

module.exports = app;
