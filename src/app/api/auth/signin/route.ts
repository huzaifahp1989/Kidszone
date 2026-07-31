import { NextRequest, NextResponse } from 'next/server';
import {
  resolvePublicSupabaseAnonKey,
  resolvePublicSupabaseUrl,
} from '@/lib/supabase-public-config';

/** Parse "try again in X seconds" / "try again in M:SS" from an error message */
function parseRetrySeconds(msg: string): number | null {
  const secMatch = msg.match(/try again in (\d+)\s*second/i);
  if (secMatch) return parseInt(secMatch[1], 10);
  const minMatch = msg.match(/try again in (\d+):(\d{2})/i);
  if (minMatch) return parseInt(minMatch[1], 10) * 60 + parseInt(minMatch[2], 10);
  const minWordMatch = msg.match(/try again in (\d+)\s*minute/i);
  if (minWordMatch) return parseInt(minWordMatch[1], 10) * 60;
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const SUPABASE_URL = resolvePublicSupabaseUrl();
    const SUPABASE_ANON_KEY = resolvePublicSupabaseAnonKey();

    if (!SUPABASE_URL || SUPABASE_URL.includes('placeholder.supabase.co')) {
      return NextResponse.json(
        { error: 'Server sign-in proxy is not configured (NEXT_PUBLIC_SUPABASE_URL is missing).', retryAfter: null },
        { status: 500 }
      );
    }
    if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'placeholder') {
      return NextResponse.json(
        { error: 'Server sign-in proxy is not configured (NEXT_PUBLIC_SUPABASE_ANON_KEY is missing).', retryAfter: null },
        { status: 500 }
      );
    }
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    // Use the standard public auth key for a normal password grant.
    // Supabase applies password sign-in rate limits at the Auth layer,
    // so this proxy should mirror the documented client flow rather than
    // treating sign-in like an admin operation.
    //
    // Server-side timeout: 12 seconds. Without this, a slow or hung
    // Supabase upstream can leave the client stuck at its 20-second
    // fetch timeout with no structured error.
    const upstreamController = new AbortController();
    const upstreamTimer = globalThis.setTimeout(
      () => upstreamController.abort('supabase-signin-timeout'),
      12000
    );
    let gtrRes: globalThis.Response;
    try {
      gtrRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email, password }),
        signal: upstreamController.signal,
      });
    } catch (err: any) {
      globalThis.clearTimeout(upstreamTimer);
      const aborted =
        err?.name === 'AbortError' ||
        String(err?.message || err?.code || '').toLowerCase().includes('abort');
      return NextResponse.json(
        {
          error: aborted
            ? 'Sign-in is taking longer than expected. Please try again in a few seconds.'
            : 'Unable to reach sign-in server. Please check your connection and try again.',
          upstreamError: err?.message ? String(err.message) : undefined,
          retryAfter: aborted ? 5 : null,
        },
        { status: aborted ? 504 : 502 }
      );
    }
    globalThis.clearTimeout(upstreamTimer);

    let gtrBody: any = {};
    try {
      gtrBody = await gtrRes.json();
    } catch {
      gtrBody = {};
    }

    if (!gtrRes.ok) {
      const msg: string =
        gtrBody?.error_description ||
        gtrBody?.msg ||
        gtrBody?.message ||
        (typeof gtrBody?.error === 'string' ? gtrBody.error : null) ||
        `Sign-in failed (upstream status ${gtrRes.status}).`;
      const retryAfter = parseRetrySeconds(msg) ?? (gtrRes.status === 429 ? 60 : null);
      return NextResponse.json(
        {
          error: msg,
          retryAfter,
          upstreamStatus: gtrRes.status,
          upstreamCode:
            typeof gtrBody?.error === 'string' && gtrBody.error !== msg ? gtrBody.error : undefined,
        },
        { status: gtrRes.status }
      );
    }

    return NextResponse.json({
      access_token: gtrBody.access_token,
      refresh_token: gtrBody.refresh_token,
      user: gtrBody.user,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err?.message || 'Unexpected server error.',
        serverCode: err?.code ? String(err.code) : undefined,
      },
      { status: 500 }
    );
  }
}
