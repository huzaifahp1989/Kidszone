'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, Gamepad2, Sparkles, Star, Trophy } from 'lucide-react';
import { Modal, Button } from '@/components';
import { useAuth } from '@/lib/auth-context';
import { usePointsProgress } from '@/lib/points-progress-context';

const POINTS_PER_BADGE = 100;
import { POINTS_DAILY_CAP } from '@/lib/points-policy';
import { getAuthFetchHeaders } from '@/lib/auth-headers';

type WeeklyActivities = {
  completed: number;
  total: number;
  remaining: number;
  qualifiedForDraw: boolean;
};

type CompetitionProgress = {
  completedCount: number;
  remainingCount: number;
  missing: string[];
  entered: boolean;
};

const activityLinks: Record<string, { href: string; label: string }> = {
  'Daily Quiz': { href: '/quiz', label: 'Take quiz' },
  'Play a game': { href: '/games', label: 'Play games' },
  'Pledge Durood': { href: '/pledge', label: 'Pledge Durood' },
};

export function PointsProgressPopup() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const { isOpen, payload, hidePointsProgress } = usePointsProgress();
  const [weekly, setWeekly] = useState<WeeklyActivities | null>(null);
  const [competition, setCompetition] = useState<CompetitionProgress | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !user?.id) return;
    let active = true;
    setLoading(true);

    const load = async () => {
      try {
        await refreshProfile();
        const headers = await getAuthFetchHeaders();
        const [weeklyRes, compRes] = await Promise.all([
          fetch(`/api/rewards/weekly-activities?userId=${user.id}`, { cache: 'no-store', headers }),
          fetch(`/api/competition/track?userId=${user.id}`, { cache: 'no-store', headers }),
        ]);
        if (!active) return;
        const weeklyJson = weeklyRes.ok ? await weeklyRes.json() : null;
        const compJson = compRes.ok ? await compRes.json() : null;
        if (weeklyJson) {
          setWeekly({
            completed: Number(weeklyJson.completed ?? 0),
            total: Number(weeklyJson.total ?? 5),
            remaining: Number(weeklyJson.remaining ?? 5),
            qualifiedForDraw: Boolean(weeklyJson.qualifiedForDraw),
          });
        }
        if (compJson && !compJson.error) {
          setCompetition({
            completedCount: Number(compJson.completedCount ?? 0),
            remainingCount: Number(compJson.remainingCount ?? 3),
            missing: Array.isArray(compJson.missing) ? compJson.missing : [],
            entered: Boolean(compJson.entered),
          });
        }
      } catch {
        /* ignore */
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [isOpen, user?.id, refreshProfile]);

  const totalPoints = Number(profile?.points ?? 0);
  const badgeCount = Number(profile?.badges ?? 0);
  const todayPoints = Number(profile?.todayPoints ?? 0);
  const pointsToNextBadge = Math.max(0, (badgeCount + 1) * POINTS_PER_BADGE - totalPoints);
  const badgeProgress = Math.min(100, ((POINTS_PER_BADGE - pointsToNextBadge) / POINTS_PER_BADGE) * 100);
  const dailyLeft = Math.max(0, POINTS_DAILY_CAP - todayPoints);

  const nextSuggestion = useMemo(() => {
    if (competition?.missing?.length) {
      const first = competition.missing[0];
      return activityLinks[first] || { href: '/quiz', label: 'Keep learning' };
    }
    if (weekly && weekly.remaining > 0) {
      return { href: '/games', label: 'Try a game' };
    }
    return { href: '/leaderboard', label: 'View leaderboard' };
  }, [competition, weekly]);

  if (!payload) return null;

  const earned = payload.pointsEarned;

  return (
    <Modal isOpen={isOpen} onClose={hidePointsProgress} title="Your progress" size="lg">
      <div className="space-y-4">
        <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 text-center">
          <p className="text-4xl">{earned > 0 ? '⭐' : '🌟'}</p>
          <p className="mt-2 text-lg font-bold text-slate-900">
            {earned > 0 ? `+${earned} points from ${payload.activityLabel}!` : payload.activityLabel}
          </p>
          {payload.message && <p className="mt-1 text-sm text-slate-600">{payload.message}</p>}
          <p className="mt-2 text-sm font-semibold text-violet-700">
            Total: {totalPoints} pts · {badgeCount} badge{badgeCount === 1 ? '' : 's'}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="mb-2 flex items-center justify-between text-sm font-bold text-amber-900">
            <span className="flex items-center gap-1.5">
              <Trophy size={16} /> Next badge
            </span>
            <span>{pointsToNextBadge} pts left</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-amber-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all"
              style={{ width: `${badgeProgress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-amber-800">
            Earn 1 badge every {POINTS_PER_BADGE} points — keep taking part every day!
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-center">
            <p className="text-xs font-bold uppercase text-emerald-700">Today</p>
            <p className="mt-1 text-2xl font-black text-emerald-800">{todayPoints}/{POINTS_DAILY_CAP}</p>
            <p className="text-xs font-semibold text-emerald-700">{dailyLeft} pts left today</p>
          </div>
          <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-3 text-center">
            <p className="text-xs font-bold uppercase text-violet-700">Badges</p>
            <p className="mt-1 text-2xl font-black text-violet-800">{badgeCount}</p>
            <p className="text-xs font-semibold text-violet-700">Level {profile?.level ?? 'Beginner'}</p>
          </div>
        </div>

        {!loading && weekly && (
          <div className="rounded-2xl border border-teal-200 bg-teal-50/80 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-teal-900">
              <Star size={16} />
              Weekly activities: {weekly.completed}/{weekly.total}
            </p>
            <p className="mt-1 text-sm text-teal-800">
              {weekly.qualifiedForDraw
                ? 'You finished your 5 weekly activities — star on the leaderboard!'
                : `${weekly.remaining} activit${weekly.remaining === 1 ? 'y' : 'ies'} left this week.`}
            </p>
          </div>
        )}

        {!loading && competition && (
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-4">
            <p className="text-sm font-bold text-indigo-900">
              Weekly prize draw: {competition.completedCount}/3 done
            </p>
            <p className="mt-1 text-sm text-indigo-800">
              {competition.entered
                ? 'You entered this week\'s draw — mashaAllah!'
                : `${competition.remainingCount} left to enter: ${competition.missing.join(', ')}.`}
            </p>
            {!competition.entered && competition.missing.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {competition.missing.map((item) => {
                  const link = activityLinks[item];
                  if (!link) return null;
                  const Icon = item.includes('Quiz') ? BookOpen : item.includes('game') ? Gamepad2 : Sparkles;
                  return (
                    <Link
                      key={item}
                      href={link.href}
                      onClick={hidePointsProgress}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-800 hover:bg-indigo-50"
                    >
                      <Icon size={14} /> {link.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <p className="rounded-xl bg-slate-50 px-3 py-2 text-center text-xs text-slate-600">
          Quiz, games, and Durood all count — come back every day to earn more badges and points!
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => {
              hidePointsProgress();
              router.push(nextSuggestion.href);
            }}
          >
            {nextSuggestion.label}
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => { hidePointsProgress(); router.push('/rewards'); }}>
            Rewards
          </Button>
          <Button variant="outline" onClick={hidePointsProgress}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
