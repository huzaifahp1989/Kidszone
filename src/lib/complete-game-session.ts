import { ACTIVITY_BONUS_POINTS } from '@/lib/points-policy';
import { authJsonFetch } from '@/lib/auth-headers';

export type GameSessionProfile = {
  points: number;
  weeklyPoints: number;
  monthlyPoints: number;
  todayPoints: number;
};

export type CompleteGameSessionResult = {
  ok: boolean;
  pointsAwarded: number;
  message?: string;
  profile?: GameSessionProfile;
  warning?: string;
};

export type ProfileSyncHandlers = {
  updateLocalProfile?: (updates: Partial<GameSessionProfile>) => void;
  refreshProfile?: () => Promise<void>;
};

/** Apply server-returned totals to auth context so navbar/daily bar update immediately. */
export async function syncGameSessionProfile(
  result: CompleteGameSessionResult,
  handlers: ProfileSyncHandlers
): Promise<void> {
  if (result.profile && handlers.updateLocalProfile) {
    handlers.updateLocalProfile({
      points: result.profile.points,
      weeklyPoints: result.profile.weeklyPoints,
      monthlyPoints: result.profile.monthlyPoints,
      todayPoints: result.profile.todayPoints,
    });
  }
  try {
    await handlers.refreshProfile?.();
  } catch {
    /* non-blocking */
  }
}

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
