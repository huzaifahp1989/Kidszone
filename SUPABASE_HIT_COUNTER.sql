-- ============================================================================
-- HIT COUNTER SETUP
-- ============================================================================
-- Run this in Supabase SQL Editor to enable the visitor counter
-- ============================================================================

-- 1. Create the page_views table
CREATE TABLE IF NOT EXISTS page_views (
  path TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS (Row Level Security)
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- 3. Create policies
-- Allow anyone to read counts
CREATE POLICY "Allow public read access" ON page_views
  FOR SELECT USING (true);

-- Allow anyone to update counts (via RPC only is safer, but this is a simple fallback)
-- We will rely on RPC for atomic increments, but we need insert permission if using direct client
-- For RPC, we don't strictly need insert policy if the function is SECURITY DEFINER

-- 4. Create an atomic increment function (RPC)
-- This prevents race conditions and handles "insert if not exists"
CREATE OR REPLACE FUNCTION increment_page_view(page_path TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER -- Run as database owner to bypass RLS for the increment
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  INSERT INTO page_views (path, count, updated_at)
  VALUES (page_path, 1, NOW())
  ON CONFLICT (path)
  DO UPDATE SET 
    count = page_views.count + 1,
    updated_at = NOW()
  RETURNING count INTO new_count;
  
  RETURN new_count;
END;
$$;

-- 5. Grant access to the function
GRANT EXECUTE ON FUNCTION increment_page_view(TEXT) TO anon, authenticated, service_role;
