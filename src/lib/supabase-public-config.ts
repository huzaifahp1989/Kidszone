/**
 * Public Supabase project config (URL + anon key).
 *
 * The anon key is safe to ship in client bundles — RLS enforces access.
 * Used as a last-resort fallback when Vercel env vars are missing so a
 * misconfigured deployment does not bake `placeholder.supabase.co` into JS
 * and silently break auth/points.
 *
 * Never put the service_role key here.
 */
export const PRODUCTION_SUPABASE_URL = 'https://jlqrbbqsuksncrxjcmbc.supabase.co';

export const PRODUCTION_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpscXJiYnFzdWtzbmNyeGpjbWJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MTQ2MjYsImV4cCI6MjA4MTQ5MDYyNn0.LAphA03H5Jj7yjAKf6k5N_auYfLkgHiApGOURDQEy_w';

export function isPlaceholderSupabaseUrl(url: string | null | undefined): boolean {
  const value = String(url || '').trim();
  return !value || value.includes('placeholder.supabase.co');
}

export function isPlaceholderAnonKey(key: string | null | undefined): boolean {
  const value = String(key || '').trim();
  return !value || value === 'placeholder';
}
