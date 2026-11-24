import { NextRequest, NextResponse } from 'next/server';
import { hasSupabaseServiceRole, supabaseAdmin } from '@/lib/supabase-admin';
import { ensureUserRecords } from '@/lib/ensure-user-records';
import { normalizeFamilyEmail } from '@/lib/family-accounts';
import {
  consumeSignupVerification,
  familyEmailAlreadyRegistered,
  findTakenUsernames,
  usernamesForPayload,
} from '@/lib/signup-verification';

export const dynamic = 'force-dynamic';

type CreatedAccount = {
  uid: string;
  name: string;
  username: string;
  email: string;
};

/**
 * Step 2 of signup. Verifies the emailed code and only then creates the
 * Supabase auth user(s) + profile rows. Because the account does not exist
 * before verification, every account in the database has a verified email.
 */
export async function POST(request: NextRequest) {
  try {
    if (!hasSupabaseServiceRole()) {
      return NextResponse.json({ error: 'Signup is temporarily unavailable.' }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const email = normalizeFamilyEmail(body?.email);
    const code = String(body?.code || '').trim();
    const password = String(body?.password || '');

    if (!email.includes('@')) {
      return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const verification = await consumeSignupVerification({ email, code });
    if (!verification.ok) {
      return NextResponse.json(
        { error: verification.error, attemptsRemaining: verification.attemptsRemaining },
        { status: 400 }
      );
    }

    const payload = verification.payload;

    // Re-check uniqueness now that we are about to persist.
    const taken = await findTakenUsernames(usernamesForPayload(payload));
    if (taken.length > 0) {
      return NextResponse.json(
        { error: `Username(s) already taken: ${taken.join(', ')}` },
        { status: 409 }
      );
    }

    const createdUsers: CreatedAccount[] = [];

    if (payload.kind === 'family' && payload.family) {
      const familyEmail = normalizeFamilyEmail(payload.family.familyEmail);
      const domain = familyEmail.split('@')[1] || '';

      if (await familyEmailAlreadyRegistered(familyEmail)) {
        return NextResponse.json(
          { error: 'That email is already registered. Please sign in instead.' },
          { status: 409 }
        );
      }

      for (const learner of payload.family.learners) {
        const authEmail = `${learner.username}@${domain}`;
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: authEmail,
          password,
          email_confirm: true,
          user_metadata: {
            name: learner.name,
            username: learner.username,
            family_email: familyEmail,
            age: learner.age,
            city: learner.city,
            madrasahName: learner.madrasahName,
            needsSignupForm: false,
          },
        });

        if (error || !data?.user?.id) {
          console.error(`[signup-verify] failed to create ${learner.username}:`, error?.message);
          return NextResponse.json(
            { error: `Failed to create an account for ${learner.name}: ${error?.message || 'unknown error'}` },
            { status: 400 }
          );
        }

        const uid = data.user.id;
        await ensureUserRecords(uid).catch((err) => {
          console.warn('[signup-verify] ensureUserRecords failed:', err?.message || err);
        });

        createdUsers.push({ uid, name: learner.name, username: learner.username, email: authEmail });
      }
    } else if (payload.single) {
      const single = payload.single;
      const familyEmail = normalizeFamilyEmail(single.familyEmail);

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: familyEmail,
        password,
        email_confirm: true,
        user_metadata: {
          name: single.name,
          username: single.username,
          family_email: familyEmail,
          age: single.age,
          city: single.city,
          madrasahName: single.madrasahName,
          contactNumber: single.contactNumber,
          needsSignupForm: false,
        },
      });

      if (error || !data?.user?.id) {
        console.error('[signup-verify] failed to create account:', error?.message);
        return NextResponse.json(
          { error: `Failed to create your account: ${error?.message || 'unknown error'}` },
          { status: 400 }
        );
      }

      const uid = data.user.id;
      await ensureUserRecords(uid).catch((err) => {
        console.warn('[signup-verify] ensureUserRecords failed:', err?.message || err);
      });

      createdUsers.push({ uid, name: single.name, username: single.username, email: familyEmail });
    } else {
      return NextResponse.json({ error: 'Verification data was incomplete.' }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      mode: payload.kind,
      referralCode: payload.referralCode || null,
      users: createdUsers,
    });
  } catch (err: any) {
    console.error('[signup-verify] error:', err);
    return NextResponse.json(
      { error: err?.message || 'Could not finish signup. Please try again.' },
      { status: 500 }
    );
  }
}
