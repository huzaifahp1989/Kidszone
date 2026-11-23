-- Admin email tracking: one row per broadcast/individual send, plus opens.
CREATE TABLE IF NOT EXISTS email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  from_name TEXT,
  audience TEXT,
  transport TEXT,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_sends_created ON email_sends(created_at DESC);

-- One row per (send, recipient) that loaded the tracking pixel. The unique
-- index means repeated fetches by the same mailbox count as a single open.
CREATE TABLE IF NOT EXISTS email_opens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  send_id UUID NOT NULL REFERENCES email_sends(id) ON DELETE CASCADE,
  recipient TEXT NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_opens_send_recipient
  ON email_opens(send_id, recipient);

CREATE INDEX IF NOT EXISTS idx_email_opens_send ON email_opens(send_id);

ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_opens ENABLE ROW LEVEL SECURITY;
