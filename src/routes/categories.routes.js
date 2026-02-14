const express = require('express');
const router = express.Router();
const {
    createCategory,
    getCategories,
    getCategoryById,
    getCategoryBySlug,
    updateCategory,
    deleteCategory,
    getCategoryProducts,
} = require('../controllers/categories.controller');

// ─── Public routes ─────────────────────────────────────────────────
router.get('/', getCategories);                            // GET    /api/categories (add ?tree=true for nested)
router.get('/slug/:slug', getCategoryBySlug);              // GET    /api/categories/slug/:slug
router.get('/:id', getCategoryById);                       // GET    /api/categories/:id
router.get('/:id/products', getCategoryProducts);          // GET    /api/categories/:id/products

// ─── Admin routes (add auth middleware later when RBAC is ready) ──
router.post('/', createCategory);                          // POST   /api/categories
router.patch('/:id', updateCategory);                      // PATCH  /api/categories/:id
router.delete('/:id', deleteCategory);                     // DELETE /api/categories/:id

module.exports = router;
