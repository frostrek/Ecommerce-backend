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
const {
    uploadProductImage,
    getProductImages,
    setPrimaryImage,
    deleteProductImage,
} = require('../controllers/images.controller');

// Search must come before :id to avoid conflict
router.get('/search', searchProducts);        // GET /api/products/search?q=term

// Standard CRUD routes
router.get('/', getAllProducts);              // GET /api/products
router.get('/:id', getProductById);           // GET /api/products/:id
router.get('/:id/details', getProductDetails); // GET /api/products/:id/details
router.post('/', createProduct);              // POST /api/products
router.patch('/:id', updateProduct);          // PATCH /api/products/:id
router.delete('/:id', deleteProduct);         // DELETE /api/products/:id

// New features routes
router.get('/enums', require('../controllers/products.controller').getEnums);
router.get('/low-stock-alerts', require('../controllers/products.controller').getLowStockProducts);
router.post('/:id/duplicate', require('../controllers/products.controller').duplicateProduct);
router.patch('/:id/stock', require('../controllers/products.controller').updateStock);

// Image routes
router.post('/:id/images', uploadProductImage);                          // POST   /api/products/:id/images
router.get('/:id/images', getProductImages);                             // GET    /api/products/:id/images
router.patch('/:productId/images/:assetId/primary', setPrimaryImage);    // PATCH  /api/products/:productId/images/:assetId/primary
router.delete('/:productId/images/:assetId', deleteProductImage);        // DELETE /api/products/:productId/images/:assetId

module.exports = router;
