/**
 * Auth Routes
 * POST   /api/v1/auth/register
 * POST   /api/v1/auth/login
 * POST   /api/v1/auth/refresh
 * POST   /api/v1/auth/logout
 * GET    /api/v1/auth/me
 */

const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate, schemas } = require('../middleware/validate.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');
const { auditLog } = require('../middleware/audit.middleware');

router.post('/register', authLimiter, validate(schemas.register), authController.register);
router.post('/login',    authLimiter, validate(schemas.login),    authController.login);
router.post('/refresh',  authController.refreshToken);
router.post('/logout',   authenticate, auditLog, authController.logout);
router.get('/me',        authenticate, authController.getMe);

module.exports = router;
