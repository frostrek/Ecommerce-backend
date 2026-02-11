

CREATE TABLE IF NOT EXISTS inventory.product_variants (
    variant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES inventory.products(product_id) ON DELETE CASCADE,

    size_label TEXT NOT NULL,
    volume_ml INTEGER NOT NULL,

    price NUMERIC(10,2) NOT NULL,
    discounted_price NUMERIC(10,2),
    tax_percentage NUMERIC(5,2) DEFAULT 0,

    stock_quantity INTEGER DEFAULT 0,
    alcohol_percentage NUMERIC(5,2),

    currency TEXT DEFAULT 'INR',
    is_active BOOLEAN DEFAULT TRUE,

    variant_sku TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variants_product_id
ON inventory.product_variants(product_id);



CREATE TABLE IF NOT EXISTS inventory.carts (
    cart_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory.cart_items (
    cart_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID REFERENCES inventory.carts(cart_id) ON DELETE CASCADE,
    variant_id UUID REFERENCES inventory.product_variants(variant_id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP DEFAULT NOW()
);



CREATE TABLE IF NOT EXISTS inventory.orders (
    order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID,
    total_amount NUMERIC(12,2) NOT NULL,
    total_tax NUMERIC(12,2) DEFAULT 0,
    order_status TEXT DEFAULT 'PENDING',
    payment_status TEXT DEFAULT 'UNPAID',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory.order_items (
    order_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES inventory.orders(order_id) ON DELETE CASCADE,
    variant_id UUID REFERENCES inventory.product_variants(variant_id),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    tax_amount NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);



CREATE TABLE IF NOT EXISTS inventory.payments (
    payment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES inventory.orders(order_id),
    payment_method TEXT,
    transaction_reference TEXT,
    amount NUMERIC(12,2),
    payment_status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS inventory.stock_movements (
    movement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID REFERENCES inventory.product_variants(variant_id),
    quantity_change INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
