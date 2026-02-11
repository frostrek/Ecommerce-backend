-- ============================================================
-- Migration 010: DESTRUCTIVE Schema Reset
-- ⚠️ WARNING: This DROPS and RECREATES tables. ALL DATA LOST.
-- ============================================================

-- ============================================================
-- PHASE 1: DROP (dependents first, then parents)
-- ============================================================

DROP TABLE IF EXISTS inventory.cart_items CASCADE;
DROP TABLE IF EXISTS inventory.order_items CASCADE;
DROP TABLE IF EXISTS inventory.payments CASCADE;
DROP TABLE IF EXISTS inventory.stock_movements CASCADE;
DROP TABLE IF EXISTS inventory.carts CASCADE;
DROP TABLE IF EXISTS inventory.orders CASCADE;
DROP TABLE IF EXISTS inventory.product_variants CASCADE;

-- ============================================================
-- PHASE 2: RECREATE with UNIFIED CORRECT schema
-- ============================================================

-- Product Variants (the DEFINITIVE version)
CREATE TABLE inventory.product_variants (
    variant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES inventory.products(product_id) ON DELETE CASCADE,

    -- Identity
    variant_sku TEXT UNIQUE,
    variant_name TEXT,
    size_label TEXT,
    volume_ml INTEGER,

    -- Pricing
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    discounted_price NUMERIC(10,2),
    tax_percentage NUMERIC(5,2) DEFAULT 0,
    currency TEXT DEFAULT 'INR',

    -- Stock
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),

    -- Attributes
    alcohol_percentage NUMERIC(5,2),
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Carts (with FK to customers)
CREATE TABLE inventory.carts (
    cart_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES inventory.customers(customer_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Cart Items (with FK to carts and variants)
CREATE TABLE inventory.cart_items (
    cart_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID REFERENCES inventory.carts(cart_id) ON DELETE CASCADE,
    variant_id UUID REFERENCES inventory.product_variants(variant_id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Orders (with FK to customers)
CREATE TABLE inventory.orders (
    order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES inventory.customers(customer_id) ON DELETE SET NULL,
    total_amount NUMERIC(12,2) NOT NULL,
    total_tax NUMERIC(12,2) DEFAULT 0,
    order_status TEXT DEFAULT 'PENDING',
    payment_status TEXT DEFAULT 'UNPAID',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Order Items
CREATE TABLE inventory.order_items (
    order_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES inventory.orders(order_id) ON DELETE CASCADE,
    variant_id UUID REFERENCES inventory.product_variants(variant_id),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    tax_amount NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Payments
CREATE TABLE inventory.payments (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES inventory.orders(order_id),
    payment_method TEXT,
    transaction_reference TEXT,
    amount NUMERIC(12,2),
    payment_status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Stock Movements (the RICHER version from 004)
CREATE TABLE inventory.stock_movements (
    movement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES inventory.products(product_id) ON DELETE CASCADE,
    variant_id UUID REFERENCES inventory.product_variants(variant_id) ON DELETE CASCADE,
    quantity_change INTEGER NOT NULL,
    previous_quantity INTEGER,
    new_quantity INTEGER,
    reason TEXT,
    reference_id TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- PHASE 3: RECREATE ALL INDEXES
-- ============================================================

CREATE INDEX idx_variants_product_id ON inventory.product_variants(product_id);
CREATE INDEX idx_carts_customer_id ON inventory.carts(customer_id);
CREATE INDEX idx_cart_items_cart_id ON inventory.cart_items(cart_id);
CREATE INDEX idx_cart_items_variant_id ON inventory.cart_items(variant_id);
CREATE INDEX idx_orders_customer_id ON inventory.orders(customer_id);
CREATE INDEX idx_orders_status ON inventory.orders(order_status);
CREATE INDEX idx_order_items_order_id ON inventory.order_items(order_id);
CREATE INDEX idx_payments_order_id ON inventory.payments(order_id);
CREATE INDEX idx_stock_movements_product_id ON inventory.stock_movements(product_id);
CREATE INDEX idx_stock_movements_variant_id ON inventory.stock_movements(variant_id);
