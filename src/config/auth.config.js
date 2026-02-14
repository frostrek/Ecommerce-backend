/**
 * Authentication Configuration
 * Centralises all JWT / cookie settings so nothing is hard-coded elsewhere.
 *
 * Required .env vars:
 *   JWT_ACCESS_SECRET   – secret for access tokens
 *   JWT_REFRESH_SECRET  – secret for refresh tokens  (different from access!)
 */

module.exports = {
    /* ---- JWT Tokens ---- */
    accessToken: {
        secret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
        expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',   // short-lived
    },
    refreshToken: {
        secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
        expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',   // long-lived
    },

    /* ---- Cookie Settings ---- */
    cookie: {
        httpOnly: true,                                       // JS cannot read
        secure: process.env.NODE_ENV === 'production',        // HTTPS only in prod
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        path: '/',
    },

    /* ---- bcrypt ---- */
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,

    /* ---- Security ---- */
    maxFailedAttempts: 5,                                     // lock after N bad passwords
    lockDurationMinutes: 30,                                  // auto-unlock timer

    /* ---- Supported Social Providers (future-ready) ---- */
    socialProviders: ['google', 'facebook', 'apple'],
};
