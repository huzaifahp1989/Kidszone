-- Optional rich-notification image on scheduled pushes
ALTER TABLE push_schedules ADD COLUMN IF NOT EXISTS image_url TEXT;
