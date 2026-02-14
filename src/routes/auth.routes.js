const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const {
    register,
    login,
    refreshToken,
    logout,
    getMe,
} = require('../controllers/auth.controller');

// ─── Public routes ─────────────────────────────────────────────────
router.post('/register', register);           // POST /api/auth/register
router.post('/login', login);                 // POST /api/auth/login
router.post('/refresh-token', refreshToken);  // POST /api/auth/refresh-token
router.post('/logout', logout);               // POST /api/auth/logout

// ─── Protected routes ─────────────────────────────────────────────
router.get('/me', authenticate, getMe);       // GET  /api/auth/me

module.exports = router;
