/** Canonical live app URL (GitHub auto-deploys here). Keep Cap in sync. */
export const LIVE_APP_URL = 'https://huzaifahp1989-audio.vercel.app';

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, '');
}

export function getConfiguredAppUrl(): string | null {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || null;
}

/** Public URL used in emails, links, and fallbacks. */
export function getAppUrl(): string {
  const configured = getConfiguredAppUrl();
  if (configured) return normalizeUrl(configured);
  return LIVE_APP_URL;
}

/**
 * Base URL for browser API calls (quiz submit, points refresh, game track).
 * Uses the current origin on localhost so local dev hits the local server;
 * Cap/stale-host WebViews still use the canonical live deployment.
 */
export function getClientApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return normalizeUrl(getConfiguredAppUrl() || LIVE_APP_URL);
  }
  const host = window.location.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1') {
    return normalizeUrl(window.location.origin);
  }
  return normalizeUrl(getConfiguredAppUrl() || window.location.origin || LIVE_APP_URL);
}
