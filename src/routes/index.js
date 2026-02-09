const express = require('express');
const router = express.Router();

// Import route modules
const productsRoutes = require('./products.routes');

// Mount routes
router.use('/products', productsRoutes);

// Future routes (uncomment when ready)
// router.use('/users', usersRoutes);
// router.use('/orders', ordersRoutes);
// router.use('/cart', cartRoutes);
// router.use('/auth', authRoutes);

module.exports = router;
