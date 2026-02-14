-- ============================================================
-- Migration 012: Auth Enhancements
-- Adds social login profiles + indexes for auth performance
-- ============================================================

-- Social login profiles (Google, Facebook, Apple, etc.)
CREATE TABLE IF NOT EXISTS inventory.customer_social_profiles (
    profile_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id  UUID NOT NULL REFERENCES inventory.customers(customer_id) ON DELETE CASCADE,
    provider     TEXT NOT NULL,          -- 'google', 'facebook', 'apple'
    provider_id  TEXT NOT NULL,          -- ID from the OAuth provider
    profile_data JSONB DEFAULT '{}',     -- raw profile payload (avatar_url, etc.)
    created_at   TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP DEFAULT NOW(),
    UNIQUE(provider, provider_id)        -- one account per provider identity
);

-- Index for fast lookup during social login
CREATE INDEX IF NOT EXISTS idx_social_provider_id
ON inventory.customer_social_profiles(provider, provider_id);

-- Index for faster refresh-token lookup
CREATE INDEX IF NOT EXISTS idx_session_refresh_token
ON inventory.customer_sessions(refresh_token);

-- Index for expired-session cleanup
CREATE INDEX IF NOT EXISTS idx_session_expires
ON inventory.customer_sessions(expires_at);
