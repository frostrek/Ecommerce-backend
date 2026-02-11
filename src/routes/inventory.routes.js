const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');

router.post('/adjust', inventoryController.adjustStock);
router.get('/history/:productId', inventoryController.getStockHistory);

module.exports = router;
