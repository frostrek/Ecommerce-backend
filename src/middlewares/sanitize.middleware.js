/**
 * Input Sanitization Middleware
 *
 * Strips HTML tags from all string values in req.body
 * to prevent stored XSS attacks via product names,
 * descriptions, reviews, customer names, etc.
 *
 * Does NOT affect non-string fields (numbers, booleans, arrays, objects).
 * Recursively sanitizes nested objects.
 */

const stripHtml = (str) =>
    str.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();

const sanitizeValue = (value) => {
    if (typeof value === 'string') {
        return stripHtml(value);
    }
    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }
    if (value && typeof value === 'object') {
        return sanitizeObject(value);
    }
    return value;
};

const sanitizeObject = (obj) => {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeValue(value);
    }
    return sanitized;
};

const sanitizeInput = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }
    if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query);
    }
    if (req.params && typeof req.params === 'object') {
        req.params = sanitizeObject(req.params);
    }
    next();
};

module.exports = { sanitizeInput };
