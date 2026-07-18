/**
 * Socket.IO Service
 * Namespace: /traffic
 * Rooms: intersection:{intersectionId}
 *
 * Events emitted to clients:
 *   traffic:update   — new traffic reading
 *   signal:change    — phase changed
 *   alert:new        — new alert
 *   system:broadcast — admin announcement
 *
 * Call initSocketIO(httpServer) once from server.js.
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

let io = null;

function initSocketIO(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  const ns = io.of('/traffic');

  ns.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth && socket.handshake.auth.token
          ? socket.handshake.auth.token
          : (socket.handshake.headers.authorization || '').replace('Bearer ', '');

      if (!token) return next(new Error('Authentication error: no token'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: decoded.id, role: decoded.role };
      next();
    } catch {
      next(new Error('Authentication error: invalid or expired token'));
    }
  });

  ns.on('connection', (socket) => {
    logger.info(`[Socket.IO] Connected: ${socket.id} (user: ${socket.user && socket.user.id})`);

    socket.on('subscribe:intersection', (intersectionId) => {
      if (!intersectionId || typeof intersectionId !== 'string') return;
      socket.join(roomFor(intersectionId));
      socket.emit('subscribed', { intersectionId });
      logger.debug(`[Socket.IO] ${socket.id} joined ${roomFor(intersectionId)}`);
    });

    socket.on('unsubscribe:intersection', (intersectionId) => {
      socket.leave(roomFor(intersectionId));
    });

    socket.on('disconnect', (reason) => {
      logger.info(`[Socket.IO] Disconnected: ${socket.id} (${reason})`);
    });

    socket.on('error', (err) => {
      logger.error(`[Socket.IO] Error on ${socket.id}: ${err.message}`);
    });
  });

  logger.info('[Socket.IO] Initialized on /traffic namespace');
  return io;
}

function roomFor(intersectionId) {
  return `intersection:${intersectionId}`;
}

function getTrafficNs() {
  return io ? io.of('/traffic') : null;
}

function emitTrafficUpdate(intersectionId, data) {
  const ns = getTrafficNs();
  if (!ns) return;
  ns.to(roomFor(intersectionId)).emit('traffic:update', {
    intersectionId, data, timestamp: new Date().toISOString(),
  });
}

function emitSignalChange(intersectionId, phase, duration, source) {
  const ns = getTrafficNs();
  if (!ns) return;
  ns.to(roomFor(intersectionId)).emit('signal:change', {
    intersectionId, phase, duration, source: source || 'MARL', timestamp: new Date().toISOString(),
  });
}

function emitAlert(alert) {
  const ns = getTrafficNs();
  if (!ns) return;
  ns.to(roomFor(alert.intersectionId)).emit('alert:new', alert);
  ns.emit('alert:new', alert); // global broadcast for navbar badge
}

function broadcastSystemMessage(message, level) {
  const ns = getTrafficNs();
  if (!ns) return;
  ns.emit('system:broadcast', { message, level: level || 'info', timestamp: new Date().toISOString() });
}

async function getConnectedCount() {
  const ns = getTrafficNs();
  if (!ns) return 0;
  const sockets = await ns.fetchSockets();
  return sockets.length;
}

module.exports = {
  initSocketIO,
  emitTrafficUpdate,
  emitSignalChange,
  emitAlert,
  broadcastSystemMessage,
  getConnectedCount,
};
