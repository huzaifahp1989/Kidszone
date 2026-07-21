-- Push campaign tracking: sent + opened/read
CREATE TABLE IF NOT EXISTS push_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  url TEXT,
  audience TEXT NOT NULL DEFAULT 'all',
  target_user_id UUID,
  recipients INTEGER NOT NULL DEFAULT 0,
  opens INTEGER NOT NULL DEFAULT 0,
  onesignal_ids TEXT[] DEFAULT '{}',
  strategy TEXT,
  per_app JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_campaigns_created ON push_campaigns(created_at DESC);

CREATE TABLE IF NOT EXISTS push_opens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES push_campaigns(id) ON DELETE CASCADE,
  onesignal_notification_id TEXT,
  user_id UUID,
  subscription_id TEXT,
  source TEXT NOT NULL DEFAULT 'client',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_opens_campaign_user
  ON push_opens(campaign_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_push_opens_campaign_sub
  ON push_opens(campaign_id, subscription_id)
  WHERE subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_push_opens_campaign ON push_opens(campaign_id);

ALTER TABLE push_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_opens ENABLE ROW LEVEL SECURITY;
