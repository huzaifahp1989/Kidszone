import { LIVE_APP_URL } from '@/lib/app-url';

const EXTRA_ALLOWED = new Set([
  'https://islamic-kids-platform.vercel.app',
  'https://huzaifahp1989-audio.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'capacitor://localhost',
  'https://localhost',
]);

/** Allow Cap / stale-host pages to call the live quiz submit API with a Bearer token. */
export function quizCorsHeaders(request: Request): Record<string, string> {
  const origin = (request.headers.get('origin') || '').trim();
  const liveOrigin = LIVE_APP_URL.replace(/\/$/, '');
  const allow =
    !origin ||
    origin === liveOrigin ||
    EXTRA_ALLOWED.has(origin) ||
    origin.endsWith('.vercel.app');

  if (!allow) return {};

  return {
    'Access-Control-Allow-Origin': origin || liveOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}
