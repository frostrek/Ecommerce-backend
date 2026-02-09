CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE SCHEMA IF NOT EXISTS inventory;

-- Products table (main product information)
CREATE TABLE inventory.products (
    product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE NOT NULL,
    product_name TEXT NOT NULL,
    brand TEXT,
    category TEXT,
    sub_category TEXT,
    description TEXT,
    unit_of_measure TEXT,
    intended_use TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Product specifications (dimensions, materials, etc.)
CREATE TABLE inventory.product_specifications (
    spec_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES inventory.products(product_id) ON DELETE CASCADE,
    material TEXT,
    length_cm NUMERIC,
    width_cm NUMERIC,
    height_cm NUMERIC,
    weight_kg NUMERIC,
    color TEXT,
    strength TEXT,
    grade TEXT,
    shelf_life_months INTEGER,
    country_of_origin TEXT
);

-- Product packaging information
CREATE TABLE inventory.product_packaging (
    packaging_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES inventory.products(product_id) ON DELETE CASCADE,
    packaging_type TEXT,
    pack_size TEXT,
    net_quantity NUMERIC,
    gross_weight NUMERIC,
    packaging_material TEXT,
    carton_size TEXT,
    units_per_carton INTEGER,
    barcode TEXT
);

-- Product variants (size, color variations)
CREATE TABLE inventory.product_variants (
    variant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES inventory.products(product_id) ON DELETE CASCADE,
    variant_name TEXT,
    variant_type TEXT,
    variant_value TEXT,
    variant_sku TEXT UNIQUE,
    status TEXT CHECK (status IN ('Active', 'Inactive')) DEFAULT 'Active'
);

-- Product compliance and manufacturer info
CREATE TABLE inventory.product_compliance (
    compliance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES inventory.products(product_id) ON DELETE CASCADE,
    manufacturer_name TEXT,
    manufacturer_address TEXT,
    regulatory_details TEXT,
    storage_instructions TEXT,
    handling_instructions TEXT,
    warranty_details TEXT,
    safety_warnings TEXT,
    remarks TEXT
);

-- Product assets (images, videos, documents)
CREATE TABLE inventory.product_assets (
    asset_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES inventory.products(product_id) ON DELETE CASCADE,
    asset_type TEXT,
    asset_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_products_sku ON inventory.products(sku);
CREATE INDEX idx_products_category ON inventory.products(category);
CREATE INDEX idx_product_variants_product_id ON inventory.product_variants(product_id);
CREATE INDEX idx_product_assets_product_id ON inventory.product_assets(product_id);
