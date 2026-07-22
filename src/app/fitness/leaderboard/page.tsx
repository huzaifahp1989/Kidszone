'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { AUDIO_QUIZ_AGE_GROUPS } from '@/lib/audio-quiz';
import { ArrowLeft, Trophy, Footprints, Medal } from 'lucide-react';

interface Entry {
  rank: number;
  uid: string;
  name: string;
  ageGroup: string;
  city: string;
  steps: number;
  minutes: number;
  points: number;
  badges: number;
}

const PERIODS: { key: string; label: string }[] = [
  { key: 'daily', label: 'Today' },
  { key: 'weekly', label: 'This week' },
  { key: 'monthly', label: 'This month' },
  { key: 'all', label: 'All-time' },
];

export default function FitnessLeaderboardPage() {
  const { profile } = useAuth();
  const [period, setPeriod] = React.useState('daily');
  const [ageGroup, setAgeGroup] = React.useState('');
  const [city, setCity] = React.useState('');
  const [entries, setEntries] = React.useState<Entry[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    const qs = new URLSearchParams({ period });
    if (ageGroup) qs.set('ageGroup', ageGroup);
    if (city.trim()) qs.set('city', city.trim());
    (async () => {
      try {
        const res = await fetch(`/api/fitness/leaderboard?${qs.toString()}&t=${Date.now()}`, { cache: 'no-store' });
        const json = await res.json();
        if (active) setEntries(Array.isArray(json.entries) ? json.entries : []);
      } catch {
        if (active) setEntries([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [period, ageGroup, city]);

  const medal = (rank: number) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`);

  return (
    <div className="min-h-screen bg-[#f5f3ff] pattern-islamic">
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-8">
        <div className="text-center">
          <Link href="/fitness" className="mb-3 inline-flex items-center gap-1.5 text-sm font-bold text-[#6d28d9] hover:underline">
            <ArrowLeft size={15} /> Back to Fitness
          </Link>
          <h1 className="text-3xl font-black text-[#1e1b4b] md:text-4xl">🏆 Fitness Leaderboard</h1>
          <p className="mt-1 text-[#475569]">See who is walking the most steps!</p>
        </div>

        <div className="mx-auto flex max-w-md flex-wrap justify-center gap-1 rounded-2xl border border-[#c4b5fd]/40 bg-white p-1 shadow-sm">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-bold transition ${
                period === p.key ? 'bg-gradient-to-r from-[#16a34a] to-[#15803d] text-white shadow' : 'text-[#15803d] hover:bg-emerald-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold">
            <option value="">All ages</option>
            {AUDIO_QUIZ_AGE_GROUPS.filter((a) => a !== 'All ages').map((a) => (
              <option key={a} value={a}>Ages {a}</option>
            ))}
          </select>
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Filter by city…" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
        </div>

        {loading ? (
          <div className="space-y-3 rounded-2xl border border-[#c4b5fd]/30 bg-white p-6 shadow">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-[#ede9fe]" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border border-[#c4b5fd]/30 bg-white p-8 text-center shadow">
            <Footprints size={40} className="mx-auto mb-3 text-[#c4b5fd]" />
            <p className="font-bold text-[#1e1b4b]">No steps yet</p>
            <p className="text-[#475569]">Be the first to log your steps!</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#c4b5fd]/30 bg-white shadow-lg">
            <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] gap-2 border-b border-[#c4b5fd]/20 bg-[#f5f3ff] px-3 py-3 text-xs font-bold uppercase tracking-wide text-[#6d28d9] sm:px-4">
              <span>Rank</span>
              <span>Walker</span>
              <span className="justify-self-end text-right">Steps</span>
            </div>
            <div className="divide-y divide-[#c4b5fd]/20">
              {entries.map((e) => {
                const you = e.uid === profile?.uid;
                return (
                  <div key={e.uid} className={`grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-2 px-3 py-3 sm:px-4 ${you ? 'bg-emerald-50/80 ring-1 ring-inset ring-emerald-200' : ''}`}>
                    <span className="text-lg font-black text-[#475569]">{medal(e.rank)}</span>
                    <span className="flex min-w-0 items-center gap-2 font-bold text-[#1e1b4b]">
                      <span className="truncate">{e.name}</span>
                      {you ? <span className="shrink-0 rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">You</span> : null}
                      {e.badges > 0 ? <span className="shrink-0 inline-flex items-center gap-0.5 text-[11px] text-amber-600"><Medal size={12} />{e.badges}</span> : null}
                    </span>
                    <span className="shrink-0 justify-self-end whitespace-nowrap text-right font-black text-[#16a34a]">
                      {e.steps.toLocaleString()}
                      <span className="block text-[10px] font-bold text-[#94a3b8]">{e.points} pts</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
