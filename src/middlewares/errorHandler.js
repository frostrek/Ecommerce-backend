/**
 * Global Error Handler Middleware
 * Catches all errors and returns consistent JSON response
 */
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);

    // PostgreSQL specific error handling
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // Handle PostgreSQL unique constraint violation
    if (err.code === '23505') {
        statusCode = 400;
        message = 'Duplicate entry. This record already exists.';
    }

    // Handle PostgreSQL foreign key violation
    if (err.code === '23503') {
        statusCode = 400;
        message = 'Referenced record does not exist.';
    }

    // Handle PostgreSQL invalid UUID
    if (err.code === '22P02') {
        statusCode = 400;
        message = 'Invalid ID format.';
    }

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};

/**
 * Not Found Handler
 * Returns 404 for undefined routes
 */
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
};

module.exports = { errorHandler, notFoundHandler };
