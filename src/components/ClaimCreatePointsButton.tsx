'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { claimKidsActivity } from '@/lib/claim-kids-activity';
import { usePointsProgress } from '@/lib/points-progress-context';
import { PointsBanner } from '@/components/CreateShell';
import type { DailyEarnActivity } from '@/lib/points-policy';
import { tryUnlockStickersClient } from '@/lib/stickers-client';

type CreateClaimActivity = Extract<
  DailyEarnActivity,
  'creative' | 'story_choice' | 'dua' | 'kindness' | 'manners'
>;

const LABELS: Record<CreateClaimActivity, string> = {
  creative: 'Create & Play',
  story_choice: 'Story Adventure',
  dua: 'Dua of the Day',
  kindness: 'Kindness Hunt',
  manners: 'Good Manners',
};

export function ClaimCreatePointsButton({
  activity,
  ready,
  readyLabel = "I'm done — claim points",
  disabledLabel = 'Finish the activity to claim',
}: {
  activity: CreateClaimActivity;
  ready: boolean;
  readyLabel?: string;
  disabledLabel?: string;
}) {
  const { user, refreshProfile } = useAuth();
  const { showPointsProgress } = usePointsProgress();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);

  const onClaim = async () => {
    if (!user?.id || !ready || busy || claimed) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await claimKidsActivity(user.id, activity);
      setMessage(result.message);
      if (result.ok && result.pointsAwarded > 0) {
        setClaimed(true);
        showPointsProgress({
          activity: 'other',
          activityLabel: LABELS[activity],
          pointsEarned: result.pointsAwarded,
          message: result.message,
        });
        await refreshProfile();
        await tryUnlockStickersClient(user.id, [`create_${activity}`, 'create_any']);
      } else if (result.ok && result.pointsAwarded === 0) {
        setClaimed(true);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <PointsBanner message={message} />
      <button
        type="button"
        disabled={!ready || busy || claimed || !user?.id}
        onClick={onClaim}
        className="w-full rounded-2xl bg-gradient-to-r from-teal-600 to-teal-800 px-5 py-3.5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {!user?.id
          ? 'Sign in to claim points'
          : claimed
            ? 'Points claimed for today'
            : busy
              ? 'Claiming…'
              : ready
                ? readyLabel
                : disabledLabel}
      </button>
    </div>
  );
}
