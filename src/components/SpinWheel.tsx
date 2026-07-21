'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { buildFallbackSpinStatus } from '@/lib/spin-wheel';
import { Gift, Sparkles } from 'lucide-react';

type RewardSlot = {
  key: string;
  label: string;
  color: string;
  weeklyLimit: number;
  claimedCount: number;
  remaining: number;
  available: boolean;
};

type SpinWheelStatus = {
  weekStartDate: string;
  isWinner: boolean;
  canSpin: boolean;
  hasSpun: boolean;
  spin: {
    rewardKey: string;
    rewardLabel: string;
    createdAt?: string;
  } | null;
  rewards: RewardSlot[];
};

const SPIN_DURATION_MS = 4200;

export function SpinWheel() {
  const [status, setStatus] = useState<SpinWheelStatus>(() => buildFallbackSpinStatus());
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{ rewardKey: string; rewardLabel: string; color: string } | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setSignedIn(false);
        setStatus(buildFallbackSpinStatus());
        return;
      }

      setSignedIn(true);
      const res = await fetch('/api/rewards/spin-wheel/status', {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load spin wheel');

      setStatus(json);
      if (json.spin) {
        setResult({
          rewardKey: json.spin.rewardKey,
          rewardLabel: json.spin.rewardLabel,
          color: json.rewards?.find((r: RewardSlot) => r.key === json.spin.rewardKey)?.color || '#0d9488',
        });
      } else {
        setResult(null);
      }
    } catch (err: any) {
      setMessage(err?.message || 'Could not load live spin status. Showing preview wheel.');
      setStatus(buildFallbackSpinStatus());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const rewards = status.rewards;
  const segmentAngle = rewards.length ? 360 / rewards.length : 0;

  const spinToReward = useCallback(
    async () => {
      if (!status.canSpin || spinning || !rewards.length) return;

      setSpinning(true);
      setMessage(null);
      setResult(null);

      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error('Sign in required');

        const res = await fetch('/api/rewards/spin-wheel/spin', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Spin failed');

        const rewardIndex = rewards.findIndex((reward) => reward.key === json.spin.rewardKey);
        const safeIndex = rewardIndex >= 0 ? rewardIndex : 0;
        const extraTurns = 5 * 360;
        const pointerOffset = 270;
        const targetRotation = extraTurns + pointerOffset - (safeIndex * segmentAngle + segmentAngle / 2);

        setRotation((prev) => prev + targetRotation);
        setTimeout(() => {
          setResult({
            rewardKey: json.spin.rewardKey,
            rewardLabel: json.spin.rewardLabel,
            color: json.spin.color || rewards[safeIndex]?.color || '#0d9488',
          });
          setSpinning(false);
          loadStatus();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('kidszone-spin-complete'));
          }
        }, SPIN_DURATION_MS);
      } catch (err: any) {
        setMessage(err?.message || 'Could not spin the wheel.');
        setSpinning(false);
      }
    },
    [status.canSpin, spinning, rewards, segmentAngle, loadStatus]
  );

  const wheelGradient = useMemo(() => {
    if (!rewards.length) return 'conic-gradient(#ddd 0deg 360deg)';
    const stops = rewards
      .map((reward, index) => {
        const start = index * segmentAngle;
        const end = (index + 1) * segmentAngle;
        return `${reward.color} ${start}deg ${end}deg`;
      })
      .join(', ');
    return `conic-gradient(from -90deg, ${stops})`;
  }, [rewards, segmentAngle]);

  const statusBanner = !signedIn ? (
    <p className="mt-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
      <Link href="/signin?next=/rewards" className="font-bold underline">Sign in</Link> to check if you can spin this week.
    </p>
  ) : !status.isWinner ? (
    <p className="mt-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
      Weekly winners are picked at random from everyone who qualifies (150+ points). Keep learning — you could be chosen next week!
    </p>
  ) : status.hasSpun ? (
    <p className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
      You already spun this week. Your prize is shown below.
    </p>
  ) : (
    <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
      You are a winner this week. Tap spin once to claim your reward.
    </p>
  );

  return (
    <div className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-amber-50 p-6 shadow-lg">
      <div className="mb-5">
        <div className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-violet-800">
          {status.isWinner ? <Sparkles size={14} /> : <Gift size={14} />}
          {status.isWinner ? 'Winner reward' : 'Weekly winner prizes'}
        </div>
        <h3 className="mt-2 text-2xl font-bold text-violet-950">Spin the Wheel</h3>
        <p className="mt-1 text-sm text-violet-800">
          Week starting {status.weekStartDate}. Each reward can be won by up to 2 winners this week.
        </p>
        {statusBanner}
      </div>

      {loading ? (
        <div className="mb-6 h-72 animate-pulse rounded-full bg-violet-100/80" />
      ) : (
        <div className="mx-auto flex max-w-md flex-col items-center">
          <div className="relative mb-6 h-72 w-72 max-w-full">
            <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2">
              <div className="h-0 w-0 border-x-[14px] border-b-[24px] border-x-transparent border-b-violet-700 drop-shadow" />
            </div>
            <div
              className="absolute inset-4 rounded-full border-8 border-violet-200 shadow-2xl transition-transform ease-out"
              style={{
                background: wheelGradient,
                transform: `rotate(${rotation}deg)`,
                transitionDuration: spinning ? `${SPIN_DURATION_MS}ms` : '0ms',
                opacity: status.isWinner ? 1 : 0.92,
              }}
            >
              {rewards.map((reward, index) => {
                const angle = index * segmentAngle + segmentAngle / 2 - 90;
                const radius = 92;
                const x = 50 + radius * Math.cos((angle * Math.PI) / 180);
                const y = 50 + radius * Math.sin((angle * Math.PI) / 180);
                return (
                  <div
                    key={reward.key}
                    className="absolute text-center text-[10px] font-bold leading-tight text-white drop-shadow"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: 'translate(-50%, -50%)',
                      width: '4.5rem',
                    }}
                  >
                    {reward.label}
                  </div>
                );
              })}
            </div>
            <div className="absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-violet-700 text-xs font-bold text-white shadow-lg">
              SPIN
            </div>
          </div>

          {result ? (
            <div className="mb-4 w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
              <p className="text-sm font-semibold text-emerald-800">You won</p>
              <p className="text-xl font-black text-emerald-900">{result.rewardLabel}</p>
            </div>
          ) : null}

          {message ? (
            <p className="mb-4 text-center text-sm font-semibold text-rose-700">{message}</p>
          ) : null}

          <button
            type="button"
            onClick={spinToReward}
            disabled={!status.canSpin || spinning || !signedIn}
            className="rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {!signedIn
              ? 'Sign in to spin'
              : spinning
                ? 'Spinning...'
                : status.hasSpun
                  ? 'Already spun this week'
                  : status.isWinner
                    ? 'Spin now'
                    : 'Winners only'}
          </button>
        </div>
      )}

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {rewards.map((reward) => (
          <div
            key={reward.key}
            className={`rounded-xl border px-3 py-2 text-sm ${reward.available ? 'border-violet-200 bg-white' : 'border-slate-200 bg-slate-50 opacity-70'}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-800">{reward.label}</span>
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: reward.color }}
                aria-hidden="true"
              />
            </div>
            <p className="text-xs text-slate-600">
              {reward.remaining} of {reward.weeklyLimit} left this week
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
