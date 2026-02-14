/**
 * Auth Repository
 * Handles all database operations for authentication:
 *   - customer_auth   (password hashes, failed attempts, lock status)
 *   - customer_sessions (refresh tokens)
 *   - customer_social_profiles (social logins)
 *
 * Uses transactions wherever multiple tables are touched.
 */

const { query, getClient } = require('../database');

class AuthRepository {

    // ─── Registration ──────────────────────────────────────────────

    /**
     * Create a customer row + auth row inside a single transaction.
     * Returns the new customer (without the password hash).
     */
    async createCustomerWithAuth({ full_name, email, phone, date_of_birth, password_hash }) {
        const client = await getClient();
        try {
            await client.query('BEGIN');

            // 1. Insert customer
            const customerRes = await client.query(
                `INSERT INTO inventory.customers
                    (full_name, email, phone, date_of_birth)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [full_name, email, phone || null, date_of_birth || null]
            );
            const customer = customerRes.rows[0];

            // 2. Insert auth record
            await client.query(
                `INSERT INTO inventory.customer_auth
                    (customer_id, password_hash)
                 VALUES ($1, $2)`,
                [customer.customer_id, password_hash]
            );

            await client.query('COMMIT');
            return customer;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    // ─── Login helpers ─────────────────────────────────────────────

    /**
     * Fetch password hash + lock info for a given customer_id.
     */
    async getAuthByCustomerId(customerId) {
        const result = await query(
            `SELECT auth_id, customer_id, password_hash,
                    failed_attempts, is_locked, created_at
             FROM inventory.customer_auth
             WHERE customer_id = $1`,
            [customerId]
        );
        return result.rows[0] || null;
    }

    /**
     * Increment failed login attempts; lock if threshold reached.
     */
    async incrementFailedAttempts(customerId, maxAttempts) {
        await query(
            `UPDATE inventory.customer_auth
             SET failed_attempts = failed_attempts + 1,
                 is_locked = CASE WHEN failed_attempts + 1 >= $2 THEN TRUE ELSE is_locked END
             WHERE customer_id = $1`,
            [customerId, maxAttempts]
        );
    }

    /**
     * Reset failed attempts and unlock after a successful login.
     */
    async resetFailedAttempts(customerId) {
        await query(
            `UPDATE inventory.customer_auth
             SET failed_attempts = 0,
                 is_locked = FALSE,
                 last_login = NOW()
             WHERE customer_id = $1`,
            [customerId]
        );
    }

    // ─── Refresh-token session management ──────────────────────────

    /**
     * Persist a refresh token (one customer can have multiple sessions).
     */
    async saveRefreshToken(customerId, refreshToken, expiresAt) {
        await query(
            `INSERT INTO inventory.customer_sessions
                (customer_id, refresh_token, expires_at)
             VALUES ($1, $2, $3)`,
            [customerId, refreshToken, expiresAt]
        );
    }

    /**
     * Look up a valid (non-expired) session by its refresh token.
     */
    async findRefreshToken(refreshToken) {
        const result = await query(
            `SELECT * FROM inventory.customer_sessions
             WHERE refresh_token = $1 AND expires_at > NOW()`,
            [refreshToken]
        );
        return result.rows[0] || null;
    }

    /**
     * Revoke a single refresh token (logout on one device).
     */
    async revokeRefreshToken(refreshToken) {
        await query(
            'DELETE FROM inventory.customer_sessions WHERE refresh_token = $1',
            [refreshToken]
        );
    }

    /**
     * Revoke ALL refresh tokens for a customer (logout everywhere).
     */
    async revokeAllRefreshTokens(customerId) {
        await query(
            'DELETE FROM inventory.customer_sessions WHERE customer_id = $1',
            [customerId]
        );
    }

    /**
     * Housekeeping: remove expired sessions.
     */
    async cleanExpiredSessions() {
        await query('DELETE FROM inventory.customer_sessions WHERE expires_at <= NOW()');
    }

    // ─── Password management ──────────────────────────────────────

    /**
     * Update the password hash for a customer.
     */
    async updatePassword(customerId, newPasswordHash) {
        await query(
            `UPDATE inventory.customer_auth
             SET password_hash = $1
             WHERE customer_id = $2`,
            [newPasswordHash, customerId]
        );
    }

    // ─── Account management ───────────────────────────────────────

    /**
     * Deactivate a customer's account and revoke all sessions.
     */
    async deactivateAccount(customerId) {
        const client = await getClient();
        try {
            await client.query('BEGIN');
            await client.query(
                'UPDATE inventory.customers SET is_active = FALSE WHERE customer_id = $1',
                [customerId]
            );
            await client.query(
                'DELETE FROM inventory.customer_sessions WHERE customer_id = $1',
                [customerId]
            );
            await client.query('COMMIT');
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    }

    /**
     * Reactivate a customer's account.
     */
    async reactivateAccount(customerId) {
        await query(
            'UPDATE inventory.customers SET is_active = TRUE WHERE customer_id = $1',
            [customerId]
        );
    }

    // ─── Social-login helpers ──────────────────────────────────────

    /**
     * Find a customer by their social provider + provider ID.
     */
    async findBySocialProfile(provider, providerId) {
        const result = await query(
            `SELECT c.* FROM inventory.customers c
             JOIN inventory.customer_social_profiles sp
               ON c.customer_id = sp.customer_id
             WHERE sp.provider = $1 AND sp.provider_id = $2`,
            [provider, providerId]
        );
        return result.rows[0] || null;
    }

    /**
     * Link a social profile to an existing customer.
     */
    async linkSocialProfile(customerId, provider, providerId, profileData = {}) {
        const result = await query(
            `INSERT INTO inventory.customer_social_profiles
                (customer_id, provider, provider_id, profile_data)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (provider, provider_id) DO UPDATE
                SET profile_data = $4, updated_at = NOW()
             RETURNING *`,
            [customerId, provider, providerId, JSON.stringify(profileData)]
        );
        return result.rows[0];
    }
}

module.exports = new AuthRepository();
