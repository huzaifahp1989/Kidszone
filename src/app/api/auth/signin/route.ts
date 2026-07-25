import { NextRequest, NextResponse } from 'next/server';
import { resolvePublicSupabaseUrl } from '@/lib/supabase-public-config';
import { resolveServiceRoleKey } from '@/lib/supabase-server-secrets';

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
    const SERVICE_ROLE_KEY = resolveServiceRoleKey();

    if (!SUPABASE_URL || SUPABASE_URL.includes('placeholder.supabase.co')) {
      return NextResponse.json(
        { error: 'Server sign-in proxy is not configured (NEXT_PUBLIC_SUPABASE_URL is missing).', retryAfter: null },
        { status: 500 }
      );
    }
    if (!SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server sign-in proxy is not configured (SUPABASE_SERVICE_ROLE_KEY is missing).', retryAfter: null },
        { status: 500 }
      );
    }
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    // Call GoTrue token endpoint directly with the service role key as the
    // apikey header. The service-role key is exempt from the per-IP anon
    // rate limits that block browser clients.
    const gtrRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
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
