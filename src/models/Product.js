const mongoose = require('mongoose');
const { WINE_TYPES, BOTTLE_SIZES, PRODUCT_STATUS, STOCK_STATUS } = require('../config/enums');

/**
 * Product Schema for Wine E-commerce Platform
 * This schema defines the structure for storing wine products in the database
 */
const productSchema = new mongoose.Schema(
  {
    // ==================== BASIC INFORMATION ====================
    name: {
      type: String,
      required: [true, 'Please provide product name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      default: '',
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    
    // ==================== IDENTIFICATION ====================
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    barcode: {
      type: String,
      trim: true,
      sparse: true, // Allows multiple null values but unique non-null values
    },

    // ==================== WINE-SPECIFIC FIELDS ====================
    wineType: {
      type: String,
      enum: {
        values: WINE_TYPES,
        message: '{VALUE} is not a valid wine type',
      },
      required: [true, 'Wine type is required'],
    },
    alcoholPercentage: {
      type: Number,
      min: [0, 'Alcohol percentage cannot be negative'],
      max: [100, 'Alcohol percentage cannot exceed 100'],
      required: [true, 'Alcohol percentage is required'],
    },
    volume: {
      type: String,
      enum: {
        values: BOTTLE_SIZES,
        message: '{VALUE} is not a valid bottle size',
      },
      default: '750ml',
    },
    vintage: {
      type: Number,
      min: [1800, 'Vintage year seems too old'],
      max: [new Date().getFullYear(), 'Vintage year cannot be in the future'],
    },
    
    // ==================== ORIGIN & PRODUCER ====================
    countryOfOrigin: {
      type: String,
      trim: true,
    },
    region: {
      type: String,
      trim: true,
    },
    winery: {
      type: String,
      trim: true,
    },

    // ==================== PRICING ====================
    price: {
      type: Number,
      required: [true, 'Please provide product price'],
      min: [0, 'Price must be greater than 0'],
    },
    compareAtPrice: {
      type: Number,
      min: [0, 'Compare price must be greater than 0'],
    },

    // ==================== INVENTORY ====================
    quantity: {
      type: Number,
      default: 0,
      min: [0, 'Quantity cannot be negative'],
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
      min: [0, 'Threshold cannot be negative'],
    },
    stockStatus: {
      type: String,
      enum: STOCK_STATUS,
      default: 'in_stock',
    },
    stockVisibility: {
      type: Boolean,
      default: true, // Show stock count to customers
    },

    // ==================== CATEGORIZATION ====================
    category: {
      type: String,
      default: '',
    },

    // ==================== MEDIA ====================
    images: [
      {
        url: { type: String, required: true },
        alt: { type: String, default: '' },
        isPrimary: { type: Boolean, default: false },
      },
    ],
    videoUrl: {
      type: String,
    },

    // ==================== SEO ====================
    seo: {
      metaTitle: { type: String, maxlength: 60 },
      metaDescription: { type: String, maxlength: 160 },
      slug: { type: String, lowercase: true, trim: true },
    },

    // ==================== PRODUCT STATUS ====================
    status: {
      type: String,
      enum: PRODUCT_STATUS,
      default: 'draft',
    },
    isActive: {
      type: Boolean,
      default: true, // For soft delete
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isBestSeller: {
      type: Boolean,
      default: false,
    },
    isNewArrival: {
      type: Boolean,
      default: false,
    },

    // ==================== SCHEDULING ====================
    availableFrom: {
      type: Date,
    },
    availableTo: {
      type: Date,
    },

    // ==================== RELATIONSHIPS ====================
    relatedProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    crossSellProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    upsellProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],

    // ==================== VARIANTS ====================
    variants: [
      {
        size: { type: String, enum: BOTTLE_SIZES },
        price: { type: Number, min: 0 },
        quantity: { type: Number, min: 0, default: 0 },
        sku: { type: String },
      },
    ],
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// ==================== INDEXES ====================
// Indexes make searching faster (like an index in a book)
productSchema.index({ name: 'text', description: 'text' }); // For text search
productSchema.index({ wineType: 1, countryOfOrigin: 1, vintage: 1 }); // Compound index for filtering
productSchema.index({ price: 1 }); // For price sorting
productSchema.index({ status: 1, isActive: 1 }); // For filtering active/published products
productSchema.index({ sku: 1 }, { unique: true }); // SKU must be unique

// ==================== VIRTUAL FIELDS ====================
// Virtual fields are computed on-the-fly (not stored in database)
productSchema.virtual('isInStock').get(function () {
  return this.quantity > 0;
});

productSchema.virtual('isLowStock').get(function () {
  return this.quantity > 0 && this.quantity <= this.lowStockThreshold;
});

// ==================== PRE-SAVE MIDDLEWARE ====================
// Runs before saving to database
// NOTE: Mongoose 9.x no longer uses next() callback - just return or throw
productSchema.pre('save', function () {
  // Auto-update stock status based on quantity
  if (this.quantity === 0) {
    this.stockStatus = 'out_of_stock';
  } else if (this.quantity <= this.lowStockThreshold) {
    this.stockStatus = 'low_stock';
  } else {
    this.stockStatus = 'in_stock';
  }
  
  // Auto-generate slug from name if not provided
  if (!this.seo?.slug && this.name) {
    const slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    if (this.seo) {
      this.seo.slug = slug;
    } else {
      this.seo = { slug };
    }
  }
});

// Include virtuals when converting to JSON
productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
