'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { authFetch } from '@/lib/auth-headers';
import { useAgeMode } from '@/lib/age-mode';

type Challenge = {
  targetPoints: number;
  progressPoints: number;
  completed: boolean;
  percent: number;
};

export function FamilyChallengeCard() {
  const { user } = useAuth();
  const { isYounger } = useAgeMode();
  const [challenge, setChallenge] = useState<Challenge | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await authFetch(`/api/kids-zone/family-challenge?userId=${user.id}`);
      const data = await res.json();
      if (res.ok && data.challenge) setChallenge(data.challenge);
    } catch {
      /* ignore */
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user?.id || !challenge || isYounger) return null;

  return (
    <section className="rounded-3xl border border-sky-200 bg-gradient-to-r from-sky-50 to-white p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-600 text-white">
          <Users size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-lg font-extrabold text-sand-900">Family Weekly Challenge</h3>
          <p className="text-sm text-sand-600">
            Earn {challenge.targetPoints} points together this week
            {challenge.completed ? ' — done! 🎉' : '.'}
          </p>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-sky-100">
            <div
              className="h-full rounded-full bg-sky-500 transition-all"
              style={{ width: `${challenge.percent}%` }}
            />
          </div>
          <p className="mt-1 text-xs font-bold text-sky-800">
            {challenge.progressPoints}/{challenge.targetPoints} family points
          </p>
        </div>
      </div>
    </section>
  );
}
