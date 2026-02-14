/**
 * Authentication Configuration
 * Centralises all JWT / cookie settings so nothing is hard-coded elsewhere.
 *
 * Required .env vars:
 *   JWT_ACCESS_SECRET   – secret for access tokens  (min 32 chars recommended)
 *   JWT_REFRESH_SECRET  – secret for refresh tokens  (different from access!)
 */

// ── Fail fast in production if secrets are weak or missing ──────────
if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET.length < 32) {
        console.error('FATAL: JWT_ACCESS_SECRET must be set and at least 32 characters in production.');
        process.exit(1);
    }
    if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
        console.error('FATAL: JWT_REFRESH_SECRET must be set and at least 32 characters in production.');
        process.exit(1);
    }
}

module.exports = {
    /* ---- JWT Tokens ---- */
    accessToken: {
        secret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
        expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
    },
    refreshToken: {
        secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
        expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
    },

    /* ---- Cookie Settings ---- */
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/',
    },

    /* ---- bcrypt ---- */
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,

    /* ---- Security ---- */
    maxFailedAttempts: 5,
    lockDurationMinutes: 30,

    /* ---- Supported Social Providers (future-ready) ---- */
    socialProviders: ['google', 'facebook', 'apple'],
};
