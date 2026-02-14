const categoriesRepo = require('../repositories/categories.repository');
const { sendSuccess, sendCreated, sendNotFound } = require('../utils/response');
const asyncHandler = require('../middlewares/asyncHandler');

/**
 * POST /api/categories
 * Create a new category.
 * Body: { name, slug, description?, parent_id?, image_url?, sort_order? }
 */
const createCategory = asyncHandler(async (req, res) => {
    const { name, slug, description, parent_id, image_url, sort_order } = req.body;

    if (!name || !slug) {
        const err = new Error('name and slug are required');
        err.statusCode = 400;
        throw err;
    }

    // Check slug uniqueness
    const existing = await categoriesRepo.findBySlug(slug);
    if (existing) {
        const err = new Error(`Slug "${slug}" is already taken`);
        err.statusCode = 409;
        throw err;
    }

    const category = await categoriesRepo.create({
        name, slug, description, parent_id, image_url, sort_order,
    });

    sendCreated(res, category, 'Category created');
});

/**
 * GET /api/categories
 * Get all categories. Use ?tree=true for nested structure.
 */
const getCategories = asyncHandler(async (req, res) => {
    const { tree } = req.query;

    const categories = tree === 'true'
        ? await categoriesRepo.getTree()
        : await categoriesRepo.findAll();

    sendSuccess(res, categories, `${Array.isArray(categories) ? categories.length : 0} categories`);
});

/**
 * GET /api/categories/:id
 * Get category by ID with children.
 */
const getCategoryById = asyncHandler(async (req, res) => {
    const category = await categoriesRepo.findById(req.params.id);
    if (!category) return sendNotFound(res, 'Category');
    sendSuccess(res, category);
});

/**
 * GET /api/categories/slug/:slug
 * Get category by slug.
 */
const getCategoryBySlug = asyncHandler(async (req, res) => {
    const category = await categoriesRepo.findBySlug(req.params.slug);
    if (!category) return sendNotFound(res, 'Category');
    sendSuccess(res, category);
});

/**
 * PATCH /api/categories/:id
 * Update a category.
 */
const updateCategory = asyncHandler(async (req, res) => {
    const { name, slug, description, parent_id, image_url, sort_order, is_active } = req.body;

    // If slug is being changed, check uniqueness
    if (slug) {
        const existing = await categoriesRepo.findBySlug(slug);
        if (existing && existing.category_id !== req.params.id) {
            const err = new Error(`Slug "${slug}" is already taken`);
            err.statusCode = 409;
            throw err;
        }
    }

    const updated = await categoriesRepo.update(req.params.id, {
        name, slug, description, parent_id, image_url, sort_order, is_active,
    });

    if (!updated) return sendNotFound(res, 'Category');
    sendSuccess(res, updated, 'Category updated');
});

/**
 * DELETE /api/categories/:id
 * Delete a category (children become orphaned).
 */
const deleteCategory = asyncHandler(async (req, res) => {
    const deleted = await categoriesRepo.delete(req.params.id);
    if (!deleted) return sendNotFound(res, 'Category');
    sendSuccess(res, {}, 'Category deleted');
});

/**
 * GET /api/categories/:id/products
 * Get all products in a category (and its subcategories).
 * Query: ?status=published&limit=50&offset=0
 */
const getCategoryProducts = asyncHandler(async (req, res) => {
    const { limit = 50, offset = 0, status } = req.query;

    const products = await categoriesRepo.getProducts(req.params.id, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        status,
    });

    sendSuccess(res, products, `${products.length} products in category`);
});

module.exports = {
    createCategory,
    getCategories,
    getCategoryById,
    getCategoryBySlug,
    updateCategory,
    deleteCategory,
    getCategoryProducts,
};
