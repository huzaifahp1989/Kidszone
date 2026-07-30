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
    const gtrRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    });

    const gtrBody = await gtrRes.json();

    if (!gtrRes.ok) {
      const msg: string = gtrBody?.error_description || gtrBody?.msg || gtrBody?.message || 'Sign-in failed.';
      const retryAfter = parseRetrySeconds(msg) ?? (gtrRes.status === 429 ? 60 : null);
      return NextResponse.json(
        { error: msg, retryAfter },
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
      { error: err?.message || 'Unexpected server error.' },
      { status: 500 }
    );
  }
}
