/**
 * Rate Limiting Middleware
 *
 * Prevents brute-force attacks and API abuse.
 * Three tiers:
 *   - globalLimiter:  100 req / 15 min per IP  (catch-all)
 *   - authLimiter:      5 req / 15 min per IP  (login, register, password changes)
 *   - apiLimiter:      30 req /  1 min per IP  (general API endpoints)
 */

const rateLimit = require('express-rate-limit');

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 100,
    standardHeaders: true,       // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false,        // Disable `X-RateLimit-*` headers
    message: {
        success: false,
        message: 'Too many requests from this IP. Please try again after 15 minutes.',
    },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many authentication attempts. Please try again after 15 minutes.',
    },
});

const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,    // 1 minute
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests. Please slow down.',
    },
});

module.exports = { globalLimiter, authLimiter, apiLimiter };
