'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Gift, Sparkles, Target, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { authJsonFetch, getAuthFetchHeaders } from '@/lib/auth-headers';

type Mission = {
  key: string;
  title: string;
  description: string;
  href: string;
  icon: string;
  target: number;
  unit: string;
  accent: 'teal' | 'amber' | 'rose' | 'violet' | string;
  progress: number;
  completed: boolean;
};

type MissionPayload = {
  date: string;
  missions: Mission[];
  summary: {
    completedCount: number;
    totalCount: number;
    allCompleted: boolean;
  };
  reward: {
    points: number;
    configured: boolean;
    available: boolean;
    claimed: boolean;
    claimedAt: string | null;
    claimedPoints: number;
  };
  familyStreak?: {
    familyEmail: string;
    streak: number;
    lastMissionDate: string | null;
    creditedToday: boolean;
  } | null;
};

const accentStyles: Record<string, { badge: string; panel: string; progress: string; link: string }> = {
  teal: {
    badge: 'bg-[#f5f3ff] text-[#6d28d9] border-[#7c3aed]/20',
    panel: 'from-[#7c3aed]/12 to-white',
    progress: 'from-[#7c3aed] to-[#5b21b6]',
    link: 'text-[#6d28d9]',
  },
  amber: {
    badge: 'bg-[#fffbeb] text-[#b45309] border-[#f59e0b]/20',
    panel: 'from-[#fbbf24]/14 to-white',
    progress: 'from-[#fbbf24] to-[#f59e0b]',
    link: 'text-[#b45309]',
  },
  rose: {
    badge: 'bg-[#fff1f2] text-[#e11d48] border-[#fb7185]/20',
    panel: 'from-[#fb7185]/14 to-white',
    progress: 'from-[#fb7185] to-[#e11d48]',
    link: 'text-[#be123c]',
  },
  violet: {
    badge: 'bg-[#f5f3ff] text-[#7c3aed] border-[#8b5cf6]/20',
    panel: 'from-[#8b5cf6]/14 to-white',
    progress: 'from-[#8b5cf6] to-[#6366f1]',
    link: 'text-[#6d28d9]',
  },
};

function getProgressPercent(progress: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((progress / target) * 100));
}

export default function DailyMissions() {
  const { user, refreshProfile, updateLocalProfile } = useAuth();
  const [payload, setPayload] = useState<MissionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimMessage, setClaimMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setPayload(null);
      setLoading(false);
      return;
    }

    let active = true;

    const loadMissions = async () => {
      setLoading(true);
      try {
        const headers = await getAuthFetchHeaders();
        const res = await fetch(`/api/kids-zone/daily-missions?userId=${user.id}`, {
          cache: 'no-store',
          headers,
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to load daily missions');
        }
        if (active) {
          setPayload(data);
        }
      } catch {
        if (active) {
          setPayload(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadMissions();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const claimBonus = async () => {
    if (!user?.id || !payload?.reward.available || claiming) {
      return;
    }

    setClaiming(true);
    setClaimMessage(null);
    try {
      const res = await authJsonFetch('/api/kids-zone/daily-missions/claim', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to claim mission bonus');
      }

      setClaimMessage(data?.message || 'Mission bonus claimed.');
      setPayload((current) => {
        if (!current) return current;
        return {
          ...current,
          familyStreak: data?.familyStreak ?? current.familyStreak,
          reward: {
            ...current.reward,
            available: false,
            claimed: true,
            claimedAt: new Date().toISOString(),
            claimedPoints: Number(data?.pointsAwarded || 0),
          },
        };
      });

      if (data?.totals) {
        updateLocalProfile({
          points: data.totals.totalPoints,
          weeklyPoints: data.totals.weeklyPoints,
          monthlyPoints: data.totals.monthlyPoints,
          todayPoints: data.totals.todayPoints,
          badges: data.totals.badges,
          level: data.totals.level ? `Level ${data.totals.level}` : undefined,
        });
      }
      await refreshProfile();
    } catch (error: any) {
      setClaimMessage(error?.message || 'Could not claim mission bonus right now.');
    } finally {
      setClaiming(false);
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <section className="bg-white rounded-2xl p-6 shadow-lg border border-[#c4b5fd]/20">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded bg-[#f3e7d8]" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-36 rounded-2xl bg-[#ede9fe]" />
            <div className="h-36 rounded-2xl bg-[#ede9fe]" />
          </div>
        </div>
      </section>
    );
  }

  if (!payload?.missions?.length) {
    return null;
  }

  return (
    <section className="bg-white rounded-2xl p-6 shadow-lg border border-[#c4b5fd]/20 space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#f5f3ff] rounded-full border border-[#7c3aed]/20 text-sm font-semibold text-[#6d28d9]">
            <Sparkles size={16} />
            Daily Missions
          </div>
          <h3 className="mt-3 text-2xl font-bold text-[#1e1b4b]">Today&apos;s Kids Zone Challenge</h3>
          <p className="text-[#475569] text-sm mt-1">
            Finish missions across quiz, games, Create & Play, and points. Any sibling completing all missions keeps your family streak going!
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {payload.familyStreak ? (
            <div className="rounded-2xl bg-[#fffbeb] border border-[#fbbf24]/30 px-4 py-3 min-w-[160px]">
              <p className="text-xs uppercase tracking-[0.2em] text-[#b45309] flex items-center gap-1">
                <Users size={14} />
                Family streak
              </p>
              <p className="mt-1 text-2xl font-bold text-[#92400e]">{payload.familyStreak.streak} days</p>
              <p className="text-xs text-[#a16207] mt-1">
                {payload.familyStreak.creditedToday ? 'Active today!' : 'Complete all missions today'}
              </p>
            </div>
          ) : null}

          <div className="rounded-2xl bg-[#f5f3ff] border border-[#c4b5fd]/30 px-4 py-3 min-w-[180px]">
          <p className="text-xs uppercase tracking-[0.2em] text-[#475569]">Completed</p>
          <div className="mt-1 flex items-center gap-2 text-[#1e1b4b]">
            <Target size={18} className="text-[#7c3aed]" />
            <span className="text-2xl font-bold">
              {payload.summary.completedCount}/{payload.summary.totalCount}
            </span>
          </div>
          <p className="text-sm text-[#475569] mt-1">
            {payload.summary.allCompleted ? 'All missions complete. Amazing work today.' : 'Keep going to finish the full set.'}
          </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[#fbbf24]/30 bg-gradient-to-r from-[#fffbeb] to-[#fff7ed] px-5 py-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 text-[#b45309] font-bold">
              <Gift size={18} />
              Mission Bonus
            </div>
            <p className="text-sm text-[#92400e] mt-1">
              Finish all 4 daily missions to unlock an extra +{payload.reward.points} points.
            </p>
            {!payload.reward.configured ? (
              <p className="text-xs text-[#a16207] mt-2">Bonus claim setup is not enabled in the database yet.</p>
            ) : payload.reward.claimed ? (
              <p className="text-xs text-emerald-700 mt-2">
                Bonus claimed today{payload.reward.claimedPoints > 0 ? ` for +${payload.reward.claimedPoints} points.` : '.'}
              </p>
            ) : null}
            {claimMessage ? (
              <p className="text-xs text-[#1e1b4b] mt-2">{claimMessage}</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={claimBonus}
            disabled={!payload.reward.available || claiming}
            className={`px-5 py-3 rounded-xl font-bold transition-all ${
              payload.reward.available && !claiming
                ? 'bg-gradient-to-r from-[#f59e0b] to-[#d97706] text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                : 'bg-white text-[#475569] border border-[#c4b5fd]/40 cursor-not-allowed'
            }`}
          >
            {claiming ? 'Claiming...' : payload.reward.claimed ? 'Bonus Claimed' : `Claim +${payload.reward.points}`}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {payload.missions.map((mission) => {
          const styles = accentStyles[mission.accent] || accentStyles.teal;
          const progressPercent = getProgressPercent(mission.progress, mission.target);
          const displayProgress = Math.min(mission.progress, mission.target);

          return (
            <div
              key={mission.key}
              className={`rounded-2xl border border-[#c4b5fd]/20 bg-gradient-to-br ${styles.panel} p-5 shadow-sm`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-2xl">
                    {mission.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1e1b4b]">{mission.title}</h4>
                    <p className="text-sm text-[#475569] mt-1">{mission.description}</p>
                  </div>
                </div>

                <div className={`shrink-0 px-3 py-1 rounded-full border text-xs font-bold ${styles.badge}`}>
                  {mission.completed ? 'Done' : `${displayProgress}/${mission.target}`}
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-[#1e1b4b] mb-2">
                  <span>
                    {displayProgress} of {mission.target} {mission.unit}
                  </span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="h-3 rounded-full bg-white/80 overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${styles.progress} transition-all duration-700`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <Link href={mission.href} className={`text-sm font-bold ${styles.link}`}>
                  Open mission →
                </Link>
                {mission.completed ? (
                  <div className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
                    <CheckCircle2 size={16} />
                    Mission complete
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}