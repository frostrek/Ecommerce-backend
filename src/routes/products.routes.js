const express = require('express');
const router = express.Router();
const {
    getAllProducts,
    getProductById,
    getProductDetails,
    searchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
} = require('../controllers/products.controller');

// Search must come before :id to avoid conflict
router.get('/search', searchProducts);        // GET /api/products/search?q=term

// Standard CRUD routes
router.get('/', getAllProducts);              // GET /api/products
router.get('/:id', getProductById);           // GET /api/products/:id
router.get('/:id/details', getProductDetails); // GET /api/products/:id/details
router.post('/', createProduct);              // POST /api/products
router.patch('/:id', updateProduct);          // PATCH /api/products/:id
router.delete('/:id', deleteProduct);         // DELETE /api/products/:id

module.exports = router;
