const inventoryRepository = require('../repositories/inventory.repository');
const productsRepository = require('../repositories/products.repository');
const { sendSuccess, sendError } = require('../utils/response');
const asyncHandler = require('../middlewares/asyncHandler');

/* POST /api/inventory/adjust */
const adjustStock = asyncHandler(async (req, res) => {
    const { productId, variantId, quantityChange, reason, referenceId } = req.body;

    if (!productId || !variantId || quantityChange === undefined || !reason) {
        const error = new Error('Product ID, Variant ID, Quantity Change, and Reason are required');
        error.statusCode = 400;
        throw error;
    }

    const movement = await inventoryRepository.adjustStock(
        productId,
        variantId,
        parseInt(quantityChange),
        reason,
        referenceId
    );

    sendSuccess(res, movement, 'Stock adjusted successfully');
});

/* GET /api/inventory/history/:productId */
const getStockHistory = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    const history = await inventoryRepository.getHistory(productId);
    sendSuccess(res, history);
});

module.exports = {
    adjustStock,
    getStockHistory
};
