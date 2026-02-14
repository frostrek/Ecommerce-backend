const { query } = require('../database');

class CategoriesRepository {

    /**
     * Create a new category.
     */
    async create({ name, slug, description, parent_id, image_url, sort_order }) {
        const result = await query(
            `INSERT INTO inventory.categories
                (name, slug, description, parent_id, image_url, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [name, slug, description || null, parent_id || null, image_url || null, sort_order || 0]
        );
        return result.rows[0];
    }

    /**
     * Get all categories in a flat list.
     */
    async findAll() {
        const result = await query(
            `SELECT c.*, 
                    p.name AS parent_name,
                    (SELECT COUNT(*) FROM inventory.products WHERE category_id = c.category_id)::INTEGER AS product_count
             FROM inventory.categories c
             LEFT JOIN inventory.categories p ON c.parent_id = p.category_id
             ORDER BY c.sort_order ASC, c.name ASC`
        );
        return result.rows;
    }

    /**
     * Get categories as a nested tree structure.
     */
    async getTree() {
        const all = await this.findAll();

        // Build tree from flat list
        const map = {};
        const roots = [];

        all.forEach(cat => {
            map[cat.category_id] = { ...cat, children: [] };
        });

        all.forEach(cat => {
            if (cat.parent_id && map[cat.parent_id]) {
                map[cat.parent_id].children.push(map[cat.category_id]);
            } else {
                roots.push(map[cat.category_id]);
            }
        });

        return roots;
    }

    /**
     * Get category by ID with subcategories.
     */
    async findById(categoryId) {
        const result = await query(
            `SELECT c.*,
                    (SELECT COUNT(*) FROM inventory.products WHERE category_id = c.category_id)::INTEGER AS product_count
             FROM inventory.categories c
             WHERE c.category_id = $1`,
            [categoryId]
        );
        if (!result.rows[0]) return null;

        // Get children
        const children = await query(
            `SELECT * FROM inventory.categories WHERE parent_id = $1 ORDER BY sort_order ASC`,
            [categoryId]
        );

        return {
            ...result.rows[0],
            children: children.rows,
        };
    }

    /**
     * Find category by slug (for URL routing).
     */
    async findBySlug(slug) {
        const result = await query(
            'SELECT * FROM inventory.categories WHERE slug = $1',
            [slug]
        );
        return result.rows[0] || null;
    }

    /**
     * Update a category.
     */
    async update(categoryId, data) {
        const fields = [];
        const values = [];
        let idx = 1;

        for (const [key, val] of Object.entries(data)) {
            if (val !== undefined) {
                fields.push(`${key} = $${idx}`);
                values.push(val);
                idx++;
            }
        }

        if (fields.length === 0) return this.findById(categoryId);

        fields.push('updated_at = NOW()');
        values.push(categoryId);

        const result = await query(
            `UPDATE inventory.categories SET ${fields.join(', ')} WHERE category_id = $${idx} RETURNING *`,
            values
        );
        return result.rows[0] || null;
    }

    /**
     * Delete a category. Children are orphaned (parent_id → NULL via FK).
     */
    async delete(categoryId) {
        const result = await query(
            'DELETE FROM inventory.categories WHERE category_id = $1 RETURNING *',
            [categoryId]
        );
        return result.rows[0] || null;
    }

    /**
     * Get products in a category (including subcategory products).
     */
    async getProducts(categoryId, { limit = 50, offset = 0, status } = {}) {
        let statusClause = '';
        const params = [categoryId, limit, offset];

        if (status) {
            statusClause = ' AND p.status = $4';
            params.push(status);
        }

        const result = await query(
            `SELECT p.* FROM inventory.products p
             WHERE (p.category_id = $1
                OR p.category_id IN (SELECT category_id FROM inventory.categories WHERE parent_id = $1))
             ${statusClause}
             ORDER BY p.created_at DESC
             LIMIT $2 OFFSET $3`,
            params
        );
        return result.rows;
    }
}

module.exports = new CategoriesRepository();
