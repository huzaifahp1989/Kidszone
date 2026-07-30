-- ============================================================
-- Ensure users table has a canonical `contact_number` column
-- (required since signup 2026-07-28). Safe / re-runnable.
--
-- Historical column variants this repo already handles:
--   contactnumber   (camelCase no underscore, used on some legacy rows)
--   contactNumber   (camelCase proper, used by app-wide normalization)
--
-- This migration:
--   1) Ensures `contact_number` TEXT column exists (the canonical one)
--   2) Backfills it from any of the 3 legacy variants if still empty
--   3) Backfills the legacy `contactnumber` column so reads from older SQL
--      still work (many admin and profile reads check all 3).
--   4) Adds an index so admin phone-search doesn't do seq scans.
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users' AND column_name='contact_number'
  ) THEN
    -- Use an empty-string default so ALTER SET NOT NULL below can run
    -- even on pre-existing rows. App validation ensures new signups
    -- always provide a real value (>= 6 digits after sanitization).
    ALTER TABLE public.users ADD COLUMN contact_number TEXT NOT NULL DEFAULT '';
  ELSE
    -- Column already existed (probably nullable) — ensure it has a default
    -- and make it non-null so ORM/insert paths never have to guess.
    ALTER TABLE public.users ALTER COLUMN contact_number SET DEFAULT '';
    ALTER TABLE public.users ALTER COLUMN contact_number SET NOT NULL;
  END IF;
END $$;

-- Also make sure the legacy `contactnumber` variant exists so the sign-up
-- fallback insert path (which writes contactnumber -> contact_number)
-- never throws 42703 on legacy schemas.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users' AND column_name='contactnumber'
  ) THEN
    ALTER TABLE public.users ADD COLUMN contactnumber TEXT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users' AND column_name='"contactNumber"'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users' AND column_name='contactNumber'
  ) THEN
    ALTER TABLE public.users ADD COLUMN "contactNumber" TEXT;
  END IF;
END $$;

COMMENT ON COLUMN public.users.contact_number IS
  'Canonical phone/WhatsApp number. Required at signup (min 6 digits). Legacy aliases: contactnumber, "contactNumber".';

-- -------- 3a. Backfill canonical contact_number from any legacy alias --------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='contact_number') THEN
    UPDATE public.users
    SET contact_number = COALESCE(NULLIF(TRIM(contact_number), ''), ''),
        contact_number = CASE
          WHEN NULLIF(TRIM(contact_number), '') IS NOT NULL THEN TRIM(contact_number)
          WHEN NULLIF(TRIM(contactnumber), '') IS NOT NULL THEN TRIM(contactnumber)
          WHEN NULLIF(TRIM("contactNumber"), '') IS NOT NULL THEN TRIM("contactNumber")
          ELSE ''
        END
    WHERE TRUE;
  END IF;
END $$;

-- -------- 3b. Mirror canonical value back into legacy aliases (for old reads) --------
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='contactnumber')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='contact_number')
  THEN
    UPDATE public.users
    SET contactnumber = contact_number
    WHERE NULLIF(contactnumber, '') IS NULL AND NULLIF(contact_number, '') IS NOT NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='contactNumber')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name='contact_number')
  THEN
    UPDATE public.users
    SET "contactNumber" = contact_number
    WHERE NULLIF("contactNumber", '') IS NULL AND NULLIF(contact_number, '') IS NOT NULL;
  END IF;
END $$;

-- -------- 4. Index for admin phone search + WinnerDetailsForm contact lookups --------
CREATE INDEX IF NOT EXISTS idx_users_contact_number_trgm
  ON public.users (contact_number);
