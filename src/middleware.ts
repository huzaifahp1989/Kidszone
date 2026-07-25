import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { LIVE_APP_URL } from '@/lib/app-url';
import { QUIZ_CLIENT_VERSION } from '@/lib/quiz-client-version';

/**
 * The islamic-kids-platform Vercel project can lag behind main and still serve
 * old quiz JS that blocks on "Submitting your answers…". Redirect that host to
 * the canonical deployment (LIVE_APP_URL) which ships the non-blocking quiz flow.
 *
 * Also force a one-time cache-bust on /quiz when the WebView still has a stale
 * quiz client version cookie (Capacitor/Android often keep old HTML/JS).
 */
const STALE_LIVE_HOSTS = new Set(['islamic-kids-platform.vercel.app']);

export function middleware(request: NextRequest) {
  const host = (request.headers.get('host') || '').split(':')[0].toLowerCase();
  if (STALE_LIVE_HOSTS.has(host)) {
    const target = new URL(LIVE_APP_URL);
    const url = request.nextUrl.clone();
    url.protocol = target.protocol;
    url.host = target.host;
    return NextResponse.redirect(url, 307);
  }

  const path = request.nextUrl.pathname;
  const isQuizPath = path === '/quiz' || path.startsWith('/quiz/');
  if (!isQuizPath) {
    return NextResponse.next();
  }

  const cookieVersion = request.cookies.get('quiz_v')?.value || '';
  const queryVersion = request.nextUrl.searchParams.get('_qv') || '';
  const needsBust = cookieVersion !== QUIZ_CLIENT_VERSION;

  if (needsBust && queryVersion !== QUIZ_CLIENT_VERSION) {
    const url = request.nextUrl.clone();
    url.searchParams.set('_qv', QUIZ_CLIENT_VERSION);
    const redirect = NextResponse.redirect(url, 307);
    redirect.cookies.set('quiz_v', QUIZ_CLIENT_VERSION, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
    redirect.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return redirect;
  }

  const response = NextResponse.next();
  if (needsBust) {
    response.cookies.set('quiz_v', QUIZ_CLIENT_VERSION, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
