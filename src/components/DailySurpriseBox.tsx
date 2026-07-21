'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Gift, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { authFetch, authJsonFetch } from '@/lib/auth-headers';
import { usePointsProgress } from '@/lib/points-progress-context';

type Snapshot = {
  available: boolean;
  claimed: boolean;
  claim: {
    rewardType: string;
    pointsAwarded: number;
    tipHref: string | null;
    tipLabel: string | null;
  } | null;
};

export function DailySurpriseBox() {
  const { user, refreshProfile } = useAuth();
  const { showPointsProgress } = usePointsProgress();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setSnapshot(null);
      return;
    }
    try {
      const res = await authFetch(`/api/kids-zone/daily-surprise?userId=${user.id}`);
      const data = await res.json();
      if (res.ok) setSnapshot(data);
    } catch {
      /* ignore */
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const openBox = async () => {
    if (!user?.id || busy || !snapshot?.available) return;
    setBusy(true);
    try {
      const res = await authJsonFetch('/api/kids-zone/daily-surprise', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      setMessage(data.message || 'Opened!');
      if (data.pointsAwarded > 0) {
        showPointsProgress({
          activity: 'other',
          activityLabel: 'Daily Surprise',
          pointsEarned: data.pointsAwarded,
          message: data.message,
        });
        await refreshProfile();
      }
      if (data.snapshot) setSnapshot(data.snapshot);
      else await load();
    } finally {
      setBusy(false);
    }
  };

  if (!user?.id) return null;

  return (
    <section className="overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-rose-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-amber-800">
            <Gift size={14} /> Daily Surprise
          </p>
          <h3 className="mt-1 font-heading text-xl font-extrabold text-sand-900">Open your surprise box</h3>
          <p className="mt-1 text-sm text-sand-600">
            Once a day — points, a sticker, or a fun tip. Come back tomorrow for another!
          </p>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          animate={snapshot?.available ? { y: [0, -4, 0] } : undefined}
          transition={snapshot?.available ? { repeat: Infinity, duration: 1.6 } : undefined}
          disabled={!snapshot?.available || busy}
          onClick={openBox}
          className="rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 px-5 py-3 font-bold text-white shadow disabled:opacity-50"
        >
          {busy ? 'Opening…' : snapshot?.claimed ? 'Opened today' : 'Open box 🎁'}
        </motion.button>
      </div>
      {(message || snapshot?.claim?.tipLabel) && (
        <p className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-white/80 px-3 py-2 text-sm font-semibold text-amber-950">
          <Sparkles size={14} />
          {message ||
            (snapshot?.claim?.tipHref ? (
              <Link href={snapshot.claim.tipHref} className="underline">
                {snapshot.claim.tipLabel}
              </Link>
            ) : (
              'Come back tomorrow!'
            ))}
        </p>
      )}
    </section>
  );
}
