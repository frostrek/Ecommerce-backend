const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const fs = require('fs');
const { pool } = require('./index');

const migrate = async () => {
    const client = await pool.connect();
    try {
        console.log('Starting migration...');

        // migrations directory
        const migrationsDir = path.join(__dirname, 'migrations');

        // Read all sql files
        const files = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort(); // Ensure they run in order

        console.log(`Found ${files.length} migration files.`);

        for (const file of files) {
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');

            console.log(`Running migration: ${file}`);
            await client.query('BEGIN');
            try {
                await client.query(sql);
                await client.query('COMMIT');
                console.log(`Successfully applied: ${file}`);
            } catch (err) {
                await client.query('ROLLBACK');
                console.error(`Failed to apply ${file}:`, err.message);
                throw err;
            }
        }

        console.log('All migrations applied successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        client.release();
        pool.end();
    }
};

migrate();
