-- Disable the automatic random weekly winner draw that used to select a new winner every Friday.
-- This migration turns `generate_weekly_winner()` into a safe no-op so no random winner can
-- be created automatically (via RPC calls, scheduled jobs, or client-side triggers).
-- Manual winner management remains available via Admin -> Weekly winners announcements.

CREATE OR REPLACE FUNCTION public.generate_weekly_winner()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'success', true,
    'is_new', false,
    'message', 'Automatic weekly winner selection is disabled. Choose winners manually in Admin -> Weekly winners.'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.generate_weekly_winner() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_weekly_winner() TO service_role;
