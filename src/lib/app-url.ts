/**
 * Canonical live app URL for Capacitor / deep links.
 *
 * IMPORTANT: This must be a Vercel project that has real Supabase env vars
 * (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
 * `SUPABASE_SERVICE_ROLE_KEY`). Deployments that fall back to
 * `placeholder.supabase.co` break auth and points.
 *
 * Verified working project: islamic-kids-platform.vercel.app
 * (jlqrbbqsuksncrxjcmbc.supabase.co). Do NOT point at
 * huzaifahp1989-audio.vercel.app until that project has the same env vars.
 */
export const LIVE_APP_URL = 'https://islamic-kids-platform.vercel.app';

/** Public URL used in emails, links, and fallbacks. */
export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    LIVE_APP_URL
  );
}
