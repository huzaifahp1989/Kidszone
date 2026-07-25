import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { LIVE_APP_URL } from '@/lib/app-url';

/**
 * The islamic-kids-platform Vercel project can lag behind main and still serve
 * old quiz JS that blocks on "Submitting your answers…". Redirect that host to
 * the canonical deployment (LIVE_APP_URL) which ships the non-blocking quiz flow.
 */
const STALE_LIVE_HOSTS = new Set(['islamic-kids-platform.vercel.app']);

export function middleware(request: NextRequest) {
  const host = (request.headers.get('host') || '').split(':')[0].toLowerCase();
  if (!STALE_LIVE_HOSTS.has(host)) {
    return NextResponse.next();
  }

  const target = new URL(LIVE_APP_URL);
  const url = request.nextUrl.clone();
  url.protocol = target.protocol;
  url.host = target.host;
  return NextResponse.redirect(url, 307);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
