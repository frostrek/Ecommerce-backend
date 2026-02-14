require('dotenv').config();
const { pool } = require('../src/database');

async function checkSchema() {
    const client = await pool.connect();
    try {
        // Try to insert a row
        const res = await client.query(`
            SELECT product_id, variant_id FROM inventory.product_variants LIMIT 1
        `);
        const { product_id, variant_id } = res.rows[0];

        console.log(`Testing INSERT with product_id=${product_id}, variant_id=${variant_id}`);

        await client.query(`
            INSERT INTO inventory.stock_movements 
            (product_id, variant_id, quantity_change, reason, reference_id)
            VALUES ($1, $2, 1, 'TEST_INSERT', 'ref123')
        `, [product_id, variant_id]);

        console.log('INSERT successful');

        // Cleanup
        await client.query("DELETE FROM inventory.stock_movements WHERE reason = 'TEST_INSERT'");
        console.log('Cleanup successful');
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
}

checkSchema();
