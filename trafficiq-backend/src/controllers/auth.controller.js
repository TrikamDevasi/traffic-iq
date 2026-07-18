/**
 * Auth Controller
 * register, login, refreshToken, logout, getMe.
 * Token strategy: access token (15min in body) + refresh token (7d httpOnly cookie).
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { setCache, getCache, delCache } = require('../services/redis.service');

const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

function sessionKey(userId) { return `session:${userId}`; }

function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  });
}

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body;
    const safeRole = role === 'admin' ? 'viewer' : (role || 'viewer');

    const existing = await User.findOne({ email });
    if (existing) return ApiResponse.error(res, 'Email is already registered', 409);

    const user = await User.create({ name, email, password, role: safeRole });
    const accessToken = signAccessToken({ id: user._id, role: user.role });
    const refreshToken = signRefreshToken({ id: user._id });

    await setCache(sessionKey(user._id), refreshToken, SESSION_TTL);
    setRefreshCookie(res, refreshToken);
    logger.info(`[Auth] New user registered: ${email} (${safeRole})`);

    return ApiResponse.success(res, 'Registration successful', { accessToken, user }, 201);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return ApiResponse.error(res, 'Validation failed', 422, messages);
    }
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user) return ApiResponse.error(res, 'Invalid email or password', 401);
    if (!user.isActive) return ApiResponse.error(res, 'Account deactivated — contact an admin', 403);

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return ApiResponse.error(res, 'Invalid email or password', 401);

    user.lastLogin = new Date();
    await user.save();

    const accessToken = signAccessToken({ id: user._id, role: user.role });
    const refreshToken = signRefreshToken({ id: user._id });

    await setCache(sessionKey(user._id), refreshToken, SESSION_TTL);
    setRefreshCookie(res, refreshToken);
    logger.info(`[Auth] Login: ${email}`);

    return ApiResponse.success(res, 'Login successful', { accessToken, user });
  } catch (err) {
    next(err);
  }
}

async function refreshToken(req, res, next) {
  try {
    const token = req.cookies && req.cookies.refreshToken;
    if (!token) return ApiResponse.error(res, 'No refresh token provided', 401);

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    } catch {
      return ApiResponse.error(res, 'Invalid or expired refresh token', 401);
    }

    const stored = await getCache(sessionKey(decoded.id));
    if (!stored || stored !== token) {
      return ApiResponse.error(res, 'Session expired — please log in again', 401);
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) return ApiResponse.error(res, 'User not found or deactivated', 401);

    const accessToken = signAccessToken({ id: user._id, role: user.role });
    return ApiResponse.success(res, 'Token refreshed', { accessToken });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const token = req.cookies && req.cookies.refreshToken;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
        await delCache(sessionKey(decoded.id));
      } catch {
        // Already expired — just clear cookie
      }
    }
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    return ApiResponse.success(res, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return ApiResponse.error(res, 'User not found', 404);
    return ApiResponse.success(res, 'User retrieved', user);
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refreshToken, logout, getMe };
