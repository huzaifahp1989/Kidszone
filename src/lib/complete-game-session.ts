'use client';

import { authJsonFetch } from '@/lib/auth-headers';
import { LIVE_APP_URL } from '@/lib/app-url';

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

  const live = LIVE_APP_URL.replace(/\/$/, '');

  try {
    // Always hit the canonical live host so Cap/WebViews on a stale Vercel
    // project still write game points to the working backend.
    const res = await authJsonFetch(`${live}/api/games/track`, {
      method: 'POST',
      timeoutMs: 20_000,
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
        await authJsonFetch(`${live}/api/competition/track`, {
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
