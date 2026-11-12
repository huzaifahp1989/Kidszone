-- Recording Studio: add the missing duration_seconds column
--
-- The studio, the story galleries and the admin review screens all read
-- `recordings.duration_seconds`, but the original recordings table only ever
-- defined `duration` (20250302). Any query that selected duration_seconds
-- failed with "column recordings.duration_seconds does not exist" (500).
--
-- This migration is re-runnable and backfills existing rows from `duration`
-- so old story recordings keep their length.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'recordings'
      AND column_name = 'duration_seconds'
  ) THEN
    ALTER TABLE public.recordings ADD COLUMN duration_seconds INTEGER;
  END IF;
END $$;

-- Keep the two length columns in step for rows written before this migration.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'recordings' AND column_name = 'duration'
  ) THEN
    UPDATE public.recordings
    SET duration_seconds = duration
    WHERE duration_seconds IS NULL AND duration IS NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.recordings.duration_seconds IS
  'Recording length in seconds. Mirrors the legacy `duration` column; new studio uploads always set this.';
