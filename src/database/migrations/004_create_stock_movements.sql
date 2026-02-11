CREATE TABLE IF NOT EXISTS inventory.stock_movements (
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

CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON inventory.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_variant_id ON inventory.stock_movements(variant_id);
