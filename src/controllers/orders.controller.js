const ordersRepository = require('../repositories/orders.repository');
const { sendSuccess, sendCreated, sendNotFound } = require('../utils/response');
const asyncHandler = require('../middlewares/asyncHandler');

/**
 * POST /api/orders/checkout
 * Convert a cart into an order.
 * Body: { cart_id, customer_id, shipping_address_id?, billing_address_id? }
 */
const checkout = asyncHandler(async (req, res) => {
    const { cart_id, customer_id, shipping_address_id, billing_address_id } = req.body;

    if (!cart_id || !customer_id) {
        const error = new Error('cart_id and customer_id are required');
        error.statusCode = 400;
        throw error;
    }

    const order = await ordersRepository.checkout(
        cart_id,
        customer_id,
        shipping_address_id || null,
        billing_address_id || null
    );

    sendCreated(res, order, 'Order placed successfully');
});

/**
 * GET /api/orders
 * Get orders — if customer_id is provided, returns that customer's orders.
 * Otherwise returns all orders (Admin).
 * Query: { customer_id?, status?, limit?, offset? }
 */
const getOrders = asyncHandler(async (req, res) => {
    const { customer_id, status, limit = 50, offset = 0 } = req.query;

    let orders;

    if (customer_id) {
        orders = await ordersRepository.findByCustomer(customer_id, parseInt(limit), parseInt(offset));
        sendSuccess(res, orders, `Found ${orders.length} orders`);
    } else {
        orders = await ordersRepository.findAllOrders({
            limit: parseInt(limit),
            offset: parseInt(offset),
            status: status || null,
        });
        sendSuccess(res, orders, `Found ${orders.length} orders`);
    }
});

/**
 * GET /api/orders/:id
 * Get a single order with full item details.
 */
const getOrderById = asyncHandler(async (req, res) => {
    const order = await ordersRepository.findByIdWithItems(req.params.id);

    if (!order) {
        return sendNotFound(res, 'Order');
    }

    sendSuccess(res, order);
});

/**
 * PATCH /api/orders/:id/status
 * Update order status (Admin).
 * Body: { order_status }
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
    const { order_status } = req.body;

    if (!order_status) {
        const error = new Error('order_status is required');
        error.statusCode = 400;
        throw error;
    }

    const updated = await ordersRepository.updateStatus(req.params.id, order_status);

    if (!updated) {
        return sendNotFound(res, 'Order');
    }

    sendSuccess(res, updated, 'Order status updated');
});

/**
 * PATCH /api/orders/:id/payment
 * Update payment status.
 * Body: { payment_status }
 */
const updatePaymentStatus = asyncHandler(async (req, res) => {
    const { payment_status } = req.body;

    if (!payment_status) {
        const error = new Error('payment_status is required');
        error.statusCode = 400;
        throw error;
    }

    const updated = await ordersRepository.updatePaymentStatus(req.params.id, payment_status);

    if (!updated) {
        return sendNotFound(res, 'Order');
    }

    sendSuccess(res, updated, 'Payment status updated');
});

/**
 * POST /api/orders/direct
 * Create an order directly without requiring a backend cart.
 * Designed for frontends using localStorage cart.
 * Body: { customer_id?, items: [{ product_id, quantity, unit_price? }], shipping_address?, payment_method? }
 */
const directOrder = asyncHandler(async (req, res) => {
    const {
        customer_id,
        customer_email,
        customer_name,
        items,
        shipping_address,
        shipping_address_id,
        payment_method,
        order_notes,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
        const error = new Error('items array is required and must not be empty');
        error.statusCode = 400;
        throw error;
    }

    // Validate each item has at least product_id or variant_id + quantity
    for (const item of items) {
        if (!item.product_id && !item.variant_id) {
            const error = new Error('Each item must have product_id or variant_id');
            error.statusCode = 400;
            throw error;
        }
        if (!item.quantity || item.quantity < 1) {
            const error = new Error('Each item must have quantity >= 1');
            error.statusCode = 400;
            throw error;
        }
    }

    const order = await ordersRepository.directCheckout({
        customer_id: customer_id || null,
        customer_email: customer_email || null,
        customer_name: customer_name || null,
        items,
        shipping_address: shipping_address || null,
        shipping_address_id: shipping_address_id || null,
        payment_method: payment_method || 'cod',
        order_notes: order_notes || null,
    });

    sendCreated(res, order, 'Order placed successfully');
});

module.exports = {
    checkout,
    getOrders,
    getOrderById,
    updateOrderStatus,
    updatePaymentStatus,
    directOrder,
};
