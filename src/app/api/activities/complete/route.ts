import { NextResponse } from 'next/server';
import { tryAwardDailyActivity } from '@/lib/daily-activity-award';
import { DailyEarnActivity } from '@/lib/points-policy';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireMatchingUser } from '@/lib/request-auth';

export const dynamic = 'force-dynamic';

const ALLOWED: DailyEarnActivity[] = [
  'hadith',
  'salah',
  'story_quiz',
  'creative',
  'story_choice',
  'dua',
  'kindness',
  'manners',
];

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const auth = await requireMatchingUser(req, String(body?.userId || ''));
    if (!auth.ok) return auth.response;

    const { userId } = auth;
    const activity = String(body?.activity || '').trim() as DailyEarnActivity;
    const salahDateKey = String(body?.dateKey || '').trim() || undefined;

    if (!ALLOWED.includes(activity)) {
      return NextResponse.json({ error: 'Invalid activity type' }, { status: 400 });
    }

    const successMessages: Partial<Record<DailyEarnActivity, string>> = {
      hadith: '+25 points for completing Hadith learning today!',
      salah: '+25 points for logging all 5 prayers today!',
      story_quiz: '+25 points for completing a story quiz today!',
      creative: '+25 points for Create & Play today!',
      story_choice: '+25 points for finishing a story adventure today!',
      dua: '+25 points for saying the dua of the day!',
      kindness: '+25 points for completing the kindness hunt!',
      manners: '+25 points for practising good manners!',
    };

    const award = await tryAwardDailyActivity(userId, activity, {
      salahDateKey,
      successMessage: successMessages[activity],
    });

    const { data: pointsRow } = await supabaseAdmin
      .from('users_points')
      .select('total_points, weekly_points, monthly_points, today_points')
      .eq('user_id', userId)
      .maybeSingle();

    return NextResponse.json({
      success: award.success,
      pointsAwarded: award.pointsAwarded,
      message: award.message,
      reason: award.reason,
      profile: {
        points: Number(pointsRow?.total_points ?? 0),
        weeklyPoints: Number(pointsRow?.weekly_points ?? 0),
        monthlyPoints: Number(pointsRow?.monthly_points ?? 0),
        todayPoints: Number(pointsRow?.today_points ?? 0),
      },
    });
  } catch (error: any) {
    console.error('[activities/complete] error:', error);
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
