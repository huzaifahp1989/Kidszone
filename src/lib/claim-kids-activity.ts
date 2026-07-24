import { authJsonFetch } from '@/lib/auth-headers';
import type { DailyEarnActivity } from '@/lib/points-policy';
import { dispatchPointsProfileUpdate } from '@/lib/points-profile-sync';

export type ClaimKidsActivityResult = {
  ok: boolean;
  pointsAwarded: number;
  message: string;
  profile?: {
    points: number;
    weeklyPoints: number;
    monthlyPoints: number;
    todayPoints: number;
  };
};

export async function claimKidsActivity(
  userId: string,
  activity: Extract<DailyEarnActivity, 'creative' | 'story_choice' | 'dua' | 'kindness' | 'manners'>
): Promise<ClaimKidsActivityResult> {
  try {
    const res = await authJsonFetch('/api/activities/complete', {
      method: 'POST',
      body: JSON.stringify({ userId, activity }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, pointsAwarded: 0, message: data.error || 'Could not save points.' };
    }
    if (data.profile) {
      dispatchPointsProfileUpdate(data.profile);
    }
    return {
      ok: true,
      pointsAwarded: Number(data.pointsAwarded ?? 0),
      message: data.message || 'Done!',
      profile: data.profile,
    };
  } catch {
    return { ok: false, pointsAwarded: 0, message: 'Could not connect. Try again.' };
  }
}
