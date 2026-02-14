-- Add role column to customers table for admin access control
-- Safe: uses IF NOT EXISTS pattern

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'inventory'
          AND table_name = 'customers'
          AND column_name = 'role'
    ) THEN
        ALTER TABLE inventory.customers
        ADD COLUMN role VARCHAR(20) DEFAULT 'customer' NOT NULL;

        -- Create index for fast role lookups
        CREATE INDEX IF NOT EXISTS idx_customers_role
        ON inventory.customers (role);
    END IF;
END $$;
