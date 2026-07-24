'use client';

import { useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  completeGameSession,
  syncGameSessionProfile,
  type CompleteGameSessionResult,
} from '@/lib/complete-game-session';

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
