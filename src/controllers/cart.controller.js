const cartRepository = require('../repositories/cart.repository');
const { sendSuccess, sendCreated, sendNotFound } = require('../utils/response');
const asyncHandler = require('../middlewares/asyncHandler');

const createCart = asyncHandler(async (req, res) => {
    const { customer_id } = req.body;

    const { cart, created } = await cartRepository.findOrCreateCart(customer_id || null);

    if (created) {
        return sendCreated(res, cart, 'Cart created successfully');
    }

    sendSuccess(res, cart, 'Existing cart retrieved');
});


const addItem = asyncHandler(async (req, res) => {
    const { cart_id, variant_id, quantity } = req.body;

    if (!cart_id || !variant_id) {
        const error = new Error('cart_id and variant_id are required');
        error.statusCode = 400;
        throw error;
    }

    if (!quantity || quantity < 1) {
        const error = new Error('quantity must be at least 1');
        error.statusCode = 400;
        throw error;
    }

    // Verify cart exists
    const cart = await cartRepository.findById(cart_id);
    if (!cart) {
        return sendNotFound(res, 'Cart');
    }

    const cartItem = await cartRepository.addItem(cart_id, variant_id, parseInt(quantity));

    sendCreated(res, cartItem, 'Item added to cart');
});

/**
 * PATCH /api/cart/items/:itemId
 * Update item quantity.
 * Body: { quantity }
 */
const updateItem = asyncHandler(async (req, res) => {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
        const error = new Error('quantity must be at least 1');
        error.statusCode = 400;
        throw error;
    }

    const updatedItem = await cartRepository.updateItemQuantity(itemId, parseInt(quantity));

    sendSuccess(res, updatedItem, 'Cart item updated');
});

/**
 * DELETE /api/cart/items/:itemId
 * Remove item from cart.
 */
const removeItem = asyncHandler(async (req, res) => {
    const { itemId } = req.params;

    const removedItem = await cartRepository.removeItem(itemId);
    if (!removedItem) {
        return sendNotFound(res, 'Cart item');
    }

    sendSuccess(res, {}, 'Item removed from cart');
});

/**
 * GET /api/cart
 * Get full cart with items and calculated totals.
 * Query: { cart_id } or { customer_id }
 */
const getCart = asyncHandler(async (req, res) => {
    const { cart_id, customer_id } = req.query;
    const { cartId: pathCartId } = req.params; // Support /api/cart/:cartId

    let targetCartId = pathCartId || cart_id;

    // If customer_id provided instead of cart_id, find the customer's cart
    if (!targetCartId && customer_id) {
        const cart = await cartRepository.findByCustomerId(customer_id);
        if (!cart) {
            return sendNotFound(res, 'Cart');
        }
        targetCartId = cart.cart_id;
    }

    if (!targetCartId) {
        const error = new Error('cart_id or customer_id is required');
        error.statusCode = 400;
        throw error;
    }

    const fullCart = await cartRepository.getCartWithItems(targetCartId);
    if (!fullCart) {
        return sendNotFound(res, 'Cart');
    }

    sendSuccess(res, fullCart, 'Cart retrieved successfully');
});

module.exports = {
    createCart,
    addItem,
    updateItem,
    removeItem,
    getCart,
};
