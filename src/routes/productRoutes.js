const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  duplicateProduct,
  updateStock,
  getLowStockProducts,
  getEnums,
} = require('../controllers/productController');

// ==================== PUBLIC ROUTES ====================
// These routes are accessible to everyone

// Get dropdown values for forms (wine types, bottle sizes, etc.)
router.get('/enums', getEnums);

// Get all products with filtering, sorting, pagination
router.get('/', getAllProducts);

// Get single product details
router.get('/:id', getProductById);

// ==================== ADMIN ROUTES ====================
// TODO: Add authentication middleware before these routes
// Example: router.use(authMiddleware, adminMiddleware);

// Get low stock products (admin alert)
router.get('/admin/low-stock', getLowStockProducts);

// Create a new product
router.post('/', createProduct);

// Duplicate an existing product
router.post('/:id/duplicate', duplicateProduct);

// Update a product
router.patch('/:id', updateProduct);

// Update product stock
router.patch('/:id/stock', updateStock);

// Delete a product (soft delete)
router.delete('/:id', deleteProduct);

module.exports = router;