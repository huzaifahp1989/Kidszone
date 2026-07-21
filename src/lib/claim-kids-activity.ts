import { authJsonFetch } from '@/lib/auth-headers';
import type { DailyEarnActivity } from '@/lib/points-policy';

export type ClaimKidsActivityResult = {
  ok: boolean;
  pointsAwarded: number;
  message: string;
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
    return {
      ok: true,
      pointsAwarded: Number(data.pointsAwarded ?? 0),
      message: data.message || 'Done!',
    };
  } catch {
    return { ok: false, pointsAwarded: 0, message: 'Could not connect. Try again.' };
  }
}
