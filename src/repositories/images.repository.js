const { query } = require('../database');

class ImagesRepository {

    // ─── Product Images ────────────────────────────────────────────

    /**
     * Add an image to a product.
     */
    async addProductImage(productId, { base64_data, mime_type, file_size_bytes, file_name, asset_type, is_primary, sort_order }) {
        // If this is primary, un-primary all others first
        if (is_primary) {
            await query(
                'UPDATE inventory.product_assets SET is_primary = FALSE WHERE product_id = $1',
                [productId]
            );
        }

        const result = await query(
            `INSERT INTO inventory.product_assets
                (product_id, base64_data, mime_type, file_size_bytes, file_name, asset_type, is_primary, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING asset_id, product_id, mime_type, file_size_bytes, file_name, asset_type,
                       is_primary, sort_order, created_at`,
            [productId, base64_data, mime_type, file_size_bytes, file_name || null, asset_type || 'image', is_primary || false, sort_order || 0]
        );
        return result.rows[0];
    }

    /**
     * Get all images for a product (returns base64_data for rendering).
     */
    async getProductImages(productId) {
        const result = await query(
            `SELECT asset_id, product_id, base64_data, mime_type, file_size_bytes,
                    file_name, asset_type, is_primary, sort_order, created_at
             FROM inventory.product_assets
             WHERE product_id = $1
             ORDER BY is_primary DESC, sort_order ASC, created_at ASC`,
            [productId]
        );
        return result.rows;
    }

    /**
     * Get primary image for a product (for listing/cards).
     */
    async getPrimaryImage(productId) {
        const result = await query(
            `SELECT base64_data, mime_type FROM inventory.product_assets
             WHERE product_id = $1 AND is_primary = TRUE
             LIMIT 1`,
            [productId]
        );
        if (result.rows[0]) return result.rows[0];

        // Fallback: first image
        const fallback = await query(
            `SELECT base64_data, mime_type FROM inventory.product_assets
             WHERE product_id = $1
             ORDER BY sort_order ASC, created_at ASC
             LIMIT 1`,
            [productId]
        );
        return fallback.rows[0] || null;
    }

    /**
     * Set an image as primary.
     */
    async setPrimaryImage(productId, assetId) {
        await query(
            'UPDATE inventory.product_assets SET is_primary = FALSE WHERE product_id = $1',
            [productId]
        );
        const result = await query(
            'UPDATE inventory.product_assets SET is_primary = TRUE WHERE asset_id = $1 AND product_id = $2 RETURNING *',
            [assetId, productId]
        );
        return result.rows[0] || null;
    }

    /**
     * Delete a product image.
     */
    async deleteProductImage(assetId, productId) {
        const result = await query(
            'DELETE FROM inventory.product_assets WHERE asset_id = $1 AND product_id = $2 RETURNING asset_id',
            [assetId, productId]
        );
        return result.rows[0] || null;
    }

    // ─── Customer Profile Image ───────────────────────────────────

    /**
     * Update customer profile image.
     */
    async updateProfileImage(customerId, base64_data, mime_type) {
        const result = await query(
            `UPDATE inventory.customers
             SET profile_image = $1, profile_image_mime = $2
             WHERE customer_id = $3
             RETURNING customer_id, full_name, email, profile_image, profile_image_mime`,
            [base64_data, mime_type, customerId]
        );
        return result.rows[0] || null;
    }

    /**
     * Get customer profile image.
     */
    async getProfileImage(customerId) {
        const result = await query(
            'SELECT profile_image, profile_image_mime FROM inventory.customers WHERE customer_id = $1',
            [customerId]
        );
        return result.rows[0] || null;
    }

    /**
     * Remove customer profile image.
     */
    async removeProfileImage(customerId) {
        const result = await query(
            `UPDATE inventory.customers
             SET profile_image = NULL, profile_image_mime = NULL
             WHERE customer_id = $1
             RETURNING customer_id`,
            [customerId]
        );
        return result.rows[0] || null;
    }
}

module.exports = new ImagesRepository();
