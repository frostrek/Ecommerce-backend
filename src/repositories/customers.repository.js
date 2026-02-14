const BaseRepository = require('./base.repository');
const { query } = require('../database');

class CustomersRepository extends BaseRepository {
    constructor() {
        super('inventory.customers', 'customer_id');
    }

    /**
     * Create a new customer profile.
     */
    async create(data) {
        const { full_name, email, phone, date_of_birth } = data;
        const result = await query(
            `INSERT INTO inventory.customers 
            (full_name, email, phone, date_of_birth)
            VALUES ($1, $2, $3, $4)
            RETURNING *`,
            [full_name, email, phone, date_of_birth]
        );
        return result.rows[0];
    }

    async findByEmail(email) {
        const result = await query(
            'SELECT * FROM inventory.customers WHERE email = $1',
            [email]
        );
        return result.rows[0] || null;
    }

    /**
     * Add a new address for a customer.
     * Handles setting is_default logic (if new address is default, unset others).
     */
    async addAddress(customerId, addressData) {
        const client = await require('../database').pool.connect();
        try {
            await client.query('BEGIN');

            const {
                address_line1, address_line2, city, state, pincode, country, is_default
            } = addressData;

            // If this is set as default, unset other default addresses for this customer
            if (is_default) {
                await client.query(
                    'UPDATE inventory.customer_addresses SET is_default = FALSE WHERE customer_id = $1',
                    [customerId]
                );
            }

            const result = await client.query(
                `INSERT INTO inventory.customer_addresses 
                (customer_id, address_line1, address_line2, city, state, pincode, country, is_default)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *`,
                [customerId, address_line1, address_line2, city, state, pincode, country || 'India', is_default || false]
            );

            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get all addresses for a customer.
     */
    async getAddresses(customerId) {
        const result = await query(
            'SELECT * FROM inventory.customer_addresses WHERE customer_id = $1 ORDER BY is_default DESC, created_at DESC',
            [customerId]
        );
        return result.rows;
    }

    /**
     * Update an address.
     */
    async updateAddress(addressId, customerId, addressData) {
        const client = await require('../database').pool.connect();
        try {
            await client.query('BEGIN');

            const {
                address_line1, address_line2, city, state, pincode, country, is_default
            } = addressData;

            // If setting as default, unset others
            if (is_default) {
                await client.query(
                    'UPDATE inventory.customer_addresses SET is_default = FALSE WHERE customer_id = $1',
                    [customerId]
                );
            }

            // Build update query dynamically
            const fields = [];
            const values = [];
            let idx = 1;

            if (address_line1 !== undefined) { fields.push(`address_line1 = $${idx++}`); values.push(address_line1); }
            if (address_line2 !== undefined) { fields.push(`address_line2 = $${idx++}`); values.push(address_line2); }
            if (city !== undefined) { fields.push(`city = $${idx++}`); values.push(city); }
            if (state !== undefined) { fields.push(`state = $${idx++}`); values.push(state); }
            if (pincode !== undefined) { fields.push(`pincode = $${idx++}`); values.push(pincode); }
            if (country !== undefined) { fields.push(`country = $${idx++}`); values.push(country); }
            if (is_default !== undefined) { fields.push(`is_default = $${idx++}`); values.push(is_default); }

            if (fields.length === 0) {
                await client.query('ROLLBACK');
                return null; // Nothing to update
            }

            values.push(addressId);
            values.push(customerId);

            const result = await client.query(
                `UPDATE inventory.customer_addresses 
                 SET ${fields.join(', ')} 
                 WHERE address_id = $${idx++} AND customer_id = $${idx++}
                 RETURNING *`,
                values
            );

            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Delete an address.
     */
    async deleteAddress(addressId, customerId) {
        const result = await query(
            'DELETE FROM inventory.customer_addresses WHERE address_id = $1 AND customer_id = $2 RETURNING *',
            [addressId, customerId]
        );
        return result.rows[0];
    }

    /**
     * Verify customer age.
     * Updates DOB and sets is_age_verified flag.
     */
    async verifyAge(customerId, dateOfBirth) {
        // Calculate age
        const dob = new Date(dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
            age--;
        }

        const isVerified = age >= 18; // Minimum age 18

        /* 
           If age < 18, we can either throw error or just set flag to false.
           Req says "Age Gate", so usually strict. 
           But let's persist the DOB and the result flag.
        */

        const result = await query(
            `UPDATE inventory.customers 
             SET date_of_birth = $1, is_age_verified = $2, updated_at = NOW()
             WHERE customer_id = $3
             RETURNING *`,
            [dateOfBirth, isVerified, customerId]
        );

        if (!isVerified) {
            const error = new Error('User must be 18 or older');
            error.statusCode = 403;
            // We still return the updated user object so the frontend knows it failed
            // But usually for API we might want to throw
            throw error;
        }

        return result.rows[0];
    }
}

module.exports = new CustomersRepository();
