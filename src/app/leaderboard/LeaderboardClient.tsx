'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Trophy, RefreshCw, Crown, Medal, Award, Sparkles, Star } from 'lucide-react';

type Entry = {
  uid: string;
  name: string;
  madrasahName?: string;
  level: number;
  points: number;
  weeklyPoints?: number;
  monthlyPoints?: number;
  badges?: number;
  lastPlayedDate?: string | null;
  winnerTick?: boolean;
  weeklyChallengeDone?: boolean;
};

export default function LeaderboardClient() {
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly'>('monthly');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [lastWinner, setLastWinner] = useState<Entry | null>(null);
  const [weeklyChallenge, setWeeklyChallenge] = useState<{ remaining: number; qualifiedForDraw: boolean } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const fetchAbortRef = useRef<AbortController | null>(null);

  const loadLeaderboard = useCallback(async (opts?: { soft?: boolean }) => {
    if (!opts?.soft) setLoading(true);
    try {
      fetchAbortRef.current?.abort();
      const controller = new AbortController();
      fetchAbortRef.current = controller;

      const res = await fetch(`/api/leaderboard/public?tab=${activeTab}&t=${Date.now()}`, { cache: 'no-store', signal: controller.signal });
      const json = await res.json();

      if (!res.ok || !Array.isArray(json.entries)) return;

      const list = json.entries as Entry[];
      setEntries(list);
      setLastWinner(json.lastWinner ?? null);
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
    let active = true;

    const loadWeeklyChallenge = async () => {
      const userId = String(profile?.uid || '').trim();
      if (!userId) {
        setWeeklyChallenge(null);
        return;
      }

      try {
        const res = await fetch(`/api/rewards/weekly-activities?userId=${userId}`, { cache: 'no-store' });
        const json = await res.json();
        if (!active || !res.ok) return;
        setWeeklyChallenge({
          remaining: Number(json.remaining || 0),
          qualifiedForDraw: Boolean(json.qualifiedForDraw),
        });
      } catch {
        if (active) setWeeklyChallenge(null);
      }
    };

    loadWeeklyChallenge();
    return () => {
      active = false;
    };
  }, [profile?.uid]);

  // Real-time subscription to refresh when points change
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLeaderboard({ soft: true });
    setRefreshing(false);
  };

  const leaderboardData = useMemo(() => {
    return entries.map((e, idx) => ({
      rank: idx + 1,
      username: e.name,
      madrasahName: e.madrasahName || '',
      level: e.level,
      points: activeTab === 'weekly' ? (e.weeklyPoints ?? 0) : (e.monthlyPoints ?? 0),
      uid: e.uid,
      badges: e.badges ?? 0,
      lastPlayedDate: e.lastPlayedDate ?? null,
      winnerTick: e.winnerTick ?? false,
      weeklyChallengeDone: e.weeklyChallengeDone ?? false,
    }));
  }, [entries, activeTab]);

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

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown size={24} className="text-[#fbbf24]" />;
    if (rank === 2) return <Medal size={24} className="text-gray-400" />;
    if (rank === 3) return <Award size={24} className="text-[#cd9456]" />;
    return <span className="text-[#a1633a] font-bold">#{rank}</span>;
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] text-white';
    if (rank === 2) return 'bg-gradient-to-br from-gray-300 to-gray-400 text-white';
    if (rank === 3) return 'bg-gradient-to-br from-[#cd9456] to-[#a1633a] text-white';
    return 'bg-white text-[#6a422d]';
  };

  return (
    <div className="min-h-screen bg-[#fdf8f3] pattern-islamic">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#fffbeb] rounded-full border border-[#fbbf24]/30">
            <Trophy size={16} className="text-[#f59e0b]" />
            <span className="text-sm font-semibold text-[#b45309]">Competition Leaderboard</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#6a422d]">Leaderboard</h1>
          <p className="text-[#a1633a] text-lg">See who is leading this week and month</p>
        </div>

        <div className="bg-gradient-to-r from-[#ecfeff] to-[#f0fdfa] border border-[#14b8a6]/30 rounded-2xl p-5 text-center">
          <p className="text-[#0f766e] font-bold text-base md:text-lg">
            New winner will be announced every Friday.
          </p>
          <p className="text-[#115e59] mt-2 text-sm md:text-base">
            Please continue taking part every day to win prizes.
          </p>
        </div>

        {/* Last Winner */}
        {lastWinner && (
          <div className="bg-gradient-to-r from-[#fbbf24]/20 via-[#fbbf24]/10 to-[#fbbf24]/20 rounded-2xl border-2 border-[#fbbf24]/30 p-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#fbbf24] text-[#92400e] rounded-full text-sm font-bold mb-3">
              <Crown size={14} /> Last Week's Champion
            </div>
            <h3 className="text-2xl font-bold text-[#6a422d] mb-1">{lastWinner.name}</h3>
            <p className="text-[#a1633a]">Won with {lastWinner.points} points & {lastWinner.badges} badges</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => setActiveTab('weekly')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'weekly'
                ? 'bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white shadow-lg'
                : 'bg-white text-[#6a422d] border border-[#e5c9a3]/30 hover:bg-[#f0fdfa]'
            }`}
          >
            📊 Weekly
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'monthly'
                ? 'bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white shadow-lg'
                : 'bg-white text-[#6a422d] border border-[#e5c9a3]/30 hover:bg-[#f0fdfa]'
            }`}
          >
            📅 Monthly
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-6 py-3 rounded-xl font-bold bg-white text-[#6a422d] border border-[#e5c9a3]/30 hover:bg-[#f9f0e6] transition-all disabled:opacity-50"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="text-center">
          <a
            href="https://chat.whatsapp.com/E7bJY8Hz5lEEDscBXKtsSM?mode=gi_t"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl border border-[#14b8a6]/30 bg-[#f0fdfa] px-4 py-3 text-sm font-bold text-[#0d9488] hover:bg-[#ccfbf1] transition"
          >
            Join kids zone group on whatsapp to stay updated
          </a>
        </div>

        {activeTab === 'weekly' && weeklyChallenge ? (
          <div className={`rounded-2xl border p-5 text-center ${weeklyChallenge.qualifiedForDraw ? 'border-amber-200 bg-amber-50' : 'border-teal-200 bg-teal-50'}`}>
            <p className="font-bold text-base md:text-lg text-[#6a422d]">
              {weeklyChallenge.qualifiedForDraw
                ? '⭐ You finished all 5 weekly activities. Your leaderboard name gets a star.'
                : `You have ${weeklyChallenge.remaining} activit${weeklyChallenge.remaining === 1 ? 'y' : 'ies'} left to get your leaderboard star and go into the winner draw.`}
            </p>
          </div>
        ) : null}

        {/* Loading */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-lg border border-[#e5c9a3]/30 p-8">
            <div className="h-6 w-48 bg-[#f9f0e6] rounded mb-6 animate-pulse" />
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-12 bg-[#f9f0e6] rounded animate-pulse" />)}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && leaderboardData.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-[#e5c9a3]/30 p-8 text-center">
            <Trophy size={48} className="mx-auto mb-4 text-[#e5c9a3]" />
            <p className="text-[#6a422d] font-semibold">No entries yet</p>
            <p className="text-[#a1633a]">Start earning points to appear on the leaderboard!</p>
          </div>
        )}

        {/* Top 3 Podium */}
        {!loading && leaderboardData.length > 0 && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {leaderboardData.slice(0, 3).map(entry => (
              <div
                key={entry.rank}
                className={`${getRankStyle(entry.rank)} rounded-2xl p-3 sm:p-6 text-center shadow-lg ${entry.rank === 1 ? 'scale-105' : ''}`}
              >
                <div className="flex justify-center mb-3">{getRankIcon(entry.rank)}</div>
                <p className="text-xs sm:text-sm md:text-base font-bold truncate inline-flex items-center justify-center gap-2 leading-tight">
                  <span className="truncate">{entry.username}</span>
                  {entry.winnerTick && <span aria-label="Winner" className="text-white/90">✓</span>}
                  {entry.weeklyChallengeDone && <span aria-label="Weekly challenge complete" className="text-white/90">⭐</span>}
                </p>
                <p className="text-xs opacity-90 truncate">{entry.madrasahName || ''}</p>
                {formatPlayedDate(entry.lastPlayedDate) && <p className="text-xs opacity-90 mt-1">Played: {formatPlayedDate(entry.lastPlayedDate)}</p>}
                <p className="text-lg sm:text-2xl font-bold">⭐ {entry.points}</p>
                <p className="text-xs sm:text-sm opacity-80">🏆 {entry.badges} badges</p>
              </div>
            ))}
          </div>
        )}

        {/* Full Leaderboard */}
        {!loading && leaderboardData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-[#e5c9a3]/30 overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white">
              <h2 className="text-xl font-bold">{activeTab === 'weekly' ? 'Weekly Rankings' : 'Monthly Rankings'}</h2>
              <p className="text-sm text-white/80">{activeTab === 'weekly' ? 'Resets every Monday' : 'Resets 1st of each month'}</p>
            </div>

            <div className="divide-y divide-[#e5c9a3]/20">
              {leaderboardData.map((entry) => (
                <div
                  key={entry.rank}
                  className={`flex items-center gap-4 p-4 transition hover:bg-[#f9f0e6]/50 ${
                    entry.uid === profile?.uid ? 'bg-[#f0fdfa]/50' : ''
                  }`}
                >
                  <div className="w-10 text-center font-bold text-[#a1633a]">#{entry.rank}</div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] flex items-center justify-center text-xl">
                    🌍
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-[#6a422d] inline-flex items-center gap-2">
                      <span>{entry.username}</span>
                      {entry.winnerTick && <span aria-label="Winner" className="text-emerald-600">✓</span>}
                      {entry.weeklyChallengeDone && <span aria-label="Weekly challenge complete" className="text-amber-500">⭐</span>}
                    </p>
                    {!entry.weeklyChallengeDone && activeTab === 'weekly' ? (
                      <p className="text-xs text-[#0f766e]">Finish 5 weekly activities to get a star</p>
                    ) : null}
                    <p className="text-xs text-[#a1633a]">Madrasah: {entry.madrasahName || ''}</p>
                    <p className="text-sm text-[#a1633a]">Level {entry.level}</p>
                    {formatPlayedDate(entry.lastPlayedDate) && <p className="text-xs text-[#a1633a]">Played: {formatPlayedDate(entry.lastPlayedDate)}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#f59e0b]">⭐ {entry.points}</p>
                    <p className="text-sm text-[#a1633a]">🏆 {entry.badges}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Your Ranking */}
        <div className="bg-gradient-to-r from-[#14b8a6] to-[#0d9488] rounded-2xl p-6 text-white">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Star size={20} /> Your Ranking
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <p className="text-sm text-white/80 mb-1">Your Rank</p>
              <p className="text-3xl font-bold">
                {profile?.uid ? (() => {
                  const idx = leaderboardData.findIndex(e => e.uid === profile.uid);
                  return idx >= 0 ? `#${idx + 1}` : '—';
                })() : '—'}
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 text-center">
              <p className="text-sm text-white/80 mb-1">Your Points</p>
              <p className="text-3xl font-bold">
                {profile?.uid ? (activeTab === 'weekly' ? (profile?.weeklyPoints ?? profile?.points ?? 0) : (profile?.monthlyPoints ?? profile?.points ?? 0)) : '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-[#f0fdfa] rounded-2xl p-6 border border-[#14b8a6]/20">
          <h4 className="font-bold text-[#0d9488] mb-3 flex items-center gap-2">
            <Sparkles size={18} /> Tips to Climb the Leaderboard
          </h4>
          <ul className="space-y-2 text-[#115e59] text-sm">
            <li className="flex items-start gap-2">
              <span className="text-[#14b8a6]">✓</span> Complete the daily quiz every day
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#14b8a6]">✓</span> Play games to earn bonus points
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#14b8a6]">✓</span> Log your Durood and Zikr regularly
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[#14b8a6]">✓</span> Maintain your daily streak for bonuses
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
