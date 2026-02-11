const BaseRepository = require('./base.repository');
const { query, getClient } = require('../database');

class CartRepository extends BaseRepository {
    constructor() {
        super('inventory.carts', 'cart_id');
    }

    /* Find cart by customer_id */
    async findByCustomerId(customerId) {
        const result = await query(
            'SELECT * FROM inventory.carts WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 1',
            [customerId]
        );
        return result.rows[0] || null;
    }

    /* Create a new cart */
    async createCart(customerId = null) {
        const result = await query(
            'INSERT INTO inventory.carts (customer_id) VALUES ($1) RETURNING *',
            [customerId]
        );
        return result.rows[0];
    }

    /* Find existing cart or create a new one */
    async findOrCreateCart(customerId) {
        if (customerId) {
            const existing = await this.findByCustomerId(customerId);
            if (existing) return { cart: existing, created: false };
        }
        const cart = await this.createCart(customerId);
        return { cart, created: true };
    }

    /**
     * Add item to cart.
     * If the same variant already exists in the cart, increment the quantity.
     * Validates stock availability before adding.
     */
    async addItem(cartId, variantId, quantity) {
        const client = await getClient();
        try {
            await client.query('BEGIN');

            // 1. Validate that the variant exists and is active
            const variantRes = await client.query(
                `SELECT variant_id, price, discounted_price, tax_percentage, stock_quantity, is_active
                 FROM inventory.product_variants
                 WHERE variant_id = $1`,
                [variantId]
            );

            if (variantRes.rows.length === 0) {
                const err = new Error('Variant not found');
                err.statusCode = 404;
                throw err;
            }

            const variant = variantRes.rows[0];

            if (!variant.is_active) {
                const err = new Error('This variant is no longer available');
                err.statusCode = 400;
                throw err;
            }

            // 2. Check if item already in cart
            const existingRes = await client.query(
                'SELECT cart_item_id, quantity FROM inventory.cart_items WHERE cart_id = $1 AND variant_id = $2',
                [cartId, variantId]
            );

            let newQuantity = quantity;
            if (existingRes.rows.length > 0) {
                newQuantity = existingRes.rows[0].quantity + quantity;
            }

            // 3. Validate stock
            if (variant.stock_quantity !== null && variant.stock_quantity < newQuantity) {
                const err = new Error(`Insufficient stock. Available: ${variant.stock_quantity}, Requested: ${newQuantity}`);
                err.statusCode = 400;
                throw err;
            }

            let cartItem;
            if (existingRes.rows.length > 0) {
                // Update existing item quantity
                const updateRes = await client.query(
                    'UPDATE inventory.cart_items SET quantity = $1 WHERE cart_item_id = $2 RETURNING *',
                    [newQuantity, existingRes.rows[0].cart_item_id]
                );
                cartItem = updateRes.rows[0];
            } else {
                // Insert new item
                const insertRes = await client.query(
                    'INSERT INTO inventory.cart_items (cart_id, variant_id, quantity) VALUES ($1, $2, $3) RETURNING *',
                    [cartId, variantId, quantity]
                );
                cartItem = insertRes.rows[0];
            }

            await client.query('COMMIT');
            return cartItem;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /* Update item quantity in cart */
    async updateItemQuantity(cartItemId, quantity) {
        const client = await getClient();
        try {
            await client.query('BEGIN');

            // 1. Get the item and its variant
            const itemRes = await client.query(
                `SELECT ci.cart_item_id, ci.variant_id, pv.stock_quantity
                 FROM inventory.cart_items ci
                 JOIN inventory.product_variants pv ON ci.variant_id = pv.variant_id
                 WHERE ci.cart_item_id = $1`,
                [cartItemId]
            );

            if (itemRes.rows.length === 0) {
                const err = new Error('Cart item not found');
                err.statusCode = 404;
                throw err;
            }

            const item = itemRes.rows[0];

            // 2. Validate stock
            if (item.stock_quantity !== null && item.stock_quantity < quantity) {
                const err = new Error(`Insufficient stock. Available: ${item.stock_quantity}, Requested: ${quantity}`);
                err.statusCode = 400;
                throw err;
            }

            // 3. Update quantity
            const updateRes = await client.query(
                'UPDATE inventory.cart_items SET quantity = $1 WHERE cart_item_id = $2 RETURNING *',
                [quantity, cartItemId]
            );

            await client.query('COMMIT');
            return updateRes.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /* Remove item from cart */
    async removeItem(cartItemId) {
        const result = await query(
            'DELETE FROM inventory.cart_items WHERE cart_item_id = $1 RETURNING *',
            [cartItemId]
        );
        return result.rows[0] || null;
    }

    /**
     * Get full cart with all items, product details, and calculated totals.
     * Returns: cart info + items[] with product name, variant details, line totals
     *        + summary (subtotal, total_tax, grand_total, item_count)
     */
    async getCartWithItems(cartId) {
        // 1. Get cart
        const cartRes = await query(
            'SELECT * FROM inventory.carts WHERE cart_id = $1',
            [cartId]
        );

        if (cartRes.rows.length === 0) return null;
        const cart = cartRes.rows[0];

        // 2. Get items with product + variant info
        const itemsRes = await query(
            `SELECT 
                ci.cart_item_id,
                ci.variant_id,
                ci.quantity,
                ci.created_at AS added_at,
                pv.size_label,
                pv.volume_ml,
                pv.price,
                pv.discounted_price,
                pv.tax_percentage,
                pv.stock_quantity,
                pv.alcohol_percentage,
                pv.currency,
                pv.variant_sku,
                pv.is_active,
                p.product_id,
                p.product_name,
                p.brand,
                p.category,
                p.sku AS product_sku
             FROM inventory.cart_items ci
             JOIN inventory.product_variants pv ON ci.variant_id = pv.variant_id
             JOIN inventory.products p ON pv.product_id = p.product_id
             WHERE ci.cart_id = $1
             ORDER BY ci.created_at ASC`,
            [cartId]
        );

        // 3. Calculate totals for each item and cart summary
        let subtotal = 0;
        let totalTax = 0;
        let itemCount = 0;

        const items = itemsRes.rows.map(row => {
            const effectivePrice = parseFloat(row.discounted_price || row.price);
            const lineSubtotal = effectivePrice * row.quantity;
            const taxRate = parseFloat(row.tax_percentage || 0) / 100;
            const lineTax = lineSubtotal * taxRate;
            const lineTotal = lineSubtotal + lineTax;

            subtotal += lineSubtotal;
            totalTax += lineTax;
            itemCount += row.quantity;

            return {
                cart_item_id: row.cart_item_id,
                variant_id: row.variant_id,
                quantity: row.quantity,
                added_at: row.added_at,
                product: {
                    product_id: row.product_id,
                    product_name: row.product_name,
                    brand: row.brand,
                    category: row.category,
                    product_sku: row.product_sku,
                },
                variant: {
                    size_label: row.size_label,
                    volume_ml: row.volume_ml,
                    variant_sku: row.variant_sku,
                    alcohol_percentage: row.alcohol_percentage,
                    is_active: row.is_active,
                    stock_quantity: row.stock_quantity,
                },
                pricing: {
                    unit_price: parseFloat(row.price),
                    discounted_price: row.discounted_price ? parseFloat(row.discounted_price) : null,
                    effective_price: effectivePrice,
                    tax_percentage: parseFloat(row.tax_percentage || 0),
                    line_subtotal: Math.round(lineSubtotal * 100) / 100,
                    line_tax: Math.round(lineTax * 100) / 100,
                    line_total: Math.round(lineTotal * 100) / 100,
                    currency: row.currency,
                },
            };
        });

        return {
            cart_id: cart.cart_id,
            customer_id: cart.customer_id,
            created_at: cart.created_at,
            items,
            summary: {
                item_count: itemCount,
                unique_items: items.length,
                subtotal: Math.round(subtotal * 100) / 100,
                total_tax: Math.round(totalTax * 100) / 100,
                grand_total: Math.round((subtotal + totalTax) * 100) / 100,
            },
        };
    }
}

module.exports = new CartRepository();
