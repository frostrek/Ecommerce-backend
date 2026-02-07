/**
 * Enums and Constants for Wine E-commerce Platform
 * These are predefined lists of valid values for various fields
 */

// Wine Types - The main categories of wine
const WINE_TYPES = ['Red', 'White', 'Rosé', 'Sparkling', 'Dessert', 'Fortified'];

// Bottle Sizes - Standard wine bottle volumes
const BOTTLE_SIZES = ['187ml', '375ml', '750ml', '1L', '1.5L', '3L', '5L'];

// Product Status - Lifecycle states of a product
const PRODUCT_STATUS = ['draft', 'published', 'archived'];

// Stock Status - Inventory availability states
const STOCK_STATUS = ['in_stock', 'low_stock', 'out_of_stock', 'discontinued'];

module.exports = {
  WINE_TYPES,
  BOTTLE_SIZES,
  PRODUCT_STATUS,
  STOCK_STATUS,
};
