/**
 * Global Error Handler Middleware
 *
 * - In DEVELOPMENT: returns full error message + stack trace
 * - In PRODUCTION:  returns sanitized message, logs full error server-side
 *
 * Handles PostgreSQL-specific error codes gracefully.
 */
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
    // Always log the full error server-side
    logger.error(`[${req.method}] ${req.originalUrl} — ${err.message}`);
    if (process.env.NODE_ENV === 'development') {
        logger.debug('Stack:', err.stack);
    }

    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // ── PostgreSQL Error Codes ──────────────────────────────────
    if (err.code === '23505') {
        statusCode = 400;
        message = 'Duplicate entry. This record already exists.';
    } else if (err.code === '23503') {
        statusCode = 400;
        message = 'Referenced record does not exist.';
    } else if (err.code === '22P02') {
        statusCode = 400;
        message = 'Invalid ID format.';
    }

    // ── Sanitize in production: never leak raw DB / internal errors ──
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
        message = 'An unexpected error occurred. Please try again later.';
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

/** Returns 404 for undefined routes */
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
};

module.exports = { errorHandler, notFoundHandler };