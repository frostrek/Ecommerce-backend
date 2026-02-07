const Product = require('../models/Product');
const { WINE_TYPES, BOTTLE_SIZES, PRODUCT_STATUS } = require('../config/enums');

/**
 * GET /api/products
 * Get all products with filtering, sorting, and pagination
 */
const getAllProducts = async (req, res) => {
  try {
    // ==================== PAGINATION ====================
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // ==================== BUILD FILTER OBJECT ====================
    const filter = { isActive: true }; // Only show active (non-deleted) products

    // Status filter - only apply if explicitly requested
    if (req.query.status) {
      filter.status = req.query.status;
    }
    // If no status filter passed, show ALL statuses (draft, published, archived)

    // Wine type filter
    if (req.query.wineType) {
      filter.wineType = req.query.wineType;
    }

    // Country filter
    if (req.query.country) {
      filter.countryOfOrigin = { $regex: req.query.country, $options: 'i' };
    }

    // Region filter
    if (req.query.region) {
      filter.region = { $regex: req.query.region, $options: 'i' };
    }

    // Winery filter
    if (req.query.winery) {
      filter.winery = { $regex: req.query.winery, $options: 'i' };
    }

    // Price range filter
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) filter.price.$lte = parseFloat(req.query.maxPrice);
    }

    // Alcohol percentage range filter
    if (req.query.minAbv || req.query.maxAbv) {
      filter.alcoholPercentage = {};
      if (req.query.minAbv) filter.alcoholPercentage.$gte = parseFloat(req.query.minAbv);
      if (req.query.maxAbv) filter.alcoholPercentage.$lte = parseFloat(req.query.maxAbv);
    }

    // Vintage filter
    if (req.query.vintage) {
      filter.vintage = parseInt(req.query.vintage);
    }

    // Volume filter
    if (req.query.volume) {
      filter.volume = req.query.volume;
    }

    // Stock filter
    if (req.query.inStock === 'true') {
      filter.quantity = { $gt: 0 };
    }

    // Featured filter
    if (req.query.featured === 'true') {
      filter.isFeatured = true;
    }

    // Best seller filter
    if (req.query.bestSeller === 'true') {
      filter.isBestSeller = true;
    }

    // New arrival filter
    if (req.query.newArrival === 'true') {
      filter.isNewArrival = true;
    }

    // Category filter
    if (req.query.category) {
      filter.category = { $regex: req.query.category, $options: 'i' };
    }

    // Text search
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    // ==================== SORTING ====================
    let sortOption = { createdAt: -1 }; // Default: newest first

    if (req.query.sort) {
      const sortField = req.query.sort.startsWith('-') 
        ? req.query.sort.substring(1) 
        : req.query.sort;
      const sortOrder = req.query.sort.startsWith('-') ? -1 : 1;
      sortOption = { [sortField]: sortOrder };
    }

    // ==================== EXECUTE QUERY ====================
    const products = await Product.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean(); // lean() for better performance (plain JS objects)

    // Get total count for pagination info
    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    res.status(200).json({
      success: true,
      count: products.length,
      totalProducts,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message,
    });
  }
};

/**
 * GET /api/products/:id
 * Get a single product by ID
 */
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('relatedProducts', 'name price images')
      .populate('crossSellProducts', 'name price images')
      .populate('upsellProducts', 'name price images');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product not found with id: ${req.params.id}`,
      });
    }

    // Don't show deleted products
    if (!product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: error.message,
    });
  }
};

/**
 * POST /api/products
 * Create a new product
 */
const createProduct = async (req, res) => {
  try {
    const newProduct = await Product.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: newProduct,
    });
  } catch (error) {
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: messages,
      });
    }

    // Handle duplicate SKU error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A product with this SKU already exists',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message,
    });
  }
};

/**
 * PATCH /api/products/:id
 * Update a product
 */
const updateProduct = async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true, // Return updated document
        runValidators: true, // Run schema validators
      }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: `Product not found with id: ${req.params.id}`,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: messages,
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A product with this SKU already exists',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/products/:id
 * Soft delete a product (sets isActive to false instead of removing)
 */
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false, status: 'archived' },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product not found with id: ${req.params.id}`,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: error.message,
    });
  }
};

/**
 * POST /api/products/:id/duplicate
 * Duplicate an existing product
 */
const duplicateProduct = async (req, res) => {
  try {
    const originalProduct = await Product.findById(req.params.id);

    if (!originalProduct) {
      return res.status(404).json({
        success: false,
        message: `Product not found with id: ${req.params.id}`,
      });
    }

    // Convert to plain object and remove unique fields
    const productData = originalProduct.toObject();
    delete productData._id;
    delete productData.createdAt;
    delete productData.updatedAt;
    
    // Generate new unique values
    productData.sku = `${originalProduct.sku}-COPY-${Date.now()}`;
    productData.name = `${originalProduct.name} (Copy)`;
    productData.status = 'draft'; // Duplicated products start as draft
    if (productData.seo?.slug) {
      productData.seo.slug = `${productData.seo.slug}-copy-${Date.now()}`;
    }

    const duplicatedProduct = await Product.create(productData);

    res.status(201).json({
      success: true,
      message: 'Product duplicated successfully',
      data: duplicatedProduct,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error duplicating product',
      error: error.message,
    });
  }
};

/**
 * PATCH /api/products/:id/stock
 * Update product stock (restock or adjust)
 */
const updateStock = async (req, res) => {
  try {
    const { quantity, operation } = req.body;

    if (quantity === undefined || quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid quantity',
      });
    }

    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product not found with id: ${req.params.id}`,
      });
    }

    // Update quantity based on operation
    if (operation === 'add') {
      product.quantity += quantity;
    } else if (operation === 'subtract') {
      product.quantity = Math.max(0, product.quantity - quantity);
    } else {
      product.quantity = quantity; // Direct set
    }

    await product.save(); // This triggers the pre-save middleware

    res.status(200).json({
      success: true,
      message: 'Stock updated successfully',
      data: {
        sku: product.sku,
        quantity: product.quantity,
        stockStatus: product.stockStatus,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating stock',
      error: error.message,
    });
  }
};

/**
 * GET /api/products/low-stock
 * Get all products with low stock (for admin alerts)
 */
const getLowStockProducts = async (req, res) => {
  try {
    const products = await Product.find({
      isActive: true,
      $expr: { $lte: ['$quantity', '$lowStockThreshold'] },
      quantity: { $gt: 0 },
    })
      .select('name sku quantity lowStockThreshold stockStatus')
      .sort({ quantity: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching low stock products',
      error: error.message,
    });
  }
};

/**
 * GET /api/products/enums
 * Get valid values for dropdown fields (frontend helper)
 */
const getEnums = async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      wineTypes: WINE_TYPES,
      bottleSizes: BOTTLE_SIZES,
      productStatus: PRODUCT_STATUS,
    },
  });
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  duplicateProduct,
  updateStock,
  getLowStockProducts,
  getEnums,
};
