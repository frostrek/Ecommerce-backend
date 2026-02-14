/**
 * Authentication Middleware
 *
 * Reads the access token from:
 *   1. HttpOnly cookie  `access_token`   (preferred – browser clients)
 *   2. Authorization header  `Bearer <token>`  (mobile / Postman / external)
 *
 * On success  → attaches `req.user` with { customer_id, email }
 * On failure  → returns 401 Unauthorized
 */

const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth.config');

/**
 * Require a valid access token.
 */
const authenticate = (req, res, next) => {
    // 1. Try cookie first, then Authorization header
    let token = req.cookies?.access_token;

    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required. Please login.',
        });
    }

    try {
        const decoded = jwt.verify(token, authConfig.accessToken.secret);
        req.user = {
            customer_id: decoded.customer_id,
            email: decoded.email,
        };
        next();
    } catch (err) {
        // Differentiate between expired and invalid tokens for the frontend
        const message =
            err.name === 'TokenExpiredError'
                ? 'Access token expired. Please refresh.'
                : 'Invalid access token.';

        return res.status(401).json({ success: false, message });
    }
};

/**
 * Optional auth – attaches req.user if a valid token exists but does NOT block.
 * Useful for endpoints that behave differently for logged-in users (e.g. "is this in my wishlist?").
 */
const optionalAuth = (req, res, next) => {
    let token = req.cookies?.access_token;
    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.split(' ')[1];
        }
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, authConfig.accessToken.secret);
            req.user = {
                customer_id: decoded.customer_id,
                email: decoded.email,
            };
        } catch {
            // token invalid/expired – proceed as guest
        }
    }
    next();
};

module.exports = { authenticate, optionalAuth };
