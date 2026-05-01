-- Run this in your Supabase SQL Editor to enable the pending reward claims system.
-- After running, the Tasks page "Claim" buttons and Admin > Claims tab will work.

CREATE TABLE IF NOT EXISTS pending_reward_claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('feedback_ios', 'feedback_android', 'referral')),
  claim_label TEXT NOT NULL,
  points_requested INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- Index to quickly filter by user and status
CREATE INDEX IF NOT EXISTS idx_pending_claims_user_id ON pending_reward_claims (user_id);
CREATE INDEX IF NOT EXISTS idx_pending_claims_status ON pending_reward_claims (status);

-- Disable RLS so the admin service-role key can read/write freely
ALTER TABLE pending_reward_claims DISABLE ROW LEVEL SECURITY;
