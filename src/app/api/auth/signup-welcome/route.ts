import { NextRequest, NextResponse } from 'next/server';
import { hasSupabaseServiceRole, supabaseAdmin } from '@/lib/supabase-admin';
import { ensureUserRecords } from '@/lib/ensure-user-records';
import { emailWelcomeSignup } from '@/lib/chat-email';

export const dynamic = 'force-dynamic';

// Only ever email an account that was just created, so this endpoint cannot be
// used to send mail to arbitrary addresses or to spam an existing learner.
const WELCOME_WINDOW_MS = 30 * 60 * 1000;

/**
 * Called right after a client-side signup succeeds. Applies the reminder
 * defaults (email reminders on, 3x per week) and sends the welcome email.
 * Both actions are best-effort — signup itself has already completed.
 */
export async function POST(request: NextRequest) {
  try {
    if (!hasSupabaseServiceRole()) {
      return NextResponse.json({ ok: false, error: 'Server configuration error' }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const userId = String(body?.userId || '').trim();
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'userId is required' }, { status: 400 });
    }

    let { data: profile, error: profileErr } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('uid', userId)
      .maybeSingle();

    // Signup with email confirmation may not have a profile row yet.
    if (!profileErr && !profile) {
      await ensureUserRecords(userId);
      ({ data: profile, error: profileErr } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('uid', userId)
        .maybeSingle());
    }

    if (profileErr) {
      return NextResponse.json({ ok: false, error: 'Could not load profile' }, { status: 500 });
    }
    if (!profile) {
      return NextResponse.json({ ok: false, error: 'Profile not found' }, { status: 404 });
    }

    const createdAt = profile.created_at ? new Date(profile.created_at).getTime() : null;
    if (createdAt && Date.now() - createdAt > WELCOME_WINDOW_MS) {
      return NextResponse.json({ ok: true, emailed: false, reason: 'not_a_new_signup' });
    }

    const targetEmail = String(
      profile.family_email || profile.parent_email || profile.email || ''
    )
      .trim()
      .toLowerCase();

    // Auto-enable reminder emails for the new signup.
    const defaults = {
      parent_email: targetEmail,
      reminder_opt_in: true,
      reminder_frequency: '3x_week',
    };
    const { error: updateErr } = await supabaseAdmin
      .from('users')
      .update(defaults)
      .eq('uid', userId);

    if (updateErr?.code === '42703') {
      // Older schema without the reminder columns — nothing more to do here.
      console.warn('[signup-welcome] reminder columns missing; skipping defaults');
    } else if (updateErr) {
      console.warn('[signup-welcome] could not set reminder defaults:', updateErr.message);
    }

    if (!targetEmail.includes('@')) {
      return NextResponse.json({ ok: true, emailed: false, reason: 'no_email' });
    }

    const requestOrigin = request.headers.get('origin') || request.nextUrl?.origin || undefined;
    const welcome = await emailWelcomeSignup({
      to: targetEmail,
      learnerNames: profile.name ? [String(profile.name)] : [],
      appUrl: requestOrigin,
    });

    return NextResponse.json({
      ok: true,
      emailed: welcome.ok,
      ...(welcome.ok ? {} : { emailError: welcome.error }),
    });
  } catch (err: any) {
    console.error('[signup-welcome] error:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'Unexpected error' }, { status: 500 });
  }
}
