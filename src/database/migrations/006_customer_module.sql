
CREATE TABLE IF NOT EXISTS inventory.customers (
    customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE,
    date_of_birth DATE,
    is_age_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS inventory.customer_addresses (
    address_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES inventory.customers(customer_id) ON DELETE CASCADE,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    pincode TEXT NOT NULL,
    country TEXT DEFAULT 'India',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);



CREATE TABLE IF NOT EXISTS inventory.customer_auth (
    auth_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES inventory.customers(customer_id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    last_login TIMESTAMP,
    failed_attempts INTEGER DEFAULT 0,
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);



CREATE TABLE IF NOT EXISTS inventory.customer_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES inventory.customers(customer_id) ON DELETE CASCADE,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);



CREATE INDEX IF NOT EXISTS idx_customer_email 
ON inventory.customers(email);

CREATE INDEX IF NOT EXISTS idx_customer_phone 
ON inventory.customers(phone);

CREATE INDEX IF NOT EXISTS idx_customer_auth_customer 
ON inventory.customer_auth(customer_id);
