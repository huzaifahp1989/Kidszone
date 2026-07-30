-- ============================================================
-- HARDENED / RE-RUNNABLE recordings migration (Supabase-safe)
-- Everything is guarded by information_schema checks so this
-- never fails with "column does not exist" even if the table
-- was manually recreated via RECREATE_RECORDINGS_TABLE.sql.
-- ============================================================

-- -------- 1. Add missing columns (each guarded individually) --------

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='recordings' AND column_name='category'
  ) THEN
    ALTER TABLE public.recordings ADD COLUMN category TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='recordings' AND column_name='submitted_at'
  ) THEN
    ALTER TABLE public.recordings ADD COLUMN submitted_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='recordings' AND column_name='reviewed_at'
  ) THEN
    ALTER TABLE public.recordings ADD COLUMN reviewed_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='recordings' AND column_name='approved_by'
  ) THEN
    ALTER TABLE public.recordings ADD COLUMN approved_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='recordings' AND column_name='child_name'
  ) THEN
    ALTER TABLE public.recordings ADD COLUMN child_name TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='recordings' AND column_name='title'
  ) THEN
    ALTER TABLE public.recordings ADD COLUMN title TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='recordings' AND column_name='description'
  ) THEN
    ALTER TABLE public.recordings ADD COLUMN description TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='recordings' AND column_name='admin_notes'
  ) THEN
    ALTER TABLE public.recordings ADD COLUMN admin_notes TEXT;
  END IF;
END $$;

-- -------- 1b. Ensure created_at + its DEFAULT exist too --------
-- (If the table was recreated manually without a default, the
-- app-side inserts now always pass created_at explicitly; this
-- guard is just for ad-hoc inserts.)

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='recordings' AND column_name='created_at'
  ) THEN
    ALTER TABLE public.recordings ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'utc');
  ELSE
    -- Column exists — make sure it has a default for future rows.
    ALTER TABLE public.recordings ALTER COLUMN created_at SET DEFAULT (now() AT TIME ZONE 'utc');
    ALTER TABLE public.recordings ALTER COLUMN created_at SET NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN public.recordings.category IS
  'Recording source: story | quran | nasheed | audio_quiz | audio_quiz_question | NULL (legacy/studio misc).';
COMMENT ON COLUMN public.recordings.submitted_at IS
  'Time the recording was submitted (separate from created_at so migrations/backfills preserve audit order).';
COMMENT ON COLUMN public.recordings.reviewed_at IS
  'Time admin approved / rejected the recording.';
COMMENT ON COLUMN public.recordings.approved_by IS
  'admin user id (auth.users.uid) that approved or rejected.';
COMMENT ON COLUMN public.recordings.admin_notes IS
  'Modern admin feedback column (legacy alias column admin_feedback also exists).';

-- -------- 2. Add indexes (CREATE INDEX IF NOT EXISTS is native-safe) --------

CREATE INDEX IF NOT EXISTS idx_recordings_status_created_at
  ON public.recordings (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recordings_category_created_at
  ON public.recordings (category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recordings_submitted_at_desc
  ON public.recordings (submitted_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_recordings_user_id
  ON public.recordings (user_id);
CREATE INDEX IF NOT EXISTS idx_recordings_story_id
  ON public.recordings (story_id);

-- -------- 3. Backfill submitted_at = created_at ONLY IF BOTH COLUMNS EXIST --------

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='recordings' AND column_name='created_at'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='recordings' AND column_name='submitted_at'
  ) THEN
    UPDATE public.recordings SET submitted_at = created_at WHERE submitted_at IS NULL;
  END IF;
END $$;

-- -------- 4. Backfill category='story' IF category + story_id BOTH EXIST --------

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='recordings' AND column_name='category'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='recordings' AND column_name='story_id'
  ) THEN
    UPDATE public.recordings
    SET category = 'story'
    WHERE category IS NULL
      AND story_id IS NOT NULL;
  END IF;
END $$;
