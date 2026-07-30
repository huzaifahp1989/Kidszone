import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { awardPointsWithDailyCapByUserId } from '@/lib/server-points';

const SURVEY_POINTS = 50;

// POST — admin approve a feedback submission and award 50 points
export async function POST(request: Request) {
  const adminAuth = request.headers.get('x-admin-auth');
  if (adminAuth !== 'true') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const { id, action } = await request.json(); // action: 'approve' | 'reject'
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    if (!['approve', 'reject'].includes(action)) return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });

    // Fetch the submission
    const { data: submission, error: fetchErr } = await supabaseAdmin
      .from('kids_zone_feedback')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }
    if (submission.status === 'approved') {
      return NextResponse.json({ error: 'Already approved.' }, { status: 409 });
    }

    let pointsAwarded = 0;

    if (action === 'approve' && submission.user_id) {
      // Award 50 points to the user
      const award = await awardPointsWithDailyCapByUserId(submission.user_id, SURVEY_POINTS, {
        successMessage: `Feedback survey approved! +${SURVEY_POINTS} points.`,
        countTowardDailyLimit: false,
      });
      if (award.success) pointsAwarded = award.pointsAwarded ?? SURVEY_POINTS;
    }

    const { error: updateErr } = await supabaseAdmin
      .from('kids_zone_feedback')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        points_awarded: pointsAwarded,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true, pointsAwarded });
  } catch (err: any) {
    console.error('Feedback approve error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
