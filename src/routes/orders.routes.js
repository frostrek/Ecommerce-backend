const express = require('express');
const router = express.Router();
const {
    checkout,
    getOrders,
    getOrderById,
    updateOrderStatus,
    updatePaymentStatus,
} = require('../controllers/orders.controller');

// Checkout (Cart → Order)
router.post('/checkout', checkout);          // POST   /api/orders/checkout

// Order listing
router.get('/', getOrders);                  // GET    /api/orders?customer_id=&status=&limit=&offset=
router.get('/:id', getOrderById);            // GET    /api/orders/:id

// Admin: status management
router.patch('/:id/status', updateOrderStatus);     // PATCH  /api/orders/:id/status
router.patch('/:id/payment', updatePaymentStatus);  // PATCH  /api/orders/:id/payment

module.exports = router;
