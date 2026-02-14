require('dotenv').config();
const { pool } = require('../src/database');
const ordersRepo = require('../src/repositories/orders.repository');
const inventoryRepo = require('../src/repositories/inventory.repository');
const productsRepo = require('../src/repositories/products.repository');

async function verify() {
    const client = await pool.connect();
    try {
        console.log('Starting Verification...');

        // 1. Setup Data
        // Find a product variant to test with
        const variantRes = await client.query('SELECT * FROM inventory.product_variants LIMIT 1');
        if (variantRes.rows.length === 0) throw new Error('No variants found');
        const variant = variantRes.rows[0];
        const initialStock = variant.stock_quantity;
        console.log(`Test Variant: ${variant.variant_sku}, Initial Stock: ${initialStock}`);

        // Find a customer
        const customerRes = await client.query('SELECT * FROM inventory.customers LIMIT 1');
        if (customerRes.rows.length === 0) throw new Error('No customers found');
        const customerId = customerRes.rows[0].customer_id;

        // Create a cart and item
        const cartRes = await client.query('INSERT INTO inventory.carts (customer_id) VALUES ($1) RETURNING cart_id', [customerId]);
        const cartId = cartRes.rows[0].cart_id;

        await client.query(
            'INSERT INTO inventory.cart_items (cart_id, variant_id, quantity) VALUES ($1, $2, 1)',
            [cartId, variant.variant_id]
        );

        // 2. Create Order
        console.log('Creating Order...');
        const order = await ordersRepo.checkout(cartId, customerId);
        console.log(`Order Created: ${order.order_id}`);

        // Check stock reduced
        const afOrderStockRes = await client.query('SELECT stock_quantity FROM inventory.product_variants WHERE variant_id = $1', [variant.variant_id]);
        const stockAfterOrder = afOrderStockRes.rows[0].stock_quantity;
        console.log(`Stock after order: ${stockAfterOrder} (Expected: ${initialStock - 1})`);
        if (stockAfterOrder !== initialStock - 1) throw new Error('Stock not reduced correctly');

        // 3. Test Cancellation
        console.log('Cancelling Order...');
        await ordersRepo.updateStatus(order.order_id, 'CANCELLED');

        // Check stock restored
        const afCancelStockRes = await client.query('SELECT stock_quantity FROM inventory.product_variants WHERE variant_id = $1', [variant.variant_id]);
        const stockAfterCancel = afCancelStockRes.rows[0].stock_quantity;
        console.log(`Stock after cancel: ${stockAfterCancel} (Expected: ${initialStock})`);
        if (stockAfterCancel !== initialStock) throw new Error('Stock not restored correctly');

        // Check stock movement log
        const movementsRes = await client.query(
            'SELECT * FROM inventory.stock_movements WHERE reference_id = $1 AND reason = $2',
            [order.order_id, 'ORDER_CANCELLED']
        );
        if (movementsRes.rows.length === 0) throw new Error('Cancellation movement not logged');
        console.log('Cancellation movement logged successfully');

        // 4. Test Bypass History
        console.log('Testing Stock Bypass...');
        const bypassChange = 5;
        await inventoryRepo.adjustStock(
            variant.product_id,
            variant.variant_id,
            bypassChange,
            'TEST_BYPASS',
            null,
            false // recordHistory = false
        );

        const afBypassStockRes = await client.query('SELECT stock_quantity FROM inventory.product_variants WHERE variant_id = $1', [variant.variant_id]);
        const stockAfterBypass = afBypassStockRes.rows[0].stock_quantity;
        console.log(`Stock after bypass: ${stockAfterBypass} (Expected: ${initialStock + bypassChange})`);

        const bypassLogRes = await client.query(
            "SELECT * FROM inventory.stock_movements WHERE reason = 'TEST_BYPASS'"
        );
        if (bypassLogRes.rows.length > 0) throw new Error('Bypass movement logged unexpectedly');
        console.log('Stock bypass verified (no log created)');

        // Cleanup bypass change
        await inventoryRepo.adjustStock(variant.product_id, variant.variant_id, -bypassChange, 'CLEANUP', null, false);

        // 5. Test Low Stock Query
        console.log('Testing Low Stock Query...');
        // Set stock to 2 temporarily
        const originalStock = stockAfterCancel;
        await client.query('UPDATE inventory.product_variants SET stock_quantity = 2 WHERE variant_id = $1', [variant.variant_id]);

        const lowStockItems = await productsRepo.findLowStock(5);
        const found = lowStockItems.find(i => i.variant_id === variant.variant_id);

        console.log(`Low stock query returned ${lowStockItems.length} items`);
        if (!found) throw new Error('Low stock item not found');
        console.log('Low stock query verified');

        // Cleanup stock
        await client.query('UPDATE inventory.product_variants SET stock_quantity = $1 WHERE variant_id = $2', [originalStock, variant.variant_id]);

        console.log('ALL TESTS PASSED');

    } catch (e) {
        console.error('Verification Failed:', e);
    } finally {
        client.release();
        pool.end();
    }
}

verify();
