/** Canonical live app URL (GitHub auto-deploys here). */
export const LIVE_APP_URL = 'https://huzaifahp1989-audio.vercel.app';

/** Public URL used in emails, links, and fallbacks. */
export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    LIVE_APP_URL
  );
}

/**
 * Base URL for browser API calls (quiz submit, points refresh, game track).
 * Uses the current origin on localhost so local dev hits the local server;
 * Cap/stale-host WebViews still use the canonical live deployment.
 */
export function getClientApiBaseUrl(): string {
  if (typeof window === 'undefined') return LIVE_APP_URL.replace(/\/$/, '');
  const host = window.location.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1') {
    return window.location.origin.replace(/\/$/, '');
  }
  return LIVE_APP_URL.replace(/\/$/, '');
}
