import { NextResponse } from 'next/server';
import { tryAwardDailyActivity } from '@/lib/daily-activity-award';
import { DailyEarnActivity } from '@/lib/points-policy';
import { requireMatchingUser } from '@/lib/request-auth';
import { ensureUserRecords } from '@/lib/ensure-user-records';
import { isTestModeEmail } from '@/lib/test-mode';

export const dynamic = 'force-dynamic';

const ALLOWED: DailyEarnActivity[] = [
  'hadith',
  'salah',
  'story_quiz',
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

    const isTestMode = isTestModeEmail(auth.user.email);
    const ensured = await ensureUserRecords(userId);
    if (!ensured.ok) {
      return NextResponse.json({ error: ensured.error || 'Could not prepare user profile.' }, { status: 500 });
    }

    const successMessages: Partial<Record<DailyEarnActivity, string>> = {
      hadith: '+25 points for completing Hadith learning today!',
      salah: '+25 points for logging all 5 prayers today!',
      story_quiz: '+25 points for completing a story quiz today!',
    };

    const award = await tryAwardDailyActivity(userId, activity, {
      salahDateKey,
      knownIsTestMode: isTestMode,
      skipEnsureUserRecords: true,
      successMessage: successMessages[activity],
    });

    return NextResponse.json({
      success: award.success,
      pointsAwarded: award.pointsAwarded,
      message: award.message,
      reason: award.reason,
      profile: {
        points: Number(award.totalPoints ?? 0),
        weeklyPoints: Number(award.weeklyPoints ?? 0),
        monthlyPoints: Number(award.monthlyPoints ?? 0),
        todayPoints: Number(award.todayPoints ?? 0),
      },
    });
  } catch (error: any) {
    console.error('[activities/complete] error:', error);
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
