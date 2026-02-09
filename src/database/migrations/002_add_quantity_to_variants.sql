ALTER TABLE inventory.product_variants ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0 CHECK (quantity >= 0);
