const wishlistRepo = require('../repositories/wishlist.repository');
const { sendSuccess, sendCreated, sendNotFound } = require('../utils/response');
const asyncHandler = require('../middlewares/asyncHandler');

/**
 * POST /api/wishlist
 * Add a product to the authenticated user's wishlist.
 * Body: { product_id, variant_id? }
 */
const addToWishlist = asyncHandler(async (req, res) => {
    const { product_id, variant_id } = req.body;

    if (!product_id) {
        const err = new Error('product_id is required');
        err.statusCode = 400;
        throw err;
    }

    const item = await wishlistRepo.add(req.user.customer_id, product_id, variant_id || null);

    if (!item) {
        return sendSuccess(res, {}, 'Product is already in your wishlist');
    }

    sendCreated(res, item, 'Added to wishlist');
});

/**
 * DELETE /api/wishlist/:productId
 * Remove a product from wishlist.
 */
const removeFromWishlist = asyncHandler(async (req, res) => {
    const removed = await wishlistRepo.remove(req.user.customer_id, req.params.productId);

    if (!removed) {
        return sendNotFound(res, 'Wishlist item');
    }

    sendSuccess(res, {}, 'Removed from wishlist');
});

/**
 * GET /api/wishlist
 * Get the authenticated user's full wishlist with product details.
 */
const getWishlist = asyncHandler(async (req, res) => {
    const items = await wishlistRepo.getByCustomer(req.user.customer_id);
    const count = items.length;

    sendSuccess(res, { count, items }, 'Wishlist retrieved');
});

/**
 * GET /api/wishlist/check/:productId
 * Check if a product is in the user's wishlist (for heart icon toggle).
 */
const checkWishlist = asyncHandler(async (req, res) => {
    const inWishlist = await wishlistRepo.isInWishlist(req.user.customer_id, req.params.productId);
    sendSuccess(res, { in_wishlist: inWishlist });
});

/**
 * DELETE /api/wishlist
 * Clear entire wishlist.
 */
const clearWishlist = asyncHandler(async (req, res) => {
    await wishlistRepo.clearAll(req.user.customer_id);
    sendSuccess(res, {}, 'Wishlist cleared');
});

/**
 * POST /api/wishlist/:productId/move-to-cart
 * Move a wishlist item to cart (removes from wishlist, returns product info).
 */
const moveToCart = asyncHandler(async (req, res) => {
    const item = await wishlistRepo.moveToCart(req.user.customer_id, req.params.productId);

    if (!item) {
        return sendNotFound(res, 'Wishlist item');
    }

    sendSuccess(res, item, 'Item removed from wishlist. Use the returned variant_id to add to cart.');
});

module.exports = {
    addToWishlist,
    removeFromWishlist,
    getWishlist,
    checkWishlist,
    clearWishlist,
    moveToCart,
};
