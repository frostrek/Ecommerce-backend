-- Performance indexes for cart tables
CREATE INDEX IF NOT EXISTS idx_carts_customer_id ON inventory.carts(customer_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON inventory.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_variant_id ON inventory.cart_items(variant_id);
