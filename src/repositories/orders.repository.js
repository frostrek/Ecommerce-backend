const BaseRepository = require('./base.repository');
const { query, getClient } = require('../database');

class OrdersRepository extends BaseRepository {
    constructor() {
        super('inventory.orders', 'order_id');
    }

    /**
     * CHECKOUT: Convert a cart into an order (Atomic Transaction).
     * Steps:
     *   1. Validate cart exists and has items
     *   2. Verify stock for every item
     *   3. Create the order record
     *   4. Move cart items → order items (with price snapshot)
     *   5. Deduct stock from product_variants
     *   6. Log stock movements
     *   7. Clear the cart
     *
     * @param {string} cartId - The cart to convert
     * @param {string} customerId - The customer placing the order
     * @param {string|null} shippingAddressId - Optional shipping address
     * @param {string|null} billingAddressId - Optional billing address
     * @returns {object} The created order with items
     */
    async checkout(cartId, customerId, shippingAddressId = null, billingAddressId = null) {
        const client = await getClient();
        try {
            await client.query('BEGIN');

            // 0. Verify Customer Age
            const customerRes = await client.query(
                'SELECT is_age_verified FROM inventory.customers WHERE customer_id = $1',
                [customerId]
            );

            if (customerRes.rows.length === 0) {
                const err = new Error('Customer not found');
                err.statusCode = 404;
                throw err;
            }

            if (!customerRes.rows[0].is_age_verified) {
                const err = new Error('Age verification required before checkout');
                err.statusCode = 403;
                throw err;
            }

            // 1. Get cart items with variant + product details
            const cartItemsRes = await client.query(
                `SELECT 
                    ci.cart_item_id,
                    ci.variant_id,
                    ci.quantity,
                    pv.price,
                    pv.discounted_price,
                    pv.tax_percentage,
                    pv.stock_quantity,
                    pv.is_active,
                    pv.product_id,
                    p.product_name
                 FROM inventory.cart_items ci
                 JOIN inventory.product_variants pv ON ci.variant_id = pv.variant_id
                 JOIN inventory.products p ON pv.product_id = p.product_id
                 WHERE ci.cart_id = $1
                 FOR UPDATE OF pv`,
                [cartId]
            );

            if (cartItemsRes.rows.length === 0) {
                const err = new Error('Cart is empty or does not exist');
                err.statusCode = 400;
                throw err;
            }

            // 2. Validate stock & calculate totals
            let totalAmount = 0;
            let totalTax = 0;
            const orderItems = [];

            for (const item of cartItemsRes.rows) {
                // Check if still active
                if (!item.is_active) {
                    const err = new Error(`"${item.product_name}" is no longer available`);
                    err.statusCode = 400;
                    throw err;
                }

                // Check stock
                if (item.stock_quantity < item.quantity) {
                    const err = new Error(
                        `Insufficient stock for "${item.product_name}". Available: ${item.stock_quantity}, Requested: ${item.quantity}`
                    );
                    err.statusCode = 400;
                    throw err;
                }

                const effectivePrice = parseFloat(item.discounted_price || item.price);
                const lineSubtotal = effectivePrice * item.quantity;
                const taxRate = parseFloat(item.tax_percentage || 0) / 100;
                const lineTax = lineSubtotal * taxRate;

                totalAmount += lineSubtotal;
                totalTax += lineTax;

                orderItems.push({
                    variant_id: item.variant_id,
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: effectivePrice,
                    tax_amount: Math.round(lineTax * 100) / 100,
                    stock_quantity: item.stock_quantity,
                });
            }

            totalAmount = Math.round(totalAmount * 100) / 100;
            totalTax = Math.round(totalTax * 100) / 100;

            // 3. Create the order
            const orderRes = await client.query(
                `INSERT INTO inventory.orders 
                 (customer_id, shipping_address_id, billing_address_id, total_amount, total_tax, order_status, payment_status)
                 VALUES ($1, $2, $3, $4, $5, 'PENDING', 'UNPAID')
                 RETURNING *`,
                [customerId, shippingAddressId, billingAddressId, totalAmount, totalTax]
            );
            const order = orderRes.rows[0];

            // 4. Create order items + 5. Deduct stock + 6. Log movements
            for (const item of orderItems) {
                // Insert order item
                await client.query(
                    `INSERT INTO inventory.order_items (order_id, variant_id, quantity, unit_price, tax_amount)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [order.order_id, item.variant_id, item.quantity, item.unit_price, item.tax_amount]
                );

                // Deduct stock
                const newStock = item.stock_quantity - item.quantity;
                await client.query(
                    'UPDATE inventory.product_variants SET stock_quantity = $1, updated_at = NOW() WHERE variant_id = $2',
                    [newStock, item.variant_id]
                );

                // Log stock movement
                await client.query(
                    `INSERT INTO inventory.stock_movements 
                     (product_id, variant_id, quantity_change, previous_quantity, new_quantity, reason, reference_id)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        item.product_id,
                        item.variant_id,
                        -item.quantity,
                        item.stock_quantity,
                        newStock,
                        'ORDER_PLACED',
                        order.order_id,
                    ]
                );
            }

            // 7. Clear the cart
            await client.query('DELETE FROM inventory.cart_items WHERE cart_id = $1', [cartId]);

            await client.query('COMMIT');

            // Return the full order
            return this.findByIdWithItems(order.order_id);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * DIRECT CHECKOUT: Create an order without requiring a backend cart.
     * Designed for frontends that manage cart in localStorage.
     * 
     * Uses the SAME orders + order_items tables as cart checkout,
     * so when frontend migrates to backend cart, data is 100% compatible.
     *
     * @param {object} params
     * @param {string} params.customer_id - Required for registered users, null for guest
     * @param {string|null} params.customer_email - For guest orders
     * @param {string|null} params.customer_name - For guest orders
     * @param {Array} params.items - [{ product_id, variant_id?, quantity, unit_price? }]
     * @param {object|null} params.shipping_address - Inline address { address_line1, city, state, pincode }
     * @param {string|null} params.shipping_address_id - Or use saved address
     * @param {string} params.payment_method - e.g. 'cod', 'online'
     * @param {string|null} params.order_notes
     */
    async directCheckout({
        customer_id = null,
        customer_email = null,
        customer_name = null,
        items,
        shipping_address = null,
        shipping_address_id = null,
        payment_method = 'cod',
        order_notes = null,
    }) {
        if (!items || items.length === 0) {
            const err = new Error('At least one item is required');
            err.statusCode = 400;
            throw err;
        }

        const client = await getClient();
        try {
            await client.query('BEGIN');

            // 1. Resolve customer (if customer_id provided)
            let resolvedCustomerId = customer_id;

            if (customer_id) {
                const custRes = await client.query(
                    'SELECT customer_id, is_age_verified FROM inventory.customers WHERE customer_id = $1',
                    [customer_id]
                );
                if (custRes.rows.length === 0) {
                    const err = new Error('Customer not found');
                    err.statusCode = 404;
                    throw err;
                }
                if (!custRes.rows[0].is_age_verified) {
                    const err = new Error('Age verification required before checkout');
                    err.statusCode = 403;
                    throw err;
                }
            }

            // 2. Handle shipping address — save inline address if provided
            let resolvedAddressId = shipping_address_id;

            if (shipping_address && !shipping_address_id && resolvedCustomerId) {
                const addrRes = await client.query(
                    `INSERT INTO inventory.customer_addresses
                        (customer_id, address_line1, address_line2, city, state, pincode, country)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)
                     RETURNING address_id`,
                    [
                        resolvedCustomerId,
                        shipping_address.address_line1,
                        shipping_address.address_line2 || null,
                        shipping_address.city,
                        shipping_address.state,
                        shipping_address.pincode,
                        shipping_address.country || 'India',
                    ]
                );
                resolvedAddressId = addrRes.rows[0].address_id;
            }

            // 3. Resolve items: product_id → variant_id (pick default variant)
            let totalAmount = 0;
            let totalTax = 0;
            const resolvedItems = [];

            for (const item of items) {
                let variantRow;

                if (item.variant_id) {
                    // Frontend provided variant_id directly — use it
                    const vRes = await client.query(
                        `SELECT pv.*, p.product_name FROM inventory.product_variants pv
                         JOIN inventory.products p ON pv.product_id = p.product_id
                         WHERE pv.variant_id = $1 FOR UPDATE`,
                        [item.variant_id]
                    );
                    variantRow = vRes.rows[0];
                } else if (item.product_id) {
                    // Resolve: pick first active variant for this product
                    const vRes = await client.query(
                        `SELECT pv.*, p.product_name FROM inventory.product_variants pv
                         JOIN inventory.products p ON pv.product_id = p.product_id
                         WHERE pv.product_id = $1 AND pv.is_active = TRUE
                         ORDER BY pv.created_at ASC
                         LIMIT 1
                         FOR UPDATE`,
                        [item.product_id]
                    );
                    variantRow = vRes.rows[0];

                    if (!variantRow) {
                        // No variant exists — create a default one from the product
                        const prodRes = await client.query(
                            'SELECT product_id, product_name, price FROM inventory.products WHERE product_id = $1',
                            [item.product_id]
                        );
                        if (prodRes.rows.length === 0) {
                            const err = new Error(`Product not found: ${item.product_id}`);
                            err.statusCode = 404;
                            throw err;
                        }

                        const prod = prodRes.rows[0];
                        const newVariant = await client.query(
                            `INSERT INTO inventory.product_variants
                                (product_id, variant_name, price, stock_quantity, is_active)
                             VALUES ($1, $2, $3, 9999, TRUE)
                             RETURNING *, $2 AS product_name`,
                            [prod.product_id, 'Default', item.unit_price || prod.price || 0]
                        );
                        variantRow = { ...newVariant.rows[0], product_name: prod.product_name };
                    }
                } else {
                    const err = new Error('Each item must have product_id or variant_id');
                    err.statusCode = 400;
                    throw err;
                }

                if (!variantRow) {
                    const err = new Error(`Variant not found for item: ${JSON.stringify(item)}`);
                    err.statusCode = 404;
                    throw err;
                }

                // Stock check
                const qty = parseInt(item.quantity) || 1;
                if (variantRow.stock_quantity < qty) {
                    const err = new Error(
                        `Insufficient stock for "${variantRow.product_name}". Available: ${variantRow.stock_quantity}, Requested: ${qty}`
                    );
                    err.statusCode = 400;
                    throw err;
                }

                // Price: use frontend price if provided, otherwise use variant price
                const effectivePrice = parseFloat(item.unit_price || variantRow.discounted_price || variantRow.price || 0);
                const lineSubtotal = effectivePrice * qty;
                const taxRate = parseFloat(variantRow.tax_percentage || 0) / 100;
                const lineTax = lineSubtotal * taxRate;

                totalAmount += lineSubtotal;
                totalTax += lineTax;

                resolvedItems.push({
                    variant_id: variantRow.variant_id,
                    product_id: variantRow.product_id,
                    quantity: qty,
                    unit_price: effectivePrice,
                    tax_amount: Math.round(lineTax * 100) / 100,
                    stock_quantity: variantRow.stock_quantity,
                });
            }

            totalAmount = Math.round(totalAmount * 100) / 100;
            totalTax = Math.round(totalTax * 100) / 100;

            // 4. Create order
            const orderRes = await client.query(
                `INSERT INTO inventory.orders
                 (customer_id, shipping_address_id, total_amount, total_tax, order_status, payment_status, order_notes)
                 VALUES ($1, $2, $3, $4, 'PENDING', 'UNPAID', $5)
                 RETURNING *`,
                [resolvedCustomerId, resolvedAddressId, totalAmount, totalTax, order_notes]
            );
            const order = orderRes.rows[0];

            // 5. Create order items + deduct stock + log movements
            for (const item of resolvedItems) {
                await client.query(
                    `INSERT INTO inventory.order_items (order_id, variant_id, quantity, unit_price, tax_amount)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [order.order_id, item.variant_id, item.quantity, item.unit_price, item.tax_amount]
                );

                const newStock = item.stock_quantity - item.quantity;
                await client.query(
                    'UPDATE inventory.product_variants SET stock_quantity = $1, updated_at = NOW() WHERE variant_id = $2',
                    [newStock, item.variant_id]
                );

                await client.query(
                    `INSERT INTO inventory.stock_movements
                     (product_id, variant_id, quantity_change, previous_quantity, new_quantity, reason, reference_id)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [item.product_id, item.variant_id, -item.quantity, item.stock_quantity, newStock, 'ORDER_PLACED', order.order_id]
                );
            }

            await client.query('COMMIT');
            return this.findByIdWithItems(order.order_id);
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get a single order with its items and product details.
     */
    async findByIdWithItems(orderId) {
        const orderRes = await query(
            'SELECT * FROM inventory.orders WHERE order_id = $1',
            [orderId]
        );

        if (orderRes.rows.length === 0) return null;
        const order = orderRes.rows[0];

        const itemsRes = await query(
            `SELECT 
                oi.order_item_id,
                oi.variant_id,
                oi.quantity,
                oi.unit_price,
                oi.tax_amount,
                pv.variant_name,
                pv.variant_sku,
                pv.size_label,
                pv.volume_ml,
                p.product_id,
                p.product_name,
                p.brand,
                p.sku AS product_sku
             FROM inventory.order_items oi
             JOIN inventory.product_variants pv ON oi.variant_id = pv.variant_id
             JOIN inventory.products p ON pv.product_id = p.product_id
             WHERE oi.order_id = $1
             ORDER BY oi.created_at ASC`,
            [orderId]
        );

        const items = itemsRes.rows.map(row => ({
            order_item_id: row.order_item_id,
            quantity: row.quantity,
            unit_price: parseFloat(row.unit_price),
            tax_amount: parseFloat(row.tax_amount),
            line_total: Math.round((parseFloat(row.unit_price) * row.quantity + parseFloat(row.tax_amount)) * 100) / 100,
            product: {
                product_id: row.product_id,
                product_name: row.product_name,
                brand: row.brand,
                product_sku: row.product_sku,
            },
            variant: {
                variant_id: row.variant_id,
                variant_name: row.variant_name,
                variant_sku: row.variant_sku,
                size_label: row.size_label,
                volume_ml: row.volume_ml,
            },
        }));

        return {
            ...order,
            total_amount: parseFloat(order.total_amount),
            total_tax: parseFloat(order.total_tax),
            grand_total: Math.round((parseFloat(order.total_amount) + parseFloat(order.total_tax)) * 100) / 100,
            items,
        };
    }

    /**
     * Get all orders for a specific customer.
     */
    async findByCustomer(customerId, limit = 50, offset = 0) {
        const result = await query(
            `SELECT o.*, 
                    COUNT(oi.order_item_id)::int AS item_count
             FROM inventory.orders o
             LEFT JOIN inventory.order_items oi ON o.order_id = oi.order_id
             WHERE o.customer_id = $1
             GROUP BY o.order_id
             ORDER BY o.created_at DESC
             LIMIT $2 OFFSET $3`,
            [customerId, limit, offset]
        );
        return result.rows;
    }

    /**
     * Get all orders (Admin).
     * Supports filtering by status.
     */
    async findAllOrders({ limit = 50, offset = 0, status = null } = {}) {
        let sql = `
            SELECT o.*, 
                   c.full_name AS customer_name,
                   c.email AS customer_email,
                   COUNT(oi.order_item_id)::int AS item_count
            FROM inventory.orders o
            LEFT JOIN inventory.customers c ON o.customer_id = c.customer_id
            LEFT JOIN inventory.order_items oi ON o.order_id = oi.order_id
        `;
        const params = [];

        if (status) {
            params.push(status);
            sql += ` WHERE o.order_status = $${params.length}`;
        }

        sql += ` GROUP BY o.order_id, c.full_name, c.email ORDER BY o.created_at DESC`;
        params.push(limit);
        sql += ` LIMIT $${params.length}`;
        params.push(offset);
        sql += ` OFFSET $${params.length}`;

        const result = await query(sql, params);
        return result.rows;
    }

    /**
     * Update order status (Admin).
     * Valid transitions: PENDING → CONFIRMED → SHIPPED → DELIVERED
     *                    PENDING → CANCELLED
     */
    async updateStatus(orderId, newStatus) {
        const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

        if (!validStatuses.includes(newStatus)) {
            const err = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
            err.statusCode = 400;
            throw err;
        }

        const client = await getClient();
        try {
            await client.query('BEGIN');

            // 1. Get current order status
            const orderRes = await client.query('SELECT order_status FROM inventory.orders WHERE order_id = $1 FOR UPDATE', [orderId]);
            if (orderRes.rows.length === 0) {
                throw new Error('Order not found');
            }
            const currentStatus = orderRes.rows[0].order_status;

            if (currentStatus === 'CANCELLED') {
                throw new Error('Order is already cancelled');
            }

            // 2. If cancelling, restore stock
            if (newStatus === 'CANCELLED' && currentStatus !== 'CANCELLED') {
                const itemsRes = await client.query(
                    `SELECT oi.variant_id, oi.quantity, pv.product_id 
                     FROM inventory.order_items oi
                     JOIN inventory.product_variants pv ON oi.variant_id = pv.variant_id
                     WHERE oi.order_id = $1`,
                    [orderId]
                );

                for (const item of itemsRes.rows) {
                    // Restore stock
                    await client.query(
                        'UPDATE inventory.product_variants SET stock_quantity = stock_quantity + $1, updated_at = NOW() WHERE variant_id = $2',
                        [item.quantity, item.variant_id]
                    );

                    // Log movement
                    await client.query(
                        `INSERT INTO inventory.stock_movements 
                        (product_id, variant_id, quantity_change, reason, reference_id)
                        VALUES ($1, $2, $3, $4, $5)`,
                        [
                            item.product_id,
                            item.variant_id,
                            item.quantity, // Positive change for restoration
                            'ORDER_CANCELLED',
                            orderId,
                        ]
                    );
                }
            }

            // 3. Update status
            const result = await client.query(
                `UPDATE inventory.orders 
                 SET order_status = $1
                 WHERE order_id = $2
                 RETURNING *`,
                [newStatus, orderId]
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
     * Update payment status.
     */
    async updatePaymentStatus(orderId, paymentStatus) {
        const validStatuses = ['UNPAID', 'PAID', 'REFUNDED', 'FAILED'];

        if (!validStatuses.includes(paymentStatus)) {
            const err = new Error(`Invalid payment status. Must be one of: ${validStatuses.join(', ')}`);
            err.statusCode = 400;
            throw err;
        }

        const result = await query(
            `UPDATE inventory.orders 
             SET payment_status = $1
             WHERE order_id = $2
             RETURNING *`,
            [paymentStatus, orderId]
        );

        return result.rows[0] || null;
    }
}

module.exports = new OrdersRepository();
