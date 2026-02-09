-- Seed data for testing (optional)
-- Run this file after the schema: psql -U postgres -d ecommerce_db -f seed.sql

INSERT INTO inventory.products (sku, product_name, brand, category, description)
VALUES 
  ('SKU001', 'Sample Product 1', 'Brand A', 'Electronics', 'A sample electronic product'),
  ('SKU002', 'Sample Product 2', 'Brand B', 'Clothing', 'A sample clothing product');
