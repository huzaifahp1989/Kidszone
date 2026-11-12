-- Recording Studio upgrade: statuses + Row Level Security
--
-- The original recordings table constrained `status` to
-- ('submitted', 'approved', 'rejected'). The upgraded studio lets a child keep a
-- private `draft` or `saved` recording before submitting it for review, so the
-- constraint must allow those two extra states.
--
-- This migration is re-runnable: the status CHECK is discovered by definition
-- rather than by (unknown) generated name, and every policy is dropped first.

-- ---------------------------------------------------------------------------
-- 1. Allow the new private statuses
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Drop only CHECK constraints whose definition is the status allow-list, so
  -- unrelated checks (e.g. numeric ranges) are left alone.
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'recordings'
      AND con.contype = 'c'
      AND (
        pg_get_constraintdef(con.oid) ILIKE '%status = ANY%'
        OR pg_get_constraintdef(con.oid) ILIKE '%status IN%'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.recordings DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.recordings
  DROP CONSTRAINT IF EXISTS recordings_status_check;

ALTER TABLE public.recordings
  ADD CONSTRAINT recordings_status_check
  CHECK (status IN ('draft', 'saved', 'submitted', 'approved', 'rejected'));

COMMENT ON CONSTRAINT recordings_status_check ON public.recordings IS
  'draft/saved = private to the child; submitted = awaiting review; approved/rejected = reviewed';

-- ---------------------------------------------------------------------------
-- 2. Users may read/write only their own, not-yet-reviewed recordings
-- ---------------------------------------------------------------------------
-- Existing policies (from 20250302) cover INSERT and SELECT. The studio's
-- rename / edit / delete actions need UPDATE and DELETE. WITH CHECK keeps the
-- child from promoting their own recording to 'approved'/'rejected'.
DROP POLICY IF EXISTS "Users can update their own recordings" ON public.recordings;
DROP POLICY IF EXISTS "Users can delete their own recordings" ON public.recordings;

CREATE POLICY "Users can update their own recordings"
ON public.recordings FOR UPDATE
USING (auth.uid() = user_id AND status IN ('draft', 'saved', 'submitted'))
WITH CHECK (auth.uid() = user_id AND status IN ('draft', 'saved', 'submitted'));

CREATE POLICY "Users can delete their own recordings"
ON public.recordings FOR DELETE
USING (auth.uid() = user_id AND status <> 'approved');

-- ---------------------------------------------------------------------------
-- 3. Supporting index for the "My Recordings" library
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_recordings_user_created_at
  ON public.recordings (user_id, created_at DESC);
