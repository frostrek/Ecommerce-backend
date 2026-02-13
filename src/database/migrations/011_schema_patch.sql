-- ============================================================
-- Migration 011: Schema Patch (Additive Only)
-- Adds missing columns to orders table for shipping/billing
-- Safe to run on existing data — no destructive changes
-- ============================================================

-- Add shipping and billing address references to orders
ALTER TABLE inventory.orders
    ADD COLUMN IF NOT EXISTS shipping_address_id UUID REFERENCES inventory.customer_addresses(address_id),
    ADD COLUMN IF NOT EXISTS billing_address_id UUID REFERENCES inventory.customer_addresses(address_id);

-- Add updated_at to orders for tracking status changes
ALTER TABLE inventory.orders
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add indexes for the new FK columns
CREATE INDEX IF NOT EXISTS idx_orders_shipping_address ON inventory.orders(shipping_address_id);
CREATE INDEX IF NOT EXISTS idx_orders_billing_address ON inventory.orders(billing_address_id);
