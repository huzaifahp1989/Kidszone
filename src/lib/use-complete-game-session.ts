'use client';

import { useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  completeGameSession,
  type CompleteGameSessionResult,
  type GameSessionProfile,
} from '@/lib/complete-game-session';

async function syncGameSessionProfile(
  result: CompleteGameSessionResult,
  handlers: {
    updateLocalProfile?: (updates: Partial<GameSessionProfile>) => void;
    refreshProfile?: () => Promise<void>;
  }
): Promise<void> {
  if (
    result.profile &&
    handlers.updateLocalProfile &&
    Number.isFinite(result.profile.points)
  ) {
    handlers.updateLocalProfile({
      points: result.profile.points,
      weeklyPoints: result.profile.weeklyPoints,
      monthlyPoints: result.profile.monthlyPoints,
      todayPoints: result.profile.todayPoints,
    });
  }
  if (result.ok) {
    try {
      await handlers.refreshProfile?.();
    } catch {
      /* non-blocking */
    }
  }
}

export function useCompleteGameSession() {
  const { refreshProfile, updateLocalProfile } = useAuth();

  return useCallback(
    async (
      params: Parameters<typeof completeGameSession>[0]
    ): Promise<CompleteGameSessionResult> => {
      const result = await completeGameSession(params);
      await syncGameSessionProfile(result, { updateLocalProfile, refreshProfile });
      return result;
    },
    [refreshProfile, updateLocalProfile]
  );
}
