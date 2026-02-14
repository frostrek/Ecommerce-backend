const express = require('express');
const router = express.Router();

// Import route modules
const productsRoutes = require('./products.routes');
const cartRoutes = require('./cart.routes');

// Mount routes
router.use('/products', productsRoutes);
router.use('/inventory', require('./inventory.routes'));
router.use('/cart', cartRoutes);

// Auth
router.use('/auth', require('./auth.routes'));

// Orders & Customers
router.use('/orders', require('./orders.routes'));
router.use('/customers', require('./customers.routes'));

module.exports = router;
