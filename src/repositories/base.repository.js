const { query } = require('../database');

/* Base Repository - Shared database operations
 * Extend this class for specific entity repositories
 */
class BaseRepository {
    constructor(tableName, primaryKey = 'id') {
        this.tableName = tableName;
        this.primaryKey = primaryKey;
    }

    /* Find all records with optional filtering */
    async findAll(options = {}) {
        const { limit = 100, offset = 0, orderBy = 'created_at', order = 'DESC' } = options;

        // Prevent SQL Injection: Validate order direction
        const validOrderIndex = ['ASC', 'DESC'].indexOf(order.toUpperCase());
        const sortOrder = validOrderIndex !== -1 ? order.toUpperCase() : 'DESC';

        // Prevent SQL Injection: Validate orderBy column (simple alphanumeric check)
        // ideally, subclasses should provide a whitelist of allowed columns
        if (!/^[a-zA-Z0-9_]+$/.test(orderBy)) {
            throw new Error('Invalid sort column');
        }

        const result = await query(
            `SELECT * FROM ${this.tableName} ORDER BY "${orderBy}" ${sortOrder} LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        return result.rows;
    }

    /* Find a single record by primary key */
    async findById(id) {
        const result = await query(
            `SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = $1`,
            [id]
        );
        return result.rows[0] || null;
    }

    /* Find records by a specific field */
    async findBy(field, value) {
        const result = await query(
            `SELECT * FROM ${this.tableName} WHERE ${field} = $1`,
            [value]
        );
        return result.rows;
    }

    /* Create a new record */
    async create(data) {
        const keys = Object.keys(data);
        const values = Object.values(data).map(val => val === undefined ? null : val);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const columns = keys.join(', ');

        const result = await query(
            `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders}) RETURNING *`,
            values
        );
        return result.rows[0];
    }

    /* Update a record by primary key */
    async update(id, data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');

        const result = await query(
            `UPDATE ${this.tableName} SET ${setClause}, updated_at = NOW() WHERE ${this.primaryKey} = $${keys.length + 1} RETURNING *`,
            [...values, id]
        );
        return result.rows[0] || null;
    }

    /* Delete a record by primary key */
    async delete(id) {
        const result = await query(
            `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1 RETURNING *`,
            [id]
        );
        return result.rows[0] || null;
    }

    async count() {
        const result = await query(`SELECT COUNT(*) FROM ${this.tableName}`);
        return parseInt(result.rows[0].count, 10);
    }
}

module.exports = BaseRepository;
