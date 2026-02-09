/**
 * Async Handler Middleware
 * Wraps async route handlers to catch errors and pass them to error handler
 * Eliminates the need for try/catch blocks in every controller
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
