'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Trophy, RefreshCw, Crown, Medal, Award, Sparkles, Star } from 'lucide-react';

type Entry = {
  uid: string;
  name: string;
  level: number;
  points: number;
  weeklyPoints?: number;
  monthlyPoints?: number;
  badges?: number;
};

export default function LeaderboardClient() {
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly'>('monthly');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [lastWinner, setLastWinner] = useState<Entry | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const fetchAbortRef = useRef<AbortController | null>(null);

  const cacheKey = useMemo(() => `leaderboard_${activeTab}`, [activeTab]);

  const readCache = useCallback(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.sessionStorage.getItem(cacheKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed?.entries)) return null;
      return { entries: parsed.entries as Entry[], lastWinner: (parsed.lastWinner ?? null) as Entry | null };
    } catch {
      return null;
    }
  }, [cacheKey]);

  const writeCache = useCallback((nextEntries: Entry[], nextWinner: Entry | null) => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), entries: nextEntries, lastWinner: nextWinner }));
    } catch {}
  }, [cacheKey]);

  const loadLeaderboard = useCallback(async (opts?: { soft?: boolean }) => {
    if (!opts?.soft) setLoading(true);
    try {
      fetchAbortRef.current?.abort();
      const controller = new AbortController();
      fetchAbortRef.current = controller;

      const res = await fetch(`/api/leaderboard/public?tab=${activeTab}`, { cache: 'no-store', signal: controller.signal });
      const json = await res.json();

      if (!res.ok || !Array.isArray(json.entries)) return;

      const list = json.entries as Entry[];
      setEntries(list);
      setLastWinner(json.lastWinner ?? null);
      writeCache(list, json.lastWinner ?? null);
    } catch (err) {
      const isAbort = (err as any)?.name === 'AbortError';
      if (!isAbort) console.error('Leaderboard load error:', err);
    } finally {
      if (!opts?.soft) setLoading(false);
    }
  }, [activeTab, writeCache]);

  useEffect(() => {
    const cached = readCache();
    if (cached?.entries?.length) {
      setEntries(cached.entries);
      setLastWinner(cached.lastWinner ?? null);
      setLoading(false);
      loadLeaderboard({ soft: true });
    } else {
      loadLeaderboard();
    }
  }, [loadLeaderboard, readCache]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadLeaderboard({ soft: true });
    setRefreshing(false);
  };

  const leaderboardData = useMemo(() => {
    const field = activeTab === 'weekly' ? 'weeklyPoints' : 'monthlyPoints';
    return [...entries]
      .sort((a, b) => (b[field] ?? 0) - (a[field] ?? 0))
      .map((e, idx) => ({
        rank: idx + 1,
        username: e.name,
        level: e.level,
        points: activeTab === 'weekly' ? (e.weeklyPoints ?? 0) : (e.monthlyPoints ?? 0),
        uid: e.uid,
        badges: e.badges ?? 0,
      }));
  }, [entries, activeTab]);

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
          <div className="grid grid-cols-3 gap-4">
            {leaderboardData.slice(0, 3).map(entry => (
              <div
                key={entry.rank}
                className={`${getRankStyle(entry.rank)} rounded-2xl p-6 text-center shadow-lg ${entry.rank === 1 ? 'scale-105' : ''}`}
              >
                <div className="flex justify-center mb-3">{getRankIcon(entry.rank)}</div>
                <p className="text-lg font-bold truncate">{entry.username}</p>
                <p className="text-2xl font-bold">⭐ {entry.points}</p>
                <p className="text-sm opacity-80">🏆 {entry.badges} badges</p>
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
                  className={`flex items-center gap-4 p-4 hover:bg-[#f9f0e6]/50 transition ${
                    entry.uid === profile?.uid ? 'bg-[#f0fdfa]/50' : ''
                  }`}
                >
                  <div className="w-10 text-center font-bold text-[#a1633a]">#{entry.rank}</div>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#fbbf24] to-[#f59e0b] flex items-center justify-center text-xl">
                    🌍
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-[#6a422d]">{entry.username}</p>
                    <p className="text-sm text-[#a1633a]">Level {entry.level}</p>
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
