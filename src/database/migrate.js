const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const fs = require('fs');
const { pool } = require('./index');

const migrate = async () => {
    const client = await pool.connect();
    try {
        console.log('Starting migration...');

        // Ensure migrations table exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                applied_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Get list of applied migrations
        const { rows: appliedMigrations } = await client.query('SELECT name FROM migrations');
        const appliedNames = new Set(appliedMigrations.map(m => m.name));

        // migrations directory
        const migrationsDir = path.join(__dirname, 'migrations');

        // Read all sql files
        const files = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort(); // Ensure they run in order

        console.log(`Found ${files.length} migration files.`);

        let appliedCount = 0;
        for (const file of files) {
            if (appliedNames.has(file)) {
                console.log(`Skipping ${file} (already applied)`);
                continue;
            }

            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');

            console.log(`Running migration: ${file}`);
            await client.query('BEGIN');
            try {
                await client.query(sql);
                await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
                await client.query('COMMIT');
                console.log(`Successfully applied: ${file}`);
                appliedCount++;
            } catch (err) {
                await client.query('ROLLBACK');
                console.error(`Failed to apply ${file}:`, err.message);
                throw err;
            }
        }

        if (appliedCount === 0) {
            console.log('No new migrations to apply.');
        } else {
            console.log(`${appliedCount} migrations applied successfully.`);
        }
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        client.release();
        pool.end();
    }
};

migrate();
