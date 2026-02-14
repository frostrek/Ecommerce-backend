const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middlewares/auth.middleware');
const {
    createReview,
    getProductReviews,
    getRatingSummary,
    getMyReviews,
    getMyReviewForProduct,
    deleteReview,
    markHelpful,
} = require('../controllers/reviews.controller');

// ─── Public routes ─────────────────────────────────────────────────
router.get('/product/:productId', getProductReviews);              // GET  /api/reviews/product/:productId
router.get('/product/:productId/summary', getRatingSummary);       // GET  /api/reviews/product/:productId/summary
router.post('/:reviewId/helpful', markHelpful);                    // POST /api/reviews/:reviewId/helpful

// ─── Protected routes ─────────────────────────────────────────────
router.post('/', authenticate, createReview);                      // POST   /api/reviews
router.get('/my', authenticate, getMyReviews);                     // GET    /api/reviews/my
router.get('/my/:productId', authenticate, getMyReviewForProduct); // GET    /api/reviews/my/:productId
router.delete('/:reviewId', authenticate, deleteReview);           // DELETE /api/reviews/:reviewId

module.exports = router;
