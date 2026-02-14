const reviewsRepo = require('../repositories/reviews.repository');
const { sendSuccess, sendCreated, sendNotFound } = require('../utils/response');
const asyncHandler = require('../middlewares/asyncHandler');

/**
 * POST /api/reviews
 * Create or update a review for a product.
 * Body: { product_id, rating, title?, body?, order_id? }
 */
const createReview = asyncHandler(async (req, res) => {
    const { product_id, rating, title, body, order_id } = req.body;

    if (!product_id || !rating) {
        const err = new Error('product_id and rating (1-5) are required');
        err.statusCode = 400;
        throw err;
    }

    if (rating < 1 || rating > 5) {
        const err = new Error('Rating must be between 1 and 5');
        err.statusCode = 400;
        throw err;
    }

    const review = await reviewsRepo.createOrUpdate(
        req.user.customer_id,
        product_id,
        { rating, title, body, order_id }
    );

    sendCreated(res, review, 'Review submitted');
});

/**
 * GET /api/reviews/product/:productId
 * Get all reviews for a product (public).
 * Query: { limit?, offset?, sort? (recent|helpful|highest|lowest) }
 */
const getProductReviews = asyncHandler(async (req, res) => {
    const { limit = 20, offset = 0, sort = 'recent' } = req.query;

    const [reviews, summary] = await Promise.all([
        reviewsRepo.getByProduct(req.params.productId, {
            limit: parseInt(limit),
            offset: parseInt(offset),
            sort,
        }),
        reviewsRepo.getRatingSummary(req.params.productId),
    ]);

    sendSuccess(res, { summary, reviews }, 'Reviews retrieved');
});

/**
 * GET /api/reviews/product/:productId/summary
 * Get rating summary only (for product cards).
 */
const getRatingSummary = asyncHandler(async (req, res) => {
    const summary = await reviewsRepo.getRatingSummary(req.params.productId);
    sendSuccess(res, summary);
});

/**
 * GET /api/reviews/my
 * Get all reviews by the authenticated user.
 */
const getMyReviews = asyncHandler(async (req, res) => {
    const reviews = await reviewsRepo.getByCustomer(req.user.customer_id);
    sendSuccess(res, reviews, `Found ${reviews.length} reviews`);
});

/**
 * GET /api/reviews/my/:productId
 * Check if the authenticated user has reviewed a specific product.
 */
const getMyReviewForProduct = asyncHandler(async (req, res) => {
    const review = await reviewsRepo.getCustomerReview(req.user.customer_id, req.params.productId);

    if (!review) {
        return sendSuccess(res, { has_reviewed: false, review: null });
    }

    sendSuccess(res, { has_reviewed: true, review });
});

/**
 * DELETE /api/reviews/:reviewId
 * Delete the authenticated user's review.
 */
const deleteReview = asyncHandler(async (req, res) => {
    const deleted = await reviewsRepo.delete(req.params.reviewId, req.user.customer_id);

    if (!deleted) {
        return sendNotFound(res, 'Review');
    }

    sendSuccess(res, {}, 'Review deleted');
});

/**
 * POST /api/reviews/:reviewId/helpful
 * Mark a review as helpful (public, no auth needed).
 */
const markHelpful = asyncHandler(async (req, res) => {
    const updated = await reviewsRepo.markHelpful(req.params.reviewId);

    if (!updated) {
        return sendNotFound(res, 'Review');
    }

    sendSuccess(res, { helpful_count: updated.helpful_count }, 'Marked as helpful');
});

module.exports = {
    createReview,
    getProductReviews,
    getRatingSummary,
    getMyReviews,
    getMyReviewForProduct,
    deleteReview,
    markHelpful,
};
