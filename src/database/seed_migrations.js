const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { pool } = require('./index');

const seedMigrations = async () => {
    const client = await pool.connect();
    try {
        console.log('Seeding migrations table...');

        await client.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                applied_at TIMESTAMP DEFAULT NOW()
            );
        `);

        await client.query(`
            INSERT INTO migrations (name) 
            VALUES ('001_initial_schema.sql') 
            ON CONFLICT (name) DO NOTHING;
        `);

        console.log('Marked 001_initial_schema.sql as applied.');
    } catch (error) {
        console.error('Failed to seed migrations:', error);
    } finally {
        client.release();
        pool.end();
    }
};

seedMigrations();
