const BaseRepository = require('./base.repository');
const { query } = require('../database');

class ProductsRepository extends BaseRepository {
    constructor() {
        super('inventory.products', 'product_id');
    }

    /* Find product by SKU */
    async findBySku(sku) {
        const result = await query(
            'SELECT * FROM inventory.products WHERE sku = $1',
            [sku]
        );
        return result.rows[0] || null;
    }

    /* Find products by category */
    async findByCategory(category, limit = 50) {
        const result = await query(
            'SELECT * FROM inventory.products WHERE category = $1 ORDER BY created_at DESC LIMIT $2',
            [category, limit]
        );
        return result.rows;
    }

    /* Search products by name */
    async search(searchTerm, limit = 50) {
        const result = await query(
            `SELECT * FROM inventory.products 
       WHERE product_name ILIKE $1 OR description ILIKE $1 
       ORDER BY created_at DESC LIMIT $2`,
            [`%${searchTerm}%`, limit]
        );
        return result.rows;
    }

    /*Get product with all related data (specifications, packaging, etc.) */
    async findByIdWithDetails(productId) {
        const product = await this.findById(productId);
        if (!product) return null;

        const [specs, packaging, variants, compliance, assets] = await Promise.all([
            query('SELECT * FROM inventory.product_specifications WHERE product_id = $1', [productId]),
            query('SELECT * FROM inventory.product_packaging WHERE product_id = $1', [productId]),
            query('SELECT * FROM inventory.product_variants WHERE product_id = $1', [productId]),
            query('SELECT * FROM inventory.product_compliance WHERE product_id = $1', [productId]),
            query('SELECT * FROM inventory.product_assets WHERE product_id = $1', [productId]),
        ]);

        return {
            ...product,
            specifications: specs.rows[0] || null,
            packaging: packaging.rows[0] || null,
            variants: variants.rows,
            compliance: compliance.rows[0] || null,
            assets: assets.rows,
        };
    }

    /* Duplicate a product */
    async duplicate(originalId, newSku, newName) {
        // 1. Get original product
        const original = await this.findById(originalId);
        if (!original) return null;

        // 2. Create copy with new SKU and Name
        const client = await require('../database').pool.connect();
        try {
            await client.query('BEGIN');

            // Insert product copy
            const productRes = await client.query(
                `INSERT INTO inventory.products 
                (sku, product_name, brand, category, sub_category, description, unit_of_measure, intended_use)
                SELECT $1, $2, brand, category, sub_category, description, unit_of_measure, intended_use
                FROM inventory.products WHERE product_id = $3
                RETURNING product_id`,
                [newSku, newName, originalId]
            );
            const newProductId = productRes.rows[0].product_id;

            // Copy related tables
            await client.query(
                `INSERT INTO inventory.product_specifications (product_id, material, length_cm, width_cm, height_cm, weight_kg, color, strength, grade, shelf_life_months, country_of_origin)
                 SELECT $1, material, length_cm, width_cm, height_cm, weight_kg, color, strength, grade, shelf_life_months, country_of_origin
                 FROM inventory.product_specifications WHERE product_id = $2`,
                [newProductId, originalId]
            );

            await client.query(
                `INSERT INTO inventory.product_packaging (product_id, packaging_type, pack_size, net_quantity, gross_weight, packaging_material, carton_size, units_per_carton, barcode)
                 SELECT $1, packaging_type, pack_size, net_quantity, gross_weight, packaging_material, carton_size, units_per_carton, barcode
                 FROM inventory.product_packaging WHERE product_id = $2`,
                [newProductId, originalId]
            );

            await client.query(
                `INSERT INTO inventory.product_compliance (product_id, manufacturer_name, manufacturer_address, regulatory_details, storage_instructions, handling_instructions, warranty_details, safety_warnings, remarks)
                 SELECT $1, manufacturer_name, manufacturer_address, regulatory_details, storage_instructions, handling_instructions, warranty_details, safety_warnings, remarks
                 FROM inventory.product_compliance WHERE product_id = $2`,
                [newProductId, originalId]
            );

            await client.query('COMMIT');
            return this.findById(newProductId);
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    /* Update stock quantity */
    async updateStock(id, quantity) {
        const result = await query(
            'UPDATE inventory.product_variants SET quantity = $1, updated_at = NOW() WHERE product_id = $2 RETURNING *',
            [quantity, id]
        );
        // Also update main product if needed (depending on schema design, keeping simple for now)
        return result.rows[0];
    }

    /* Get low stock products */
    async findLowStock(threshold = 10) {
        // Placeholder for low stock logic
        return [];
    }
}

module.exports = new ProductsRepository();
