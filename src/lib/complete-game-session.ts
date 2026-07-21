import { ACTIVITY_BONUS_POINTS } from '@/lib/points-policy';
import { authJsonFetch } from '@/lib/auth-headers';

export type CompleteGameSessionResult = {
  ok: boolean;
  pointsAwarded: number;
  message?: string;
  profile?: {
    points: number;
    weeklyPoints: number;
    monthlyPoints: number;
    todayPoints: number;
  };
  warning?: string;
};

export async function completeGameSession(params: {
  userId: string;
  gameId: string;
  gameTitle?: string;
  difficulty?: string;
  tasksPlayed?: number;
  trackCompetition?: boolean;
}): Promise<CompleteGameSessionResult> {
  const {
    userId,
    gameId,
    gameTitle,
    difficulty = 'medium',
    tasksPlayed,
    trackCompetition = false,
  } = params;

  try {
    const res = await authJsonFetch('/api/games/track', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        gameId,
        gameTitle: gameTitle || gameId,
        difficulty,
        tasksPlayed,
        awardPoints: true,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (trackCompetition) {
      try {
        await authJsonFetch('/api/competition/track', {
          method: 'POST',
          body: JSON.stringify({ userId, activity: 'game' }),
        });
      } catch {
        /* non-blocking */
      }
    }

    if (!res.ok) {
      return {
        ok: false,
        pointsAwarded: 0,
        message: data?.error || data?.message || 'Could not save game progress.',
      };
    }

    return {
      ok: Boolean(data?.ok),
      pointsAwarded: Number(data?.pointsAwarded ?? 0),
      message: data?.message,
      profile: data?.profile,
      warning: data?.warning,
    };
  } catch {
    return {
      ok: false,
      pointsAwarded: 0,
      message: 'Could not connect. Check your internet and try again.',
    };
  }
}

export { ACTIVITY_BONUS_POINTS };
