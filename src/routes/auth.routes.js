const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const { authLimiter } = require('../middlewares/rateLimiter');
const {
    register,
    login,
    refreshToken,
    logout,
    getMe,
    changePassword,
    deactivateAccount,
} = require('../controllers/auth.controller');

// ─── Public routes (rate-limited to prevent brute force) ───────────
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

// ─── Protected routes ─────────────────────────────────────────────
router.get('/me', authenticate, getMe);
router.put('/change-password', authenticate, authLimiter, changePassword);
router.post('/deactivate', authenticate, deactivateAccount);

module.exports = router;
