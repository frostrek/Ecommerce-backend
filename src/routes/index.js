const express = require('express');
const router = express.Router();

// Import route modules
const productsRoutes = require('./products.routes');
const cartRoutes = require('./cart.routes');

// Mount routes
router.use('/products', productsRoutes);
router.use('/inventory', require('./inventory.routes'));
router.use('/cart', cartRoutes);

// Future routes (uncomment when ready)
// router.use('/users', usersRoutes);
router.use('/orders', require('./orders.routes'));
// router.use('/auth', authRoutes);

module.exports = router;
