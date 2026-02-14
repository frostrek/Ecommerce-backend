const { query } = require('../database');

class WishlistRepository {

    /**
     * Add product to wishlist. Uses ON CONFLICT to prevent duplicates.
     */
    async add(customerId, productId, variantId = null) {
        const result = await query(
            `INSERT INTO inventory.wishlists (customer_id, product_id, variant_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (customer_id, product_id) DO NOTHING
             RETURNING *`,
            [customerId, productId, variantId]
        );
        return result.rows[0] || null;
    }

    /**
     * Remove product from wishlist.
     */
    async remove(customerId, productId) {
        const result = await query(
            `DELETE FROM inventory.wishlists
             WHERE customer_id = $1 AND product_id = $2
             RETURNING *`,
            [customerId, productId]
        );
        return result.rows[0] || null;
    }

    /**
     * Get full wishlist for a customer with product details.
     */
    async getByCustomer(customerId) {
        const result = await query(
            `SELECT w.wishlist_id, w.created_at AS added_at,
                    p.product_id, p.product_name, p.brand, p.category,
                    p.description, p.price,
                    pv.variant_id, pv.variant_name, pv.size_label,
                    pv.volume_ml, pv.price AS variant_price,
                    pv.discounted_price, pv.stock_quantity,
                    pv.is_active AS variant_active,
                    (SELECT asset_url FROM inventory.product_assets
                     WHERE product_id = p.product_id
                     ORDER BY created_at LIMIT 1) AS image_url
             FROM inventory.wishlists w
             JOIN inventory.products p ON w.product_id = p.product_id
             LEFT JOIN inventory.product_variants pv ON w.variant_id = pv.variant_id
             WHERE w.customer_id = $1
             ORDER BY w.created_at DESC`,
            [customerId]
        );
        return result.rows;
    }

    /**
     * Check if a specific product is in the customer's wishlist.
     */
    async isInWishlist(customerId, productId) {
        const result = await query(
            `SELECT 1 FROM inventory.wishlists
             WHERE customer_id = $1 AND product_id = $2`,
            [customerId, productId]
        );
        return result.rows.length > 0;
    }

    /**
     * Get wishlist count for a customer.
     */
    async getCount(customerId) {
        const result = await query(
            'SELECT COUNT(*) AS count FROM inventory.wishlists WHERE customer_id = $1',
            [customerId]
        );
        return parseInt(result.rows[0].count, 10);
    }

    /**
     * Clear entire wishlist for a customer.
     */
    async clearAll(customerId) {
        await query(
            'DELETE FROM inventory.wishlists WHERE customer_id = $1',
            [customerId]
        );
    }

    /**
     * Move wishlist item to cart.
     * Removes from wishlist and returns product info for the cart controller to add.
     */
    async moveToCart(customerId, productId) {
        const item = await this.remove(customerId, productId);
        return item;
    }
}

module.exports = new WishlistRepository();
