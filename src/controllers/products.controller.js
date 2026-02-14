const productsRepository = require('../repositories/products.repository');
const { sendSuccess, sendCreated, sendNotFound } = require('../utils/response');
const asyncHandler = require('../middlewares/asyncHandler');

/* GET /api/products */
const getAllProducts = asyncHandler(async (req, res) => {
    const { limit = 100, offset = 0, category, status, brand, sort } = req.query;

    let products;
    if (category) {
        products = await productsRepository.findByCategory(category, parseInt(limit));
    } else {
        products = await productsRepository.findAllFiltered({
            limit: parseInt(limit),
            offset: parseInt(offset),
            status,
            brand,
            sort,
        });
    }

    sendSuccess(res, products, 'Products retrieved successfully');
});

/* GET /api/products/:id */
const getProductById = asyncHandler(async (req, res) => {
    const product = await productsRepository.findById(req.params.id);

    if (!product) {
        return sendNotFound(res, 'Product');
    }

    sendSuccess(res, product);
});

/* GET /api/products/:id/details  */
const getProductDetails = asyncHandler(async (req, res) => {
    const product = await productsRepository.findByIdWithDetails(req.params.id);

    if (!product) {
        return sendNotFound(res, 'Product');
    }

    sendSuccess(res, product);
});

/* GET /api/products/search?q=term */
const searchProducts = asyncHandler(async (req, res) => {
    const { q, limit = 50 } = req.query;

    if (!q) {
        return sendSuccess(res, [], 'Please provide a search term');
    }

    const products = await productsRepository.search(q, parseInt(limit));
    sendSuccess(res, products, `Found ${products.length} products`);
});

/* POST /api/products */
const createProduct = asyncHandler(async (req, res) => {
    const { sku, product_name, brand, category, sub_category, description, unit_of_measure, intended_use, price } = req.body;

    if (!sku || !product_name) {
        const error = new Error('SKU and product_name are required');
        error.statusCode = 400;
        throw error;
    }

    const newProduct = await productsRepository.create({
        sku,
        product_name,
        brand,
        category,
        sub_category,
        description,
        unit_of_measure,
        intended_use,
        price,
    });

    sendCreated(res, newProduct, 'Product created successfully');
});

/* PATCH /api/products/:id */
const updateProduct = asyncHandler(async (req, res) => {
    const { sku, product_name, brand, category, sub_category, description, unit_of_measure, intended_use, price } = req.body;

    // Build update object with only provided fields
    const updateData = {};
    if (sku !== undefined) updateData.sku = sku;
    if (product_name !== undefined) updateData.product_name = product_name;
    if (brand !== undefined) updateData.brand = brand;
    if (category !== undefined) updateData.category = category;
    if (sub_category !== undefined) updateData.sub_category = sub_category;
    if (description !== undefined) updateData.description = description;
    if (unit_of_measure !== undefined) updateData.unit_of_measure = unit_of_measure;
    if (intended_use !== undefined) updateData.intended_use = intended_use;
    if (price !== undefined) updateData.price = price;

    const updatedProduct = await productsRepository.update(req.params.id, updateData);

    if (!updatedProduct) {
        return sendNotFound(res, 'Product');
    }

    sendSuccess(res, updatedProduct, 'Product updated successfully');
});

/* DELETE /api/products/:id */
const deleteProduct = asyncHandler(async (req, res) => {
    const deletedProduct = await productsRepository.delete(req.params.id);

    if (!deletedProduct) {
        return sendNotFound(res, 'Product');
    }

    sendSuccess(res, {}, 'Product deleted successfully');
});

/* GET /api/products/enums */
const getEnums = (req, res) => {
    const { WINE_TYPES, BOTTLE_SIZES, PRODUCT_STATUS, STOCK_STATUS } = require('../config/constants');
    sendSuccess(res, {
        wineTypes: WINE_TYPES,
        bottleSizes: BOTTLE_SIZES,
        productStatus: PRODUCT_STATUS,
        stockStatus: STOCK_STATUS
    });
};

/* POST /api/products/:id/duplicate */
const duplicateProduct = asyncHandler(async (req, res) => {
    const { newSku, newName } = req.body;
    if (!newSku || !newName) {
        const error = new Error('New SKU and Name are required');
        error.statusCode = 400;
        throw error;
    }

    const newProduct = await productsRepository.duplicate(req.params.id, newSku, newName);
    if (!newProduct) return sendNotFound(res, 'Original Product');

    sendCreated(res, newProduct, 'Product duplicated successfully');
});

/* PATCH /api/products/:id/stock  */
const updateStock = asyncHandler(async (req, res) => {
    const { quantity } = req.body;
    if (quantity === undefined || quantity < 0) {
        const error = new Error('Valid quantity is required');
        error.statusCode = 400;
        throw error;
    }

    const updated = await productsRepository.updateStock(req.params.id, quantity);
    if (!updated) return sendNotFound(res, 'Product');

    sendSuccess(res, updated, 'Stock updated successfully');
});

/* GET /api/products/low-stock-alerts */
const getLowStockProducts = asyncHandler(async (req, res) => {
    const products = await productsRepository.findLowStock();
    sendSuccess(res, products);
});

module.exports = {
    getAllProducts,
    getProductById,
    getProductDetails,
    searchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    getEnums,
    duplicateProduct,
    updateStock,
    getLowStockProducts,
};
