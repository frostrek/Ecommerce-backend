/**
 * Auth Controller
 *
 * Endpoints:
 *   POST  /api/auth/register       – Create account (email + password)
 *   POST  /api/auth/login           – Local login
 *   POST  /api/auth/refresh-token   – Rotate access token
 *   POST  /api/auth/logout          – Revoke refresh token & clear cookies
 *   GET   /api/auth/me              – Return current user profile (protected)
 *
 * Tokens are delivered as HttpOnly cookies so the frontend never
 * touches raw JWTs — just call the APIs and cookies travel automatically.
 *
 * For mobile / Postman:
 *   - Access token is also returned in the JSON body on login & refresh.
 *   - Send it back as `Authorization: Bearer <token>`.
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const asyncHandler = require('../middlewares/asyncHandler');
const authConfig = require('../config/auth.config');
const authRepo = require('../repositories/auth.repository');
const customersRepo = require('../repositories/customers.repository');
const { sendSuccess, sendCreated } = require('../utils/response');

// ─── Helpers ───────────────────────────────────────────────────────

/** Generate a signed access token. */
const signAccessToken = (customer) =>
    jwt.sign(
        { customer_id: customer.customer_id, email: customer.email },
        authConfig.accessToken.secret,
        { expiresIn: authConfig.accessToken.expiresIn }
    );

/** Generate a signed refresh token. */
const signRefreshToken = (customer) =>
    jwt.sign(
        { customer_id: customer.customer_id },
        authConfig.refreshToken.secret,
        { expiresIn: authConfig.refreshToken.expiresIn }
    );

/** Compute the absolute expiry date for a refresh token so we can store it in the DB. */
const refreshTokenExpiresAt = () => {
    const raw = authConfig.refreshToken.expiresIn; // e.g. '7d'
    const value = parseInt(raw, 10);
    const unit = raw.replace(/\d/g, '');
    const ms = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
    }[unit] || 24 * 60 * 60 * 1000;

    return new Date(Date.now() + value * ms);
};

/** Attach tokens as HttpOnly cookies + return them in the response body. */
const setTokenCookies = (res, accessToken, refreshToken) => {
    res.cookie('access_token', accessToken, {
        ...authConfig.cookie,
        maxAge: 15 * 60 * 1000,            // 15 min
    });
    res.cookie('refresh_token', refreshToken, {
        ...authConfig.cookie,
        maxAge: 7 * 24 * 60 * 60 * 1000,   // 7 days
        path: '/api/auth',                  // only sent to auth endpoints
    });
};

// ─── Register ──────────────────────────────────────────────────────

const register = asyncHandler(async (req, res) => {
    const { full_name, email, password, phone, date_of_birth } = req.body;

    // ── Validation ─────────────────────────────────────────────
    if (!full_name || !email || !password) {
        const err = new Error('full_name, email, and password are required');
        err.statusCode = 400;
        throw err;
    }

    if (password.length < 8) {
        const err = new Error('Password must be at least 8 characters');
        err.statusCode = 400;
        throw err;
    }

    // ── Duplicate check ────────────────────────────────────────
    const existing = await customersRepo.findByEmail(email);
    if (existing) {
        const err = new Error('An account with this email already exists');
        err.statusCode = 409;
        throw err;
    }

    // ── Create customer + auth ─────────────────────────────────
    const password_hash = await bcrypt.hash(password, authConfig.bcryptSaltRounds);
    const customer = await authRepo.createCustomerWithAuth({
        full_name,
        email,
        phone,
        date_of_birth,
        password_hash,
    });

    // ── Issue tokens ───────────────────────────────────────────
    const accessToken = signAccessToken(customer);
    const refreshToken = signRefreshToken(customer);
    await authRepo.saveRefreshToken(customer.customer_id, refreshToken, refreshTokenExpiresAt());

    setTokenCookies(res, accessToken, refreshToken);

    sendCreated(res, {
        customer: {
            customer_id: customer.customer_id,
            full_name: customer.full_name,
            email: customer.email,
        },
        access_token: accessToken,   // for mobile / Postman convenience
    }, 'Registration successful');
});

// ─── Login ─────────────────────────────────────────────────────────

const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        const err = new Error('Email and password are required');
        err.statusCode = 400;
        throw err;
    }

    // 1. Find customer
    const customer = await customersRepo.findByEmail(email);
    if (!customer) {
        const err = new Error('Invalid email or password');
        err.statusCode = 401;
        throw err;
    }

    // 2. Get auth details
    const auth = await authRepo.getAuthByCustomerId(customer.customer_id);
    if (!auth) {
        const err = new Error('No password set for this account. Try social login.');
        err.statusCode = 401;
        throw err;
    }

    // 3. Check lock
    if (auth.is_locked) {
        const err = new Error(
            `Account locked due to too many failed attempts. Try again after ${authConfig.lockDurationMinutes} minutes.`
        );
        err.statusCode = 423;
        throw err;
    }

    // 4. Verify password
    const isMatch = await bcrypt.compare(password, auth.password_hash);
    if (!isMatch) {
        await authRepo.incrementFailedAttempts(customer.customer_id, authConfig.maxFailedAttempts);
        const err = new Error('Invalid email or password');
        err.statusCode = 401;
        throw err;
    }

    // 5. Success → reset counters, issue tokens
    await authRepo.resetFailedAttempts(customer.customer_id);

    const accessToken = signAccessToken(customer);
    const refreshToken = signRefreshToken(customer);
    await authRepo.saveRefreshToken(customer.customer_id, refreshToken, refreshTokenExpiresAt());

    setTokenCookies(res, accessToken, refreshToken);

    sendSuccess(res, {
        customer: {
            customer_id: customer.customer_id,
            full_name: customer.full_name,
            email: customer.email,
        },
        access_token: accessToken,
    }, 'Login successful');
});

// ─── Refresh Token ─────────────────────────────────────────────────

const refreshTokenHandler = asyncHandler(async (req, res) => {
    // Read from cookie first, fallback to body
    const token = req.cookies?.refresh_token || req.body.refresh_token;

    if (!token) {
        const err = new Error('Refresh token is required');
        err.statusCode = 400;
        throw err;
    }

    // 1. Verify JWT signature
    let decoded;
    try {
        decoded = jwt.verify(token, authConfig.refreshToken.secret);
    } catch {
        const err = new Error('Invalid or expired refresh token. Please login again.');
        err.statusCode = 401;
        throw err;
    }

    // 2. Check DB session is still valid
    const session = await authRepo.findRefreshToken(token);
    if (!session) {
        // Token reuse detected or already revoked → revoke all (security measure)
        await authRepo.revokeAllRefreshTokens(decoded.customer_id);
        const err = new Error('Refresh token revoked. Please login again.');
        err.statusCode = 401;
        throw err;
    }

    // 3. Rotate: revoke old, issue new
    await authRepo.revokeRefreshToken(token);

    const customer = await customersRepo.findById(decoded.customer_id);
    if (!customer) {
        const err = new Error('Account not found');
        err.statusCode = 401;
        throw err;
    }

    const newAccessToken = signAccessToken(customer);
    const newRefreshToken = signRefreshToken(customer);
    await authRepo.saveRefreshToken(customer.customer_id, newRefreshToken, refreshTokenExpiresAt());

    setTokenCookies(res, newAccessToken, newRefreshToken);

    sendSuccess(res, { access_token: newAccessToken }, 'Token refreshed');
});

// ─── Logout ────────────────────────────────────────────────────────

const logout = asyncHandler(async (req, res) => {
    const token = req.cookies?.refresh_token || req.body.refresh_token;

    if (token) {
        await authRepo.revokeRefreshToken(token);
    }

    // Clear cookies regardless
    res.clearCookie('access_token', { ...authConfig.cookie });
    res.clearCookie('refresh_token', { ...authConfig.cookie, path: '/api/auth' });

    sendSuccess(res, {}, 'Logged out successfully');
});

// ─── Get Me (protected) ───────────────────────────────────────────

const getMe = asyncHandler(async (req, res) => {
    const customer = await customersRepo.findById(req.user.customer_id);
    if (!customer) {
        const err = new Error('Account not found');
        err.statusCode = 404;
        throw err;
    }

    sendSuccess(res, {
        customer_id: customer.customer_id,
        full_name: customer.full_name,
        email: customer.email,
        phone: customer.phone,
        date_of_birth: customer.date_of_birth,
        is_age_verified: customer.is_age_verified,
        is_active: customer.is_active,
        created_at: customer.created_at,
    }, 'Profile fetched');
});

// ─── Change Password (protected) ──────────────────────────────────

const changePassword = asyncHandler(async (req, res) => {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
        const err = new Error('current_password and new_password are required');
        err.statusCode = 400;
        throw err;
    }

    if (new_password.length < 8) {
        const err = new Error('New password must be at least 8 characters');
        err.statusCode = 400;
        throw err;
    }

    // 1. Verify current password
    const auth = await authRepo.getAuthByCustomerId(req.user.customer_id);
    if (!auth) {
        const err = new Error('Auth record not found');
        err.statusCode = 404;
        throw err;
    }

    const isMatch = await bcrypt.compare(current_password, auth.password_hash);
    if (!isMatch) {
        const err = new Error('Current password is incorrect');
        err.statusCode = 401;
        throw err;
    }

    // 2. Hash new password and update
    const newHash = await bcrypt.hash(new_password, authConfig.bcryptSaltRounds);
    await authRepo.updatePassword(req.user.customer_id, newHash);

    // 3. Revoke all sessions (force re-login on all devices)
    await authRepo.revokeAllRefreshTokens(req.user.customer_id);

    // 4. Issue fresh tokens for this session
    const customer = await customersRepo.findById(req.user.customer_id);
    const accessToken = signAccessToken(customer);
    const refreshToken = signRefreshToken(customer);
    await authRepo.saveRefreshToken(customer.customer_id, refreshToken, refreshTokenExpiresAt());

    setTokenCookies(res, accessToken, refreshToken);

    sendSuccess(res, { access_token: accessToken }, 'Password changed. All other sessions logged out.');
});

// ─── Deactivate Account (protected) ──────────────────────────────

const deactivateAccount = asyncHandler(async (req, res) => {
    const { password } = req.body;

    if (!password) {
        const err = new Error('Password is required to deactivate account');
        err.statusCode = 400;
        throw err;
    }

    // Verify password before deactivation
    const auth = await authRepo.getAuthByCustomerId(req.user.customer_id);
    const isMatch = await bcrypt.compare(password, auth.password_hash);
    if (!isMatch) {
        const err = new Error('Incorrect password');
        err.statusCode = 401;
        throw err;
    }

    await authRepo.deactivateAccount(req.user.customer_id);

    // Clear cookies
    res.clearCookie('access_token', { ...authConfig.cookie });
    res.clearCookie('refresh_token', { ...authConfig.cookie, path: '/api/auth' });

    sendSuccess(res, {}, 'Account deactivated. You can reactivate by contacting support.');
});

module.exports = {
    register,
    login,
    refreshToken: refreshTokenHandler,
    logout,
    getMe,
    changePassword,
    deactivateAccount,
};
