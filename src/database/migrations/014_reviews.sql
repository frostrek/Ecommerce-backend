CREATE TABLE IF NOT EXISTS inventory.reviews (
    review_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id   UUID NOT NULL REFERENCES inventory.products(product_id) ON DELETE CASCADE,
    customer_id  UUID NOT NULL REFERENCES inventory.customers(customer_id) ON DELETE CASCADE,
    order_id     UUID REFERENCES inventory.orders(order_id) ON DELETE SET NULL,
    rating       INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title        TEXT,
    body         TEXT,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    is_approved  BOOLEAN DEFAULT TRUE,
    helpful_count INTEGER DEFAULT 0,
    created_at   TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP DEFAULT NOW(),
    UNIQUE(product_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_product
ON inventory.reviews(product_id);

CREATE INDEX IF NOT EXISTS idx_reviews_customer
ON inventory.reviews(customer_id);

CREATE INDEX IF NOT EXISTS idx_reviews_rating
ON inventory.reviews(product_id, rating);
