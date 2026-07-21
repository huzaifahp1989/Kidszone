import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

import { POINTS_DAILY_CAP, resolvePointsToAward } from '@/lib/points-policy';

const POINTS_PER_RECORDING = 30;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
    const storyId = typeof body?.storyId === 'string' ? body.storyId.trim() : '';

    if (!userId || !storyId) {
      return NextResponse.json({ error: 'userId and storyId are required' }, { status: 400 });
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

    const { data: currentPointsRow, error: pointsFetchError } = await supabaseAdmin
      .from('users_points')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (pointsFetchError && pointsFetchError.code !== 'PGRST116') {
      throw pointsFetchError;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayPoints = currentPointsRow?.last_earned_date === todayStr ? Number(currentPointsRow?.today_points || 0) : 0;
    const pointsToAward = resolvePointsToAward(
      POINTS_PER_RECORDING,
      todayPoints,
      true
    );

    const totalPoints = Number(currentPointsRow?.total_points || 0) + pointsToAward;
    const weeklyPoints = Number(currentPointsRow?.weekly_points || 0) + pointsToAward;
    const monthlyPoints = Number(currentPointsRow?.monthly_points || 0) + pointsToAward;
    const updatedTodayPoints = todayPoints + pointsToAward;
    const badges = Math.floor(totalPoints / 100);
    const level = 1 + Math.floor(badges / 5);

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

    const { error: pointsUpsertError } = await supabaseAdmin
      .from('users_points')
      .upsert({
        user_id: userId,
        total_points: totalPoints,
        weekly_points: weeklyPoints,
        monthly_points: monthlyPoints,
        today_points: updatedTodayPoints,
        last_earned_date: todayStr,
        badges,
        level,
      }, { onConflict: 'user_id' });

    if (pointsUpsertError) {
      throw pointsUpsertError;
    }

    const { error: userSyncError } = await supabaseAdmin
      .from('users')
      .update({
        points: totalPoints,
        weeklypoints: weeklyPoints,
        monthlypoints: monthlyPoints,
      })
      .eq('uid', userId);

    if (userSyncError) {
      throw userSyncError;
    }

    return NextResponse.json({
      ok: true,
      pointsAwarded: pointsToAward,
      totalPoints,
      weeklyPoints,
      monthlyPoints,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}