module.exports = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_PREFIX: '/api',

  // Validation limits
  MAX_NAME_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 2000,
  MAX_SKU_LENGTH: 50,

  // Pagination defaults
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 200,

  // Enums
  WINE_TYPES: ['Red', 'White', 'Rosé', 'Sparkling', 'Dessert', 'Fortified'],
  BOTTLE_SIZES: ['187ml', '375ml', '750ml', '1L', '1.5L', '3L', '5L'],
  PRODUCT_STATUS: ['draft', 'published', 'archived'],
  STOCK_STATUS: ['in_stock', 'low_stock', 'out_of_stock', 'discontinued'],
};
