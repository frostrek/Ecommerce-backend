-- ============================================================
-- Migration 016: Base64 Image Support
-- Adds base64 storage to product_assets + profile image to customers
-- ============================================================

-- Add base64 data column to product_assets
ALTER TABLE inventory.product_assets
    ADD COLUMN IF NOT EXISTS base64_data TEXT,
    ADD COLUMN IF NOT EXISTS mime_type TEXT DEFAULT 'image/jpeg',
    ADD COLUMN IF NOT EXISTS file_name TEXT,
    ADD COLUMN IF NOT EXISTS file_size_bytes INTEGER,
    ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;

-- Add profile image to customers
ALTER TABLE inventory.customers
    ADD COLUMN IF NOT EXISTS profile_image TEXT,
    ADD COLUMN IF NOT EXISTS profile_image_mime TEXT DEFAULT 'image/jpeg';
