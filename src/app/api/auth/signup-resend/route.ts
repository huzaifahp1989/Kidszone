import { NextRequest, NextResponse } from 'next/server';
import { hasSupabaseServiceRole } from '@/lib/supabase-admin';
import { emailSignupVerificationCode } from '@/lib/chat-email';
import { normalizeFamilyEmail } from '@/lib/family-accounts';
import {
  SIGNUP_CODE_TTL_MS,
  createSignupVerification,
  getActiveSignupVerification,
  learnerNamesForPayload,
} from '@/lib/signup-verification';

export const dynamic = 'force-dynamic';

/** Re-sends a fresh signup code for a signup that is still awaiting verification. */
export async function POST(request: NextRequest) {
  try {
    if (!hasSupabaseServiceRole()) {
      return NextResponse.json({ error: 'Signup is temporarily unavailable.' }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const email = normalizeFamilyEmail(body?.email);
    if (!email.includes('@')) {
      return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
    }

    const active = await getActiveSignupVerification(email);
    if (!active) {
      return NextResponse.json(
        { error: 'No pending signup found for that email. Please start again.' },
        { status: 404 }
      );
    }

    const created = await createSignupVerification({
      email,
      kind: active.kind,
      payload: active.payload,
    });
    if (!created.ok) {
      return NextResponse.json(
        { error: created.error, retryAfterSeconds: created.retryAfterSeconds },
        { status: created.retryAfterSeconds ? 429 : 400 }
      );
    }

    const sent = await emailSignupVerificationCode({
      to: email,
      code: created.code,
      learnerNames: learnerNamesForPayload(active.payload),
      expiresInMinutes: Math.round(SIGNUP_CODE_TTL_MS / 60000),
    });

    if (!sent.ok) {
      console.error('[signup-resend] verification email failed:', sent.error);
      return NextResponse.json(
        { error: 'Could not send the verification email. Please try again in a moment.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, emailSent: true, email });
  } catch (err: any) {
    console.error('[signup-resend] error:', err);
    return NextResponse.json(
      { error: err?.message || 'Could not resend the code. Please try again.' },
      { status: 500 }
    );
  }
}
