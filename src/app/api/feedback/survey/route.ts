import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';

// POST — submit a Kids Zone feedback survey
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, age, city, phoneNumber, wantsReminder, feedbackText, howBenefiting } = body;

    if (!fullName || fullName.trim().length < 2) {
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 });
    }

    // Get logged-in user if any (guests can also submit)
    let userId: string | null = null;
    try {
      const user = await getAuthenticatedRequestUser(request);
      userId = user?.id ?? null;
    } catch { /* not logged in */ }

    // One submission per logged-in user
    if (userId) {
      const { data: existing } = await supabaseAdmin
        .from('kids_zone_feedback')
        .select('id, status')
        .eq('user_id', userId)
        .maybeSingle();
      if (existing) {
        return NextResponse.json({
          error: existing.status === 'approved'
            ? 'You already submitted feedback and earned your points — JazakAllah Khair!'
            : 'You have already submitted feedback. We will review it soon!',
          alreadySubmitted: true,
        }, { status: 409 });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('kids_zone_feedback')
      .insert({
        user_id: userId,
        full_name: fullName.trim(),
        age: age ? Number(age) : null,
        city: city?.trim() || null,
        phone_number: phoneNumber?.trim() || null,
        wants_reminder: Boolean(wantsReminder),
        feedback_text: feedbackText?.trim() || null,
        how_benefiting: howBenefiting?.trim() || null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, id: data.id });
  } catch (err: any) {
    console.error('Feedback submit error:', err);
    return NextResponse.json({ error: err.message || 'Failed to submit.' }, { status: 500 });
  }
}

// GET — admin: list all feedback submissions
export async function GET(request: Request) {
  const adminAuth = request.headers.get('x-admin-auth');
  if (adminAuth !== 'true') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'all';
  const page = Math.max(0, Number(searchParams.get('page') || 0));
  const limit = 50;

  let query = supabaseAdmin
    .from('kids_zone_feedback')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (status !== 'all') query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ submissions: data || [], total: count ?? 0 });
}
