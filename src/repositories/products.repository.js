const BaseRepository = require('./base.repository');
const { query } = require('../database');

class ProductsRepository extends BaseRepository {
    constructor() {
        super('inventory.products', 'product_id');
    }

    /**
     * Find product by SKU
     */
    async findBySku(sku) {
        const result = await query(
            'SELECT * FROM inventory.products WHERE sku = $1',
            [sku]
        );
        return result.rows[0] || null;
    }

    /**
     * Find products by category
     */
    async findByCategory(category, limit = 50) {
        const result = await query(
            'SELECT * FROM inventory.products WHERE category = $1 ORDER BY created_at DESC LIMIT $2',
            [category, limit]
        );
        return result.rows;
    }

    /**
     * Search products by name
     */
    async search(searchTerm, limit = 50) {
        const result = await query(
            `SELECT * FROM inventory.products 
       WHERE product_name ILIKE $1 OR description ILIKE $1 
       ORDER BY created_at DESC LIMIT $2`,
            [`%${searchTerm}%`, limit]
        );
        return result.rows;
    }

    /**
     * Get product with all related data (specifications, packaging, etc.)
     */
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
}

module.exports = new ProductsRepository();
