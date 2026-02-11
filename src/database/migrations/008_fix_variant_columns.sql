-- Add e-commerce columns to product_variants (these were in 005 CREATE TABLE IF NOT EXISTS 
-- which was skipped because 001 already created the table)
ALTER TABLE inventory.product_variants
    ADD COLUMN IF NOT EXISTS size_label TEXT,
    ADD COLUMN IF NOT EXISTS volume_ml INTEGER,
    ADD COLUMN IF NOT EXISTS price NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS discounted_price NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS tax_percentage NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS alcohol_percentage NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR',
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Backfill: set stock_quantity from the old quantity column (only if it still exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'inventory'
          AND table_name = 'product_variants'
          AND column_name = 'quantity'
    ) THEN
        EXECUTE 'UPDATE inventory.product_variants SET stock_quantity = COALESCE(quantity, 0) WHERE stock_quantity IS NULL OR stock_quantity = 0';
    END IF;
END $$;
