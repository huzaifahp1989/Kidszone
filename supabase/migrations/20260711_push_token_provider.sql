-- Distinguish OneSignal player IDs from FCM/device tokens
ALTER TABLE push_notification_tokens
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'onesignal';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'push_notification_tokens_provider_check'
  ) THEN
    ALTER TABLE push_notification_tokens
      ADD CONSTRAINT push_notification_tokens_provider_check
      CHECK (provider IN ('onesignal', 'fcm'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_push_tokens_provider
  ON push_notification_tokens(provider);
