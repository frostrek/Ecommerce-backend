require('dotenv').config();
const { query } = require('./src/database');

const cartId = process.argv[2] || 'e38d96ba-593e-497c-9bad-32ffc54228eb';

async function checkCart() {
    console.log(`Checking Cart ID: ${cartId}`);

    // 1. Check if cart exists
    const cartRes = await query('SELECT * FROM inventory.carts WHERE cart_id = $1', [cartId]);
    if (cartRes.rows.length === 0) {
        console.log('❌ Cart NOT FOUND in inventory.carts');
        return;
    }
    console.log('✅ Cart FOUND:', cartRes.rows[0]);

    // 2. Check items (raw)
    const itemsRes = await query('SELECT * FROM inventory.cart_items WHERE cart_id = $1', [cartId]);
    console.log(`📦 Expected Items count: ${itemsRes.rows.length}`);
    if (itemsRes.rows.length === 0) {
        console.log('❌ Cart has NO items in inventory.cart_items table.');
        return;
    }
    console.table(itemsRes.rows);

    // 3. Check items with JOIN (like checkout does)
    const joinRes = await query(
        `SELECT 
            ci.cart_item_id,
            ci.variant_id,
            pv.variant_id AS pv_variant_id,
            p.product_id AS p_product_id
         FROM inventory.cart_items ci
         LEFT JOIN inventory.product_variants pv ON ci.variant_id = pv.variant_id
         LEFT JOIN inventory.products p ON pv.product_id = p.product_id
         WHERE ci.cart_id = $1`,
        [cartId]
    );

    console.log('\n--- JOIN CHECK ---');
    joinRes.rows.forEach(row => {
        const status = (row.pv_variant_id && row.p_product_id) ? 'OK' : 'BROKEN LINK';
        console.log(`Item ${row.cart_item_id}: Variant ${row.variant_id} -> ${status}`);
        if (!row.pv_variant_id) console.log('   ⚠️ Variant Missing in product_variants table');
        if (row.pv_variant_id && !row.p_product_id) console.log('   ⚠️ Product Missing for Variant');
    });
}

checkCart().catch(console.error).finally(() => process.exit());
