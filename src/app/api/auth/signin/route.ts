import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Service role key has higher / no rate limits on the GoTrue token endpoint.
// Falls back to anon key if service role key isn't set.
const API_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
        'apikey': API_KEY,
        'Authorization': `Bearer ${API_KEY}`,
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
