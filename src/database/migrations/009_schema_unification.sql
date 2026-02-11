-- ============================================================
-- Migration 009: Schema Unification
-- Resolves all remaining conflicts from the 001/005 overlap
-- ============================================================

-- 1. Add missing timestamp columns to product_variants
--    (001 created the table without created_at/updated_at,
--     and inventory.repository.js references updated_at)
ALTER TABLE inventory.product_variants
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 2. Add FK from carts.customer_id -> customers.customer_id
--    (005 created carts before 006 created customers, so no FK was possible)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_carts_customer'
    ) THEN
        ALTER TABLE inventory.carts
            ADD CONSTRAINT fk_carts_customer
            FOREIGN KEY (customer_id)
            REFERENCES inventory.customers(customer_id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Add FK from orders.customer_id -> customers.customer_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_orders_customer'
    ) THEN
        ALTER TABLE inventory.orders
            ADD CONSTRAINT fk_orders_customer
            FOREIGN KEY (customer_id)
            REFERENCES inventory.customers(customer_id)
            ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Add performance indexes on orders and payments tables
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON inventory.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON inventory.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON inventory.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON inventory.payments(order_id);
