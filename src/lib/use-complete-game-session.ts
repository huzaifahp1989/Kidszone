'use client';

import { useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  completeGameSession,
  type CompleteGameSessionResult,
  type GameSessionProfile,
} from '@/lib/complete-game-session';
import { mergePointsAfterAward, type PointsProfileSlice } from '@/lib/profile-points-merge';

async function syncGameSessionProfile(
  result: CompleteGameSessionResult,
  handlers: {
    updateLocalProfile?: (updates: Partial<GameSessionProfile>) => void;
    refreshProfile?: () => Promise<void>;
    profile?: PointsProfileSlice | null;
  }
): Promise<void> {
  if (handlers.updateLocalProfile && (result.pointsAwarded > 0 || result.profile)) {
    const merged = mergePointsAfterAward(
      handlers.profile,
      result.pointsAwarded,
      result.profile
    );
    if (result.pointsAwarded > 0 || merged.points > 0) {
      handlers.updateLocalProfile(merged);
    }
  }
  try {
    if (result.pointsAwarded > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    await handlers.refreshProfile?.();
  } catch {
    /* non-blocking */
  }
}

export function useCompleteGameSession() {
  const { refreshProfile, updateLocalProfile, profile } = useAuth();

  return useCallback(
    async (
      params: Parameters<typeof completeGameSession>[0]
    ): Promise<CompleteGameSessionResult> => {
      const result = await completeGameSession(params);
      await syncGameSessionProfile(result, { updateLocalProfile, refreshProfile, profile });
      return result;
    },
    [refreshProfile, updateLocalProfile, profile]
  );
}
