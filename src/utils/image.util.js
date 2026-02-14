/**
 * Image Utility
 * Validates and processes base64 image data.
 * Designed for easy migration to S3 later — just swap the storage logic.
 */

const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
];

// 5MB max file size (base64 is ~33% larger than binary)
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil(MAX_FILE_SIZE_BYTES * 1.37); // base64 overhead

/**
 * Parse and validate a base64 image string.
 * Accepts formats:
 *   - "data:image/jpeg;base64,/9j/4AAQ..."  (data URI)
 *   - "/9j/4AAQ..."                          (raw base64)
 *
 * @param {string} base64String - The base64 image data
 * @param {object} options - Optional overrides for limits
 * @returns {{ base64_data, mime_type, file_size_bytes }} Parsed image data
 * @throws {Error} If validation fails
 */
function parseBase64Image(base64String, options = {}) {
    if (!base64String || typeof base64String !== 'string') {
        const err = new Error('Image data is required');
        err.statusCode = 400;
        throw err;
    }

    const maxLength = options.maxLength || MAX_BASE64_LENGTH;

    let mime_type = 'image/jpeg';
    let rawBase64 = base64String;

    // Parse data URI format: data:image/png;base64,AAAA...
    const dataUriMatch = base64String.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (dataUriMatch) {
        mime_type = dataUriMatch[1];
        rawBase64 = dataUriMatch[2];
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(mime_type)) {
        const err = new Error(
            `Unsupported image type: ${mime_type}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`
        );
        err.statusCode = 400;
        throw err;
    }

    // Validate base64 string format
    if (!/^[A-Za-z0-9+/]+=*$/.test(rawBase64.slice(0, 100))) {
        const err = new Error('Invalid base64 encoding');
        err.statusCode = 400;
        throw err;
    }

    // Check size
    if (rawBase64.length > maxLength) {
        const err = new Error(`Image too large. Maximum size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`);
        err.statusCode = 400;
        throw err;
    }

    // Calculate approximate file size from base64 length
    const file_size_bytes = Math.ceil((rawBase64.length * 3) / 4);

    // Store as full data URI for easy frontend rendering
    const base64_data = `data:${mime_type};base64,${rawBase64}`;

    return {
        base64_data,
        mime_type,
        file_size_bytes,
    };
}

/**
 * Get file extension from MIME type.
 */
function getExtensionFromMime(mimeType) {
    const map = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif',
        'image/svg+xml': 'svg',
    };
    return map[mimeType] || 'jpg';
}

module.exports = {
    parseBase64Image,
    getExtensionFromMime,
    ALLOWED_MIME_TYPES,
    MAX_FILE_SIZE_BYTES,
};
