CREATE TABLE IF NOT EXISTS inventory.wishlists (
    wishlist_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id  UUID NOT NULL REFERENCES inventory.customers(customer_id) ON DELETE CASCADE,
    product_id   UUID NOT NULL REFERENCES inventory.products(product_id) ON DELETE CASCADE,
    variant_id   UUID REFERENCES inventory.product_variants(variant_id) ON DELETE SET NULL,
    created_at   TIMESTAMP DEFAULT NOW(),
    UNIQUE(customer_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlist_customer
ON inventory.wishlists(customer_id);

CREATE INDEX IF NOT EXISTS idx_wishlist_product
ON inventory.wishlists(product_id);
