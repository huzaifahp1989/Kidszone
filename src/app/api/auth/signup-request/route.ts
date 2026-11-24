import { NextRequest, NextResponse } from 'next/server';
import { hasSupabaseServiceRole } from '@/lib/supabase-admin';
import { emailSignupVerificationCode } from '@/lib/chat-email';
import {
  SIGNUP_CODE_TTL_MS,
  createSignupVerification,
  emailForPayload,
  familyEmailAlreadyRegistered,
  findTakenUsernames,
  learnerNamesForPayload,
  usernamesForPayload,
  validateFamilySignupPayload,
  validateSingleSignupPayload,
} from '@/lib/signup-verification';

export const dynamic = 'force-dynamic';

/**
 * Step 1 of signup. Validates the form, reserves it in email_verifications and
 * emails a 6-digit code. No Supabase auth user is created here — that only
 * happens in /api/auth/signup-verify once the code is confirmed.
 */
export async function POST(request: NextRequest) {
  try {
    if (!hasSupabaseServiceRole()) {
      return NextResponse.json({ error: 'Signup is temporarily unavailable.' }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const mode = body?.mode === 'family' ? 'family' : 'single';

    const validation =
      mode === 'family' ? validateFamilySignupPayload(body) : validateSingleSignupPayload(body);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const payload = validation.payload;
    const email = emailForPayload(payload);

    const taken = await findTakenUsernames(usernamesForPayload(payload));
    if (taken.length > 0) {
      return NextResponse.json(
        { error: `Username(s) already taken: ${taken.join(', ')}` },
        { status: 409 }
      );
    }

    if (await familyEmailAlreadyRegistered(email)) {
      return NextResponse.json(
        {
          error:
            'That email is already registered. Sign in instead, or add another child from Profile → Family after signing in.',
        },
        { status: 409 }
      );
    }

    const created = await createSignupVerification({ email, kind: mode, payload });
    if (!created.ok) {
      return NextResponse.json(
        { error: created.error, retryAfterSeconds: created.retryAfterSeconds },
        { status: created.retryAfterSeconds ? 429 : 400 }
      );
    }

    const sent = await emailSignupVerificationCode({
      to: email,
      code: created.code,
      learnerNames: learnerNamesForPayload(payload),
      expiresInMinutes: Math.round(SIGNUP_CODE_TTL_MS / 60000),
    });

    if (!sent.ok) {
      console.error('[signup-request] verification email failed:', sent.error);
      return NextResponse.json(
        { error: 'Could not send the verification email. Please try again in a moment.' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      emailSent: true,
      email,
      expiresInSeconds: Math.round(SIGNUP_CODE_TTL_MS / 1000),
    });
  } catch (err: any) {
    console.error('[signup-request] error:', err);
    return NextResponse.json(
      { error: err?.message || 'Could not start signup. Please try again.' },
      { status: 500 }
    );
  }
}
