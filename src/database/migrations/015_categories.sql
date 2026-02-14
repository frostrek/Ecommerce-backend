-- ============================================================
-- Migration 015: Categories (Hierarchical)
-- Proper categories table with parent-child support
-- ============================================================

CREATE TABLE IF NOT EXISTS inventory.categories (
    category_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL,
    slug          TEXT NOT NULL UNIQUE,
    description   TEXT,
    parent_id     UUID REFERENCES inventory.categories(category_id) ON DELETE SET NULL,
    image_url     TEXT,
    sort_order    INTEGER DEFAULT 0,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_parent
ON inventory.categories(parent_id);

CREATE INDEX IF NOT EXISTS idx_categories_slug
ON inventory.categories(slug);

-- Add category_id FK to products (keeps existing category string for backward compat)
ALTER TABLE inventory.products
    ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES inventory.categories(category_id) ON DELETE SET NULL;

-- Add status column to products if not exists
ALTER TABLE inventory.products
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived'));

CREATE INDEX IF NOT EXISTS idx_products_category_id
ON inventory.products(category_id);

CREATE INDEX IF NOT EXISTS idx_products_status
ON inventory.products(status);
