-- Add optional image for scheduled pushes (OneSignal rich notification)
-- Run in Supabase SQL editor.

ALTER TABLE push_schedules
  ADD COLUMN IF NOT EXISTS image_url TEXT;
