import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { LIVE_APP_URL } from '@/lib/app-url';

/**
 * Capacitor currently loads huzaifahp1989-audio.vercel.app, which was deployed
 * without Supabase env (placeholder.supabase.co) — auth/points appear broken.
 * Until a native rebuild ships with the restored LIVE_APP_URL, 307 traffic from
 * that host to the Supabase-configured project so points keep working.
 */
const BROKEN_LIVE_HOSTS = new Set(['huzaifahp1989-audio.vercel.app']);

export function middleware(request: NextRequest) {
  const host = (request.headers.get('host') || '').split(':')[0].toLowerCase();
  if (!BROKEN_LIVE_HOSTS.has(host)) {
    return NextResponse.next();
  }

  const target = new URL(LIVE_APP_URL);
  const url = request.nextUrl.clone();
  url.protocol = target.protocol;
  url.host = target.host;
  return NextResponse.redirect(url, 307);
}

export const config = {
  // Skip Next internals / static assets; redirect pages + API routes.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
