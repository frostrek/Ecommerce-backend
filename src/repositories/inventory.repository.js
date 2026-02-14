const BaseRepository = require('./base.repository');
const { query } = require('../database');

class InventoryRepository extends BaseRepository {
    constructor() {
        super('inventory.stock_movements', 'movement_id');
    }

    /**
     * Adjust stock for a variant and log the movement.
     * @param {string} productId - The product ID
     * @param {string} variantId - The variant ID
     * @param {number} quantityChange - Positive to add, negative to remove
     * @param {string} reason - Reason for adjustment
     * @param {string} referenceId - Optional reference ID (e.g., Order #)
     */
    async adjustStock(productId, variantId, quantityChange, reason, referenceId = null, recordHistory = true) {
        const client = await require('../database').pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Get current stock
            const variantRes = await client.query(
                'SELECT stock_quantity FROM inventory.product_variants WHERE variant_id = $1 FOR UPDATE',
                [variantId]
            );

            if (variantRes.rows.length === 0) {
                throw new Error('Variant not found');
            }

            const currentQuantity = variantRes.rows[0].stock_quantity || 0;
            const newQuantity = currentQuantity + quantityChange;

            if (newQuantity < 0) {
                throw new Error('Insufficient stock');
            }

            // 2. Update variant stock
            await client.query(
                'UPDATE inventory.product_variants SET stock_quantity = $1, updated_at = NOW() WHERE variant_id = $2',
                [newQuantity, variantId]
            );

            // 3. Log movement (if enabled)
            let movement = null;
            if (recordHistory) {
                const movementRes = await client.query(
                    `INSERT INTO inventory.stock_movements 
                    (product_id, variant_id, quantity_change, previous_quantity, new_quantity, reason, reference_id)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING *`,
                    [productId, variantId, quantityChange, currentQuantity, newQuantity, reason, referenceId]
                );
                movement = movementRes.rows[0];
            }

            await client.query('COMMIT');
            return movement || { new_quantity: newQuantity };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get stock history for a product or variant.
     */
    async getHistory(productId, limit = 50) {
        const result = await query(
            `SELECT sm.*, pv.variant_name, pv.variant_sku 
             FROM inventory.stock_movements sm
             LEFT JOIN inventory.product_variants pv ON sm.variant_id = pv.variant_id
             WHERE sm.product_id = $1
             ORDER BY sm.created_at DESC
             LIMIT $2`,
            [productId, limit]
        );
        return result.rows;
    }
}

module.exports = new InventoryRepository();
