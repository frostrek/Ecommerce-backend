const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/auth.middleware');
const {
    addToWishlist,
    removeFromWishlist,
    getWishlist,
    checkWishlist,
    clearWishlist,
    moveToCart,
} = require('../controllers/wishlist.controller');

// All wishlist routes require authentication
router.use(authenticate);

router.get('/', getWishlist);                                  // GET    /api/wishlist
router.post('/', addToWishlist);                               // POST   /api/wishlist
router.delete('/', clearWishlist);                             // DELETE /api/wishlist (clear all)
router.get('/check/:productId', checkWishlist);                // GET    /api/wishlist/check/:productId
router.delete('/:productId', removeFromWishlist);              // DELETE /api/wishlist/:productId
router.post('/:productId/move-to-cart', moveToCart);           // POST   /api/wishlist/:productId/move-to-cart

module.exports = router;
