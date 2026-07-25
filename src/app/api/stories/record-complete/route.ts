import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { ensureUserRecords } from '@/lib/ensure-user-records';
import {
  awardPointsWithDailyCapByUserId,
  readAuthoritativePointsSnapshot,
} from '@/lib/server-points';
import { RECORDING_APPROVED_POINTS } from '@/lib/points-policy';
import { requireMatchingUser } from '@/lib/request-auth';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const auth = await requireMatchingUser(req, String(body?.userId || ''));
    if (!auth.ok) return auth.response;

    const { userId } = auth;
    const storyId = typeof body?.storyId === 'string' ? body.storyId.trim() : '';

    if (!storyId) {
      return NextResponse.json({ error: 'storyId is required' }, { status: 400 });
    }

    const { data: existingSameWeek, error: existingError } = await supabaseAdmin
      .from('recordings')
      .select('id')
      .eq('user_id', userId)
      .eq('story_id', storyId)
      .gte('created_at', new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (existingError) {
      throw existingError;
    }

    if (Array.isArray(existingSameWeek) && existingSameWeek.length > 0) {
      return NextResponse.json({ ok: true, alreadyRecorded: true, pointsAwarded: 0 });
    }

    const ensured = await ensureUserRecords(userId);
    if (!ensured.ok) {
      return NextResponse.json({ error: ensured.error || 'Could not prepare user profile.' }, { status: 500 });
    }

    const { error: recordingError } = await supabaseAdmin
      .from('recordings')
      .insert({
        user_id: userId,
        story_id: storyId,
        audio_path: `external/${userId}/${Date.now()}`,
        duration: 0,
        status: 'approved',
      });

    if (recordingError) {
      throw recordingError;
    }

    const award = await awardPointsWithDailyCapByUserId(userId, RECORDING_APPROVED_POINTS, {
      // Recording approvals are bonus points — do not consume the daily earn budget.
      countTowardDailyLimit: false,
      successMessage: `+${RECORDING_APPROVED_POINTS} points for your story recording!`,
      skipEnsureUserRecords: true,
    });

    if (!award.success && award.reason === 'update_failed') {
      return NextResponse.json({ error: award.message }, { status: 500 });
    }

    const snapshot = await readAuthoritativePointsSnapshot(userId);

    return NextResponse.json({
      ok: true,
      pointsAwarded: award.pointsAwarded,
      totalPoints: snapshot.hasReliableTotals ? snapshot.totalPoints : award.totalPoints,
      weeklyPoints: snapshot.hasReliableTotals ? snapshot.weeklyPoints : award.weeklyPoints,
      monthlyPoints: snapshot.hasReliableTotals ? snapshot.monthlyPoints : award.monthlyPoints,
      todayPoints: snapshot.hasReliableTotals ? snapshot.todayPoints : award.todayPoints,
      profile: snapshot.hasReliableTotals
        ? {
            points: snapshot.totalPoints,
            weeklyPoints: snapshot.weeklyPoints,
            monthlyPoints: snapshot.monthlyPoints,
            todayPoints: snapshot.todayPoints,
          }
        : undefined,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
