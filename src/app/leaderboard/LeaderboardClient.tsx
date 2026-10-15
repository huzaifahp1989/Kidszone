'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePresence } from '@/lib/presence-context';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Trophy, Sparkles, Star, MessageCircle, Coins, CalendarDays } from 'lucide-react';

import {
  getWeeklyDrawPointsRemaining,
  isEligibleForWeeklyDraw,
  WEEKLY_DRAW_MIN_POINTS,
} from '@/lib/leaderboard-rules';
import { POINTS_DAILY_CAP } from '@/lib/points-policy';
import { MAX_WEEKLY_SCORE } from '@/lib/weekly-score-core';
import { getKidLevelTitle } from '@/lib/level-names';
import { RecordAndEarnBanner } from '@/components/RecordAndEarnBanner';

type LeaderboardTab = 'weekly' | 'monthly' | 'lifetime';

type Entry = {
  uid: string;
  name: string;
  madrasahName?: string;
  city?: string;
  age?: number | null;
  level: number;
  points: number;
  weeklyPoints?: number;
  todayPoints?: number;
  weeklyScore?: number;
  weeklyStars?: number;
  maxWeeklyScore?: number;
  monthlyPoints?: number;
  weeklyActivityCount?: number;
  badges?: number;
  lastPlayedDate?: string | null;
  winnerTick?: boolean;
  weeklyChallengeDone?: boolean;
  drawEligible?: boolean;
  isOnline?: boolean;
  certificateCount?: number;
  latestCertificateTier?: string | null;
  latestCertificateWeekStart?: string | null;
};

type Row = {
  rank: number;
  username: string;
  madrasahName: string;
  city: string;
  age: number | null;
  level: number;
  weeklyScore: number;
  maxWeeklyScore: number;
  activityCount: number;
  weeklyPoints: number;
  monthlyPoints: number;
  todayPoints: number;
  points: number;
  uid: string;
  badges: number;
  weeklyStars: number;
  lastPlayedDate: string | null;
  winnerTick: boolean;
  weeklyChallengeDone: boolean;
  isOnline: boolean;
  certificateCount: number;
  latestCertificateTier: string | null;
  latestCertificateWeekStart: string | null;
};

export default function LeaderboardClient() {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('weekly');
  const [entries, setEntries] = useState<Entry[]>([]);
  const { onlineUserIds } = usePresence();
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const fetchAbortRef = useRef<AbortController | null>(null);

  const loadLeaderboard = useCallback(async (opts?: { soft?: boolean }) => {
    if (!opts?.soft) setLoading(true);
    try {
      fetchAbortRef.current?.abort();
      const controller = new AbortController();
      fetchAbortRef.current = controller;

      const res = await fetch(`/api/leaderboard/public?tab=${activeTab}&t=${Date.now()}`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      const json = await res.json();

      if (!res.ok || !Array.isArray(json.entries)) return;

      setEntries(json.entries as Entry[]);
    } catch (err) {
      const isAbort = (err as any)?.name === 'AbortError';
      if (!isAbort) console.error('Leaderboard load error:', err);
    } finally {
      if (!opts?.soft) setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  useEffect(() => {
    const channel = supabase
      .channel('leaderboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users_points' }, () => {
        loadLeaderboard({ soft: true });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadLeaderboard]);

  const leaderboardData = useMemo<Row[]>(() => {
    return entries.map((entry, index) => ({
      rank: index + 1,
      username: entry.name,
      madrasahName: entry.madrasahName || '',
      city: entry.city || '',
      age: entry.age ?? null,
      level: entry.level,
      weeklyScore: entry.weeklyScore ?? 0,
      weeklyStars: entry.weeklyStars ?? 0,
      maxWeeklyScore: entry.maxWeeklyScore ?? MAX_WEEKLY_SCORE,
      activityCount: entry.weeklyActivityCount ?? 0,
      weeklyPoints: entry.weeklyPoints ?? 0,
      monthlyPoints: entry.monthlyPoints ?? 0,
      todayPoints: entry.todayPoints ?? 0,
      points: entry.points ?? 0,
      uid: entry.uid,
      badges: entry.badges ?? 0,
      lastPlayedDate: entry.lastPlayedDate ?? null,
      winnerTick: entry.winnerTick ?? false,
      weeklyChallengeDone: entry.weeklyChallengeDone ?? false,
      isOnline: onlineUserIds.has(entry.uid),
      certificateCount: entry.certificateCount ?? 0,
      latestCertificateTier: entry.latestCertificateTier ?? null,
      latestCertificateWeekStart: entry.latestCertificateWeekStart ?? null,
    }));
  }, [entries, onlineUserIds]);

  const myRankIndex = useMemo(() => {
    const uid = String(profile?.uid || '').trim();
    if (!uid) return -1;
    return leaderboardData.findIndex((entry) => entry.uid === uid);
  }, [leaderboardData, profile?.uid]);

  const myRow = myRankIndex >= 0 ? leaderboardData[myRankIndex] : null;
  const myWeeklyStars = myRow?.weeklyStars ?? 0;

  const currentUserWeeklyPoints = useMemo(() => {
    const uid = String(profile?.uid || '').trim();
    if (!uid) return null;
    const found = entries.find((e) => String(e.uid) === uid);
    const points = Number(found?.weeklyPoints ?? profile?.weeklyPoints ?? 0);
    return Number.isFinite(points) ? points : 0;
  }, [entries, profile?.uid, profile?.weeklyPoints]);

  const currentUserMonthlyPoints = useMemo(() => {
    const uid = String(profile?.uid || '').trim();
    if (!uid) return null;
    const found = entries.find((e) => String(e.uid) === uid);
    const points = Number(found?.monthlyPoints ?? profile?.monthlyPoints ?? 0);
    return Number.isFinite(points) ? points : 0;
  }, [entries, profile?.uid, profile?.monthlyPoints]);

  const currentUserTodayPoints = useMemo(() => {
    const uid = String(profile?.uid || '').trim();
    if (!uid) return null;
    const found = entries.find((e) => String(e.uid) === uid);
    if (found) return Number(found.todayPoints ?? 0);
    const fromProfile = Number(profile?.todayPoints ?? 0);
    return Number.isFinite(fromProfile) ? fromProfile : 0;
  }, [entries, profile?.uid, profile?.todayPoints]);

  const drawStatus = useMemo(() => {
    if (currentUserWeeklyPoints == null) return null;
    const qualified = isEligibleForWeeklyDraw(currentUserWeeklyPoints);
    const remainingPoints = getWeeklyDrawPointsRemaining(currentUserWeeklyPoints);
    return { qualified, remainingPoints };
  }, [currentUserWeeklyPoints]);

  const isYou = (uid: string) => uid === profile?.uid;
  const isMonthly = activeTab === 'monthly';
  const isLifetime = activeTab === 'lifetime';
  const pointsLabel = isLifetime ? 'Total pts' : isMonthly ? 'Month pts' : 'Week pts';

  const formatPlayedDate = (isoDate: string | null | undefined) => {
    if (!isoDate) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
    if (!m) return isoDate;
    const y = m[1];
    const mm = parseInt(m[2], 10);
    const dd = parseInt(m[3], 10);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mon = months[mm - 1] || m[2];
    return `${dd} ${mon} ${y}`;
  };

  const getRankIcon = (rank: number) => (
    <span className="font-bold text-sand-700">#{rank}</span>
  );

  return (
    <div className="min-h-screen bg-teal-50 pattern-islamic">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:space-y-8">
        <RecordAndEarnBanner />
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#fbbf24]/30 bg-[#fffbeb] px-4 py-2">
            <Trophy size={16} className="text-[#f59e0b]" />
            <span className="text-sm font-semibold text-[#b45309]">Competition Leaderboard</span>
          </div>
          <h1 className="text-4xl font-bold text-teal-900 md:text-5xl">Leaderboard</h1>
          <p className="text-lg text-sand-700">
            {isLifetime
              ? 'See who has earned the most points overall'
              : isMonthly
                ? 'See who has earned the most points this month'
                : 'See who is most active this week — winners are picked by random draw, not rank'}
          </p>
        </div>

        <Link
          href="/monthly-winners"
          className="mx-auto flex max-w-xl items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-left shadow-sm transition hover:bg-amber-100"
        >
          <span>
            <span className="block text-sm font-black text-amber-950">Check out our monthly winners</span>
            <span className="mt-1 block text-xs text-amber-900">See winners from October, November, and other months.</span>
          </span>
          <Trophy size={22} className="shrink-0 text-amber-700" />
        </Link>

        <div className="mx-auto flex max-w-xl rounded-2xl border border-teal-300/40 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveTab('weekly')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${
              activeTab === 'weekly'
                ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow'
                : 'text-teal-700 hover:bg-teal-50'
            }`}
          >
            <Trophy size={16} />
            This week
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('monthly')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${
              activeTab === 'monthly'
                ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow'
                : 'text-teal-700 hover:bg-teal-50'
            }`}
          >
            <CalendarDays size={16} />
            This month
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lifetime')}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${
              activeTab === 'lifetime'
                ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow'
                : 'text-teal-700 hover:bg-teal-50'
            }`}
          >
            <Sparkles size={16} />
            Lifetime
          </button>
        </div>

        {profile?.uid && !loading ? (
          <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm">
            <p className="text-lg font-black text-teal-900">
              You are {myRankIndex >= 0 ? `#${myRankIndex + 1}` : 'not ranked yet'}{' '}
              {isLifetime ? 'overall' : isMonthly ? 'this month' : 'this week'}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {isLifetime ? (
                <div className="rounded-xl bg-white px-3 py-2 text-center ring-1 ring-violet-100">
                  <p className="text-xs font-bold uppercase text-violet-700">Total pts</p>
                  <p className="text-xl font-black text-slate-900">
                    {myRow?.points ?? profile?.points ?? 0}
                  </p>
                </div>
              ) : isMonthly ? (
                <div className="rounded-xl bg-white px-3 py-2 text-center ring-1 ring-violet-100">
                  <p className="text-xs font-bold uppercase text-violet-700">Monthly pts</p>
                  <p className="text-xl font-black text-slate-900">
                    {currentUserMonthlyPoints != null ? currentUserMonthlyPoints : '—'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-xl bg-white px-3 py-2 text-center ring-1 ring-violet-100">
                    <p className="text-xs font-bold uppercase text-violet-700">Active days</p>
                    <p className="text-xl font-black text-slate-900">
                      {myRow ? `${myRow.weeklyScore}/${myRow.maxWeeklyScore}` : '0/7'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2 text-center ring-1 ring-violet-100">
                    <p className="text-xs font-bold uppercase text-violet-700">Weekly stars</p>
                    <p className="text-xl font-black text-slate-900">{myRow ? `${myWeeklyStars}/3` : '—'}</p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2 text-center ring-1 ring-violet-100">
                    <p className="text-xs font-bold uppercase text-violet-700">Weekly pts</p>
                    <p className="text-xl font-black text-slate-900">
                      {currentUserWeeklyPoints != null ? currentUserWeeklyPoints : '—'}
                    </p>
                  </div>
                </>
              )}
              <div className="rounded-xl bg-white px-3 py-2 text-center ring-1 ring-violet-100">
                <p className="text-xs font-bold uppercase text-violet-700">Today</p>
                <p className="text-xl font-black text-slate-900">
                  {currentUserTodayPoints != null ? `${currentUserTodayPoints} pts` : '—'}
                </p>
              </div>
              <div className="rounded-xl bg-white px-3 py-2 text-center ring-1 ring-violet-100">
                <p className="text-xs font-bold uppercase text-violet-700">Last played</p>
                <p className="text-sm font-black text-slate-900">
                  {myRow?.lastPlayedDate ? formatPlayedDate(myRow.lastPlayedDate) : '—'}
                </p>
              </div>
              <div className="rounded-xl bg-white px-3 py-2 text-center ring-1 ring-violet-100">
                <Link href="/guide" className="text-sm font-bold text-violet-700 hover:underline">
                  How to win →
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {isLifetime ? (
          <div className="rounded-2xl border border-teal-600/30 bg-gradient-to-r from-teal-50 to-teal-50 p-5 text-center">
            <p className="text-base font-bold text-teal-800 md:text-lg">
              Lifetime rankings show the total points a learner has earned since joining.
            </p>
            <p className="mt-2 text-sm text-teal-800 md:text-base">
              These points are never reset — keep learning to climb the all-time board!
            </p>
          </div>
        ) : !isMonthly ? (
          <div className="rounded-2xl border border-teal-600/30 bg-gradient-to-r from-teal-50 to-teal-50 p-5 text-center">
            <p className="text-base font-bold text-teal-800 md:text-lg">
              Weekly winners are picked at random from everyone who qualifies — not by who is #1 on the board.
            </p>
            <p className="mt-2 text-sm text-teal-800 md:text-base">
              Earn above {WEEKLY_DRAW_MIN_POINTS} points and stay active (Sat–Fri) to enter the draw. Up to {MAX_WEEKLY_SCORE} active days and {POINTS_DAILY_CAP} points per day.
            </p>
            <p className="mt-2 text-sm font-semibold text-amber-800 md:text-base">
              Weekly certificates are a separate active-days award: the top three ranks earn Gold, Silver, or Bronze certificates with bonus points. Learners tied on active days share the same rank and award; the daily points cap still applies.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-teal-600/30 bg-gradient-to-r from-teal-50 to-teal-50 p-5 text-center">
            <p className="text-base font-bold text-teal-800 md:text-lg">
              Monthly rankings show total points earned this calendar month.
            </p>
            <p className="mt-2 text-sm text-teal-800 md:text-base">
              Keep learning every day — quiz, games, and good deeds all count!
            </p>
          </div>
        )}

        <div className="text-center">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://chat.whatsapp.com/BxmFkYb0b4CCMSQwLQdF4k"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#1e40af] bg-[#2563eb] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#1d4ed8]"
              aria-label="Join WhatsApp Group"
            >
              <MessageCircle size={18} />
              Join WhatsApp Group
            </a>
            <Link
              href="/donations/leaderboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-100"
            >
              <Coins size={18} />
              Sadaqah Leaderboard
            </Link>
          </div>
        </div>

        {!isMonthly && !isLifetime && drawStatus ? (
          <div
            className={`rounded-2xl border p-5 text-center ${
              drawStatus.qualified ? 'border-amber-200 bg-amber-50' : 'border-teal-200 bg-teal-50'
            }`}
          >
            <p className="text-base font-bold text-teal-900 md:text-lg">
              {drawStatus.qualified
                ? `You earned above ${WEEKLY_DRAW_MIN_POINTS} points this week. You are entered into the winners draw.`
                : `Earn ${drawStatus.remainingPoints} more point${drawStatus.remainingPoints === 1 ? '' : 's'} this week to enter the winners draw (need above ${WEEKLY_DRAW_MIN_POINTS}).`}
            </p>
          </div>
        ) : null}

        {loading && (
          <div className="rounded-2xl border border-teal-300/30 bg-white p-8 shadow-lg">
            <div className="mb-6 h-6 w-48 animate-pulse rounded bg-teal-100" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-teal-100" />
              ))}
            </div>
          </div>
        )}

        {!loading && leaderboardData.length === 0 && (
          <div className="rounded-2xl border border-teal-300/30 bg-white p-8 text-center shadow-lg">
            <Trophy size={48} className="mx-auto mb-4 text-teal-300" />
            <p className="font-semibold text-teal-900">No entries yet</p>
            <p className="text-sand-700">Start earning points to appear on the leaderboard!</p>
          </div>
        )}

        {!loading && leaderboardData.length > 0 ? (
          <div className="rounded-2xl border border-teal-300/30 bg-white p-5 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-violet-700">Top leaderboard</p>
                <p className="text-lg font-black text-teal-900">
                  {leaderboardData[0].username} is leading {isLifetime ? 'overall' : isMonthly ? 'this month' : 'this week'}
                </p>
              </div>
              <div className="rounded-xl bg-teal-50 px-4 py-3 text-right ring-1 ring-violet-100">
                <p className="text-xs font-bold uppercase text-violet-700">Last played</p>
                <p className="text-sm font-black text-slate-900">
                  {formatPlayedDate(leaderboardData[0].lastPlayedDate) || '—'}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {!loading && leaderboardData.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-teal-300/30 bg-white shadow-lg">
            <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-6 text-white">
              <h2 className="text-xl font-bold">
                {isLifetime ? 'Lifetime Rankings' : isMonthly ? 'Monthly Rankings' : 'Weekly Rankings'}
              </h2>
              <p className="text-sm text-white/80">
                {isLifetime
                  ? 'Sorted by total points earned overall'
                  : isMonthly
                    ? 'Sorted by total points earned this month'
                    : `Sorted by activity. Draw entry needs above ${WEEKLY_DRAW_MIN_POINTS} points — winners are random, not by rank.`}
              </p>
            </div>

            <div
              className={`hidden gap-3 border-b border-teal-300/20 bg-teal-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-teal-700 sm:grid ${
                isMonthly || isLifetime
                  ? 'grid-cols-[2rem_2.5rem_1fr_5rem_5.5rem_5rem]'
                  : 'grid-cols-[2rem_2.5rem_1fr_4rem_4rem_4rem_4rem_5.5rem_5rem]'
              }`}
            >
              <span>#</span>
              <span />
              <span>Learner</span>
              {!isMonthly && !isLifetime ? (
                <>
                  <span className="text-right">Days</span>
                  <span className="text-right">Stars</span>
                  <span className="text-right">Week pts</span>
                  <span className="text-right">Today</span>
                </>
              ) : (
                <span className="text-right">{isLifetime ? 'Total pts' : 'Month pts'}</span>
              )}
              <span className="text-right">Last played</span>
              <span className="text-right">Certificates</span>
            </div>

            <div className="divide-y divide-[#c4b5fd]/20">
              {leaderboardData.map((entry) => {
                const you = isYou(entry.uid);
                return (
                  <div
                    key={entry.uid}
                    className={`p-4 transition hover:bg-teal-100/50 ${you ? 'bg-violet-50/80 ring-1 ring-inset ring-violet-200' : ''}`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="w-8 shrink-0 text-center">{getRankIcon(entry.rank)}</div>
                      <div className="relative shrink-0">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] text-xl">
                          🌍
                        </div>
                        {entry.isOnline ? (
                          <div
                            className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500"
                            aria-label="Online now"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="inline-flex flex-wrap items-center gap-2 font-bold text-teal-900">
                          <span className="break-words">{entry.username}</span>
                          {you ? (
                            <span className="rounded-full bg-violet-200 px-2 py-0.5 text-[10px] font-bold text-violet-800">
                              You
                            </span>
                          ) : null}
                          {entry.isOnline ? (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                              online
                            </span>
                          ) : null}
                          {entry.winnerTick ? <span className="text-emerald-600">✓</span> : null}
                          {!isMonthly && !isLifetime && entry.weeklyChallengeDone ? (
                            <span className="text-amber-500">⭐</span>
                          ) : null}
                        </p>
                        <p className="text-sm text-sand-700">{getKidLevelTitle(entry.level)}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-sand-600">
                            {entry.certificateCount > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-700">
                                {entry.latestCertificateTier === 'gold' ? '🥇' : entry.latestCertificateTier === 'silver' ? '🥈' : entry.latestCertificateTier === 'bronze' ? '🥉' : '🏅'}
                                {entry.certificateCount} cert{entry.certificateCount === 1 ? '' : 's'}
                              </span>
                            ) : null}
                            {entry.age != null ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 font-semibold text-violet-700">
                                Age {entry.age}
                              </span>
                            ) : null}
                            {entry.madrasahName ? (
                              <span className="inline-flex items-center gap-1">
                                <span aria-hidden>🕌</span>
                                <span className="break-words">{entry.madrasahName}</span>
                              </span>
                            ) : null}
                            {entry.city ? (
                              <span className="inline-flex items-center gap-1">
                                <span aria-hidden>📍</span>
                                <span className="break-words">{entry.city}</span>
                              </span>
                            ) : null}
                          </p>
                        {formatPlayedDate(entry.lastPlayedDate) ? (
                          <p className="mt-0.5 text-xs text-sand-600 sm:hidden">
                            Last played: {formatPlayedDate(entry.lastPlayedDate)}
                          </p>
                        ) : null}
                      </div>

                      {isLifetime ? (
                        <div className="hidden w-20 shrink-0 text-right sm:block">
                          <p className="text-lg font-black text-teal-600">{entry.points}</p>
                        </div>
                      ) : !isMonthly ? (
                        <>
                          <div className="hidden w-16 shrink-0 text-right sm:block">
                            <p className="font-bold text-teal-600">
                              {entry.weeklyScore}/{entry.maxWeeklyScore}
                            </p>
                          </div>
                          <div className="hidden w-16 shrink-0 text-right sm:block">
                            <p className="font-bold text-amber-600">
                              {'⭐'.repeat(entry.weeklyStars || 0) || '—'}
                            </p>
                          </div>
                          <div className="hidden w-16 shrink-0 text-right sm:block">
                            <p className="font-bold text-[#f59e0b]">{entry.weeklyPoints}</p>
                          </div>
                          <div className="hidden w-16 shrink-0 text-right sm:block">
                            <p className="font-bold text-teal-600">
                              {entry.todayPoints}/{POINTS_DAILY_CAP}
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="hidden w-20 shrink-0 text-right sm:block">
                          <p className="text-lg font-black text-teal-600">{entry.monthlyPoints}</p>
                        </div>
                      )}
                      <div className="hidden w-[5.5rem] shrink-0 text-right sm:block">
                        <p className="text-xs font-semibold text-sand-700">
                          {formatPlayedDate(entry.lastPlayedDate) || '—'}
                        </p>
                      </div>
                      <div className="hidden w-20 shrink-0 text-right sm:block">
                        {entry.certificateCount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">
                            {entry.latestCertificateTier === 'gold' ? '🥇' : entry.latestCertificateTier === 'silver' ? '🥈' : entry.latestCertificateTier === 'bronze' ? '🥉' : '🏅'}
                            {entry.certificateCount}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </div>
                    </div>

                    <div className={`mt-3 grid gap-2 sm:hidden ${isMonthly || isLifetime ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {isLifetime ? (
                        <div className="rounded-xl border border-violet-200 bg-violet-50 px-2 py-2.5 text-center">
                          <p className="text-lg font-bold text-teal-600">{entry.points}</p>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-700">
                            Total pts
                          </p>
                        </div>
                      ) : isMonthly ? (
                        <div className="rounded-xl border border-violet-200 bg-violet-50 px-2 py-2.5 text-center">
                          <p className="text-lg font-bold text-teal-600">{entry.monthlyPoints}</p>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-700">
                            Month pts
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="rounded-xl border border-teal-300/30 bg-teal-50 px-2 py-2.5 text-center">
                            <p className="text-base font-bold leading-tight tabular-nums text-teal-600">
                              {entry.weeklyScore}/{entry.maxWeeklyScore}
                            </p>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-700">Days</p>
                          </div>
                          <div className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-2.5 text-center">
                            <p className="text-base font-bold leading-tight text-amber-600">
                              {'⭐'.repeat(entry.weeklyStars || 0) || '—'}
                            </p>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Stars</p>
                          </div>
                          <div className="rounded-xl border border-[#fbbf24]/30 bg-[#fffbeb] px-2 py-2.5 text-center">
                            <p className="text-base font-bold leading-tight tabular-nums text-[#f59e0b]">{entry.weeklyPoints}</p>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-sand-700">Week</p>
                          </div>
                          <div className="rounded-xl border border-violet-200 bg-violet-50 px-2 py-2.5 text-center">
                            <p className="text-base font-bold leading-tight tabular-nums text-teal-700">
                              {entry.todayPoints}/{POINTS_DAILY_CAP}
                            </p>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-teal-700">Today</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-gradient-to-r from-teal-600 to-teal-700 p-6 text-white">
          <h3 className="mb-4 flex items-center gap-2 text-xl font-bold">
            <Star size={20} /> Your stats
          </h3>
          <div className={`grid gap-3 ${isMonthly || isLifetime ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-5'}`}>
            <div className="rounded-xl bg-white/10 p-4 text-center">
              <p className="mb-1 text-sm text-white/80">Rank</p>
              <p className="text-3xl font-bold">{myRankIndex >= 0 ? `#${myRankIndex + 1}` : '—'}</p>
            </div>
            {isLifetime ? (
              <div className="rounded-xl bg-white/10 p-4 text-center">
                <p className="mb-1 text-sm text-white/80">Total points</p>
                <p className="text-3xl font-bold">
                  {myRow?.points ?? profile?.points ?? 0}
                </p>
              </div>
            ) : isMonthly ? (
              <div className="rounded-xl bg-white/10 p-4 text-center">
                <p className="mb-1 text-sm text-white/80">Monthly points</p>
                <p className="text-3xl font-bold">
                  {currentUserMonthlyPoints != null ? currentUserMonthlyPoints : '—'}
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-xl bg-white/10 p-4 text-center">
                  <p className="mb-1 text-sm text-white/80">Days active</p>
                  <p className="text-3xl font-bold">
                    {myRow ? `${myRow.weeklyScore}/${myRow.maxWeeklyScore}` : '—'}
                  </p>
                </div>
                <div className="rounded-xl bg-white/10 p-4 text-center">
                  <p className="mb-1 text-sm text-white/80">Weekly stars</p>
                  <p className="text-3xl font-bold">
                    {myRow ? `${myRow.weeklyStars}/3` : '—'}
                  </p>
                </div>
                <div className="rounded-xl bg-white/10 p-4 text-center">
                  <p className="mb-1 text-sm text-white/80">Activities</p>
                  <p className="text-3xl font-bold">{myRow?.activityCount ?? '—'}</p>
                </div>
                <div className="rounded-xl bg-white/10 p-4 text-center">
                  <p className="mb-1 text-sm text-white/80">Weekly points</p>
                  <p className="text-3xl font-bold">
                    {currentUserWeeklyPoints != null ? currentUserWeeklyPoints : '—'}
                  </p>
                </div>
              </>
            )}
            <div className="rounded-xl bg-white/10 p-4 text-center">
              <p className="mb-1 text-sm text-white/80">Today</p>
              <p className="text-3xl font-bold">
                {currentUserTodayPoints != null ? `${currentUserTodayPoints}/${POINTS_DAILY_CAP}` : '—'}
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-4 text-center col-span-2 sm:col-span-1">
              <p className="mb-1 text-sm text-white/80">Last played</p>
              <p className="text-lg font-bold">
                {myRow?.lastPlayedDate ? formatPlayedDate(myRow.lastPlayedDate) : '—'}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-teal-600/20 bg-teal-50 p-6">
          <h4 className="mb-3 flex items-center gap-2 font-bold text-teal-700">
            <Sparkles size={18} /> Tips to climb the leaderboard
          </h4>
          <ul className="space-y-2 text-sm text-teal-800">
            <li className="flex items-start gap-2">
              <span className="text-teal-600">✓</span> Complete the daily quiz every day
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-600">✓</span> Play games to earn bonus points
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-600">✓</span> Log your Durood and Zikr regularly
            </li>
            {isLifetime ? (
              <li className="flex items-start gap-2">
                <span className="text-teal-600">✓</span> Lifetime points never reset — every activity helps you climb the all-time board
              </li>
            ) : !isMonthly ? (
              <>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600">✓</span> Rank shows activity — winners are chosen randomly from everyone who qualifies
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-600">✓</span> Earn above {WEEKLY_DRAW_MIN_POINTS} weekly points to enter the winners draw
                </li>
              </>
            ) : (
              <li className="flex items-start gap-2">
                <span className="text-teal-600">✓</span> Every point you earn this month counts toward your monthly rank
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
