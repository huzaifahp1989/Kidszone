import { createClient } from '@supabase/supabase-js';

function cleanEnv(value: string | undefined | null): string {
  return String(value || '')
    .trim()
    .replace(/^["']|["']$/g, '');
}

const SUPABASE_URL =
  cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) ||
  cleanEnv(process.env.SUPABASE_URL) ||
  'https://placeholder.supabase.co';

const SERVICE_ROLE_KEY = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
const ANON_KEY =
  cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || cleanEnv(process.env.SUPABASE_ANON_KEY);

/** True when a real service-role key is configured (required to bypass RLS for admin writes). */
export function hasSupabaseServiceRole(): boolean {
  return SERVICE_ROLE_KEY.length > 40;
}

const SUPABASE_SERVICE_ROLE_KEY = hasSupabaseServiceRole()
  ? SERVICE_ROLE_KEY
  : ANON_KEY || 'placeholder';

if (!cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) && !cleanEnv(process.env.SUPABASE_URL)) {
  console.warn(
    '[supabase-admin] Warning: SUPABASE URL is missing. Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL).'
  );
}

if (!hasSupabaseServiceRole()) {
  console.warn(
    '[supabase-admin] Missing SUPABASE_SERVICE_ROLE_KEY. Admin writes (push schedules, etc.) will fail RLS. Copy service_role from Supabase → Project Settings → API.'
  );
}

if (process.env.NODE_ENV === 'production' && !hasSupabaseServiceRole()) {
  console.error(
    '[supabase-admin] SUPABASE_SERVICE_ROLE_KEY is required in production. Push schedules and other admin DB writes will not work.'
  );
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
