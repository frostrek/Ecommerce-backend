const express = require('express');
const router = express.Router();
const {
    createCart,
    addItem,
    updateItem,
    removeItem,
    getCart,
} = require('../controllers/cart.controller');

// Cart management
router.post('/', createCart);              // POST   /api/cart          — Create or get existing cart
router.get('/', getCart);                  // GET    /api/cart          — Get full cart (query params)
router.get('/:cartId', getCart);           // GET    /api/cart/:cartId  — Get full cart (path param)

// Cart items
router.post('/items', addItem);            // POST   /api/cart/items    — Add item to cart
router.patch('/items/:itemId', updateItem); // PATCH  /api/cart/items/:itemId — Update quantity
router.delete('/items/:itemId', removeItem); // DELETE /api/cart/items/:itemId — Remove item

module.exports = router;
