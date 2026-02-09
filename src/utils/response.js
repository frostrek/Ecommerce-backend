/**
 * Standard API Response Helpers
 * Provides consistent response format across all endpoints
 */
const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
    res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};

const sendCreated = (res, data, message = 'Created successfully') => {
    res.status(201).json({
        success: true,
        message,
        data,
    });
};

const sendError = (res, message = 'Error', statusCode = 500, errors = null) => {
    res.status(statusCode).json({
        success: false,
        message,
        ...(errors && { errors }),
    });
};

const sendNotFound = (res, resource = 'Resource') => {
    res.status(404).json({
        success: false,
        message: `${resource} not found`,
    });
};

module.exports = {
    sendSuccess,
    sendCreated,
    sendError,
    sendNotFound,
};
