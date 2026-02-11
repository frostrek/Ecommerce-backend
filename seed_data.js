require('dotenv').config();
const { query, pool } = require('./src/database');

async function seed() {
    try {
        console.log('🌱 Seeding database with dummy data...\n');

        // 1. Insert Products
        const products = await query(`
            INSERT INTO inventory.products (sku, product_name, brand, category, sub_category, description, price, unit_of_measure)
            VALUES 
                ('SKU-WINE-001', 'Sula Vineyards Shiraz', 'Sula Vineyards', 'Wine', 'Red Wine', 'A bold Indian Shiraz with dark fruit flavors and spicy finish.', 850.00, 'bottle'),
                ('SKU-WINE-002', 'Jacob''s Creek Chardonnay', 'Jacob''s Creek', 'Wine', 'White Wine', 'A crisp and refreshing Australian Chardonnay with citrus notes.', 1200.00, 'bottle'),
                ('SKU-BEER-001', 'Kingfisher Premium Lager', 'Kingfisher', 'Beer', 'Lager', 'India''s most popular premium lager beer.', 180.00, 'bottle'),
                ('SKU-SPRT-001', 'Royal Challenge Whisky', 'Royal Challenge', 'Spirits', 'Whisky', 'A smooth blended Indian whisky with rich oak flavors.', 950.00, 'bottle'),
                ('SKU-SNCK-001', 'Haldiram''s Aloo Bhujia', 'Haldiram''s', 'Snacks', 'Namkeen', 'Classic Indian spiced potato noodle snack.', 120.00, 'pack')
            RETURNING product_id, product_name
        `);
        console.log('✅ Products inserted:');
        products.rows.forEach(p => console.log(`   ${p.product_name} (${p.product_id})`));

        // 2. Insert Variants for each product
        const p = products.rows;

        const variants = await query(`
            INSERT INTO inventory.product_variants 
                (product_id, variant_sku, variant_name, size_label, volume_ml, price, discounted_price, tax_percentage, stock_quantity, alcohol_percentage, currency, is_active)
            VALUES 
                ($1, 'SULA-SHR-750', 'Sula Shiraz 750ml', '750ml', 750, 850.00, 799.00, 18.0, 50, 13.5, 'INR', true),
                ($1, 'SULA-SHR-375', 'Sula Shiraz 375ml', '375ml', 375, 450.00, NULL, 18.0, 30, 13.5, 'INR', true),
                ($2, 'JC-CHARD-750', 'Jacob''s Creek Chardonnay 750ml', '750ml', 750, 1200.00, 1099.00, 18.0, 25, 12.0, 'INR', true),
                ($3, 'KF-PREM-650', 'Kingfisher Premium 650ml', '650ml', 650, 180.00, NULL, 12.0, 200, 4.8, 'INR', true),
                ($3, 'KF-PREM-330', 'Kingfisher Premium 330ml', '330ml', 330, 100.00, NULL, 12.0, 300, 4.8, 'INR', true),
                ($4, 'RC-WHSK-750', 'Royal Challenge 750ml', '750ml', 750, 950.00, 899.00, 18.0, 40, 42.8, 'INR', true),
                ($5, 'HALD-AB-200', 'Aloo Bhujia 200g', '200g', NULL, 120.00, NULL, 5.0, 100, NULL, 'INR', true),
                ($5, 'HALD-AB-400', 'Aloo Bhujia 400g', '400g', NULL, 220.00, 199.00, 5.0, 75, NULL, 'INR', true)
            RETURNING variant_id, variant_name, price, stock_quantity
        `, [p[0].product_id, p[1].product_id, p[2].product_id, p[3].product_id, p[4].product_id]);

        console.log('\n✅ Variants inserted:');
        variants.rows.forEach(v => console.log(`   ${v.variant_name} | ₹${v.price} | Stock: ${v.stock_quantity} (${v.variant_id})`));

        // 3. Insert a Customer
        const customer = await query(`
            INSERT INTO inventory.customers (full_name, email, phone, date_of_birth, is_age_verified, is_active)
            VALUES ('Dhruv Sharma', 'dhruv.sharma@frostrek.com', '+91-9876543210', '1998-05-15', true, true)
            RETURNING customer_id, full_name
        `);
        console.log('\n✅ Customer inserted:');
        console.log(`   ${customer.rows[0].full_name} (${customer.rows[0].customer_id})`);

        console.log('\n🎉 Seeding complete! You can now test the Cart API.');
        console.log('\n📋 Quick Reference:');
        console.log(`   Customer ID: ${customer.rows[0].customer_id}`);
        console.log(`   Sample Variant ID: ${variants.rows[0].variant_id}`);

    } catch (err) {
        console.error('❌ Seed error:', err.message);
    } finally {
        pool.end();
    }
}
seed();
