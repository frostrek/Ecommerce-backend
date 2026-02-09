const productsRepository = require('../repositories/products.repository');
const { sendSuccess, sendCreated, sendNotFound } = require('../utils/response');
const asyncHandler = require('../middlewares/asyncHandler');

/**
 * @desc    Get all products
 * @route   GET /api/products
 */
const getAllProducts = asyncHandler(async (req, res) => {
    const { limit = 100, offset = 0, category } = req.query;

    let products;
    if (category) {
        products = await productsRepository.findByCategory(category, parseInt(limit));
    } else {
        products = await productsRepository.findAll({ limit: parseInt(limit), offset: parseInt(offset) });
    }

    sendSuccess(res, products, 'Products retrieved successfully');
});

/**
 * @desc    Get product by ID
 * @route   GET /api/products/:id
 */
const getProductById = asyncHandler(async (req, res) => {
    const product = await productsRepository.findById(req.params.id);

    if (!product) {
        return sendNotFound(res, 'Product');
    }

    sendSuccess(res, product);
});

/**
 * @desc    Get product with all details (specs, packaging, variants, etc.)
 * @route   GET /api/products/:id/details
 */
const getProductDetails = asyncHandler(async (req, res) => {
    const product = await productsRepository.findByIdWithDetails(req.params.id);

    if (!product) {
        return sendNotFound(res, 'Product');
    }

    sendSuccess(res, product);
});

/**
 * @desc    Search products
 * @route   GET /api/products/search?q=term
 */
const searchProducts = asyncHandler(async (req, res) => {
    const { q, limit = 50 } = req.query;

    if (!q) {
        return sendSuccess(res, [], 'Please provide a search term');
    }

    const products = await productsRepository.search(q, parseInt(limit));
    sendSuccess(res, products, `Found ${products.length} products`);
});

/**
 * @desc    Create new product
 * @route   POST /api/products
 */
const createProduct = asyncHandler(async (req, res) => {
    const { sku, product_name, brand, category, sub_category, description, unit_of_measure, intended_use } = req.body;

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
    });

    sendCreated(res, newProduct, 'Product created successfully');
});

/**
 * @desc    Update product
 * @route   PATCH /api/products/:id
 */
const updateProduct = asyncHandler(async (req, res) => {
    const { sku, product_name, brand, category, sub_category, description, unit_of_measure, intended_use } = req.body;

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

    const updatedProduct = await productsRepository.update(req.params.id, updateData);

    if (!updatedProduct) {
        return sendNotFound(res, 'Product');
    }

    sendSuccess(res, updatedProduct, 'Product updated successfully');
});

/**
 * @desc    Delete product
 * @route   DELETE /api/products/:id
 */
const deleteProduct = asyncHandler(async (req, res) => {
    const deletedProduct = await productsRepository.delete(req.params.id);

    if (!deletedProduct) {
        return sendNotFound(res, 'Product');
    }

    sendSuccess(res, {}, 'Product deleted successfully');
});

module.exports = {
    getAllProducts,
    getProductById,
    getProductDetails,
    searchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
};
