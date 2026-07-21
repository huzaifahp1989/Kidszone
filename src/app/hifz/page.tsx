'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookMarked, Star, Trophy } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { HIFZ_SURAH_LIST, type HifzSurah } from '@/data/hifz-surahs';

type HifzRow = {
  surah_number: number;
  status: 'learning' | 'memorized';
  ayahs_memorized: number;
  notes: string | null;
};

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || '';
}

export default function HifzPage() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<HifzRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [setupRequired, setSetupRequired] = useState(false);

  const progressMap = useMemo(() => {
    const m = new Map<number, HifzRow>();
    progress.forEach((p) => m.set(p.surah_number, p));
    return m;
  }, [progress]);

  const stats = useMemo(() => {
    const memorized = progress.filter((p) => p.status === 'memorized').length;
    const learning = progress.filter((p) => p.status === 'learning').length;
    return { memorized, learning, total: HIFZ_SURAH_LIST.length };
  }, [progress]);

  const filteredSurahs = useMemo(() => {
    if (filter === 'all') return HIFZ_SURAH_LIST;
    return HIFZ_SURAH_LIST.filter((s) => s.difficulty === filter);
  }, [filter]);

  const loadProgress = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/hifz/progress', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.setupRequired) setSetupRequired(true);
      setProgress(json.progress || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const updateSurah = async (surah: HifzSurah, status: 'learning' | 'memorized' | 'clear') => {
    if (!user) return;
    setSaving(surah.number);
    try {
      const token = await getToken();
      if (status === 'clear') {
        setProgress((prev) => prev.filter((p) => p.surah_number !== surah.number));
        setSaving(null);
        return;
      }
      const ayahs = status === 'memorized' ? surah.ayahCount : Math.min(surah.ayahCount, 1);
      const res = await fetch('/api/hifz/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          surahNumber: surah.number,
          status,
          ayahsMemorized: ayahs,
        }),
      });
      const json = await res.json();
      if (json.progress) {
        setProgress((prev) => {
          const next = prev.filter((p) => p.surah_number !== surah.number);
          return [...next, json.progress];
        });
      }
      if (json.setupRequired) setSetupRequired(true);
    } catch {
      /* ignore */
    } finally {
      setSaving(null);
    }
  };

  if (!user) {
    return (
      <div className="page-inner text-center">
        <p className="text-sand-700">Please <Link href="/signin" className="font-bold text-violet-700">sign in</Link> to track your Hifz progress.</p>
      </div>
    );
  }

  return (
    <div className="page-inner mx-auto max-w-4xl space-y-8">
      <div className="hero-panel p-6 sm:p-8">
        <div className="badge-chip mb-3">Memorization</div>
        <h1 className="font-heading text-3xl font-bold text-sand-900 sm:text-4xl">Hifz Tracker</h1>
        <p className="mt-2 max-w-2xl text-sand-700">
          Track surahs you are learning and memorized. Start with short surahs from Juz Amma!
        </p>
        <div className="mt-6 grid grid-cols-3 gap-4 max-w-md">
          <div className="stat-pill p-4 text-center">
            <Trophy className="mx-auto mb-1 text-violet-600" size={22} />
            <p className="text-2xl font-bold text-sand-900">{stats.memorized}</p>
            <p className="text-xs text-sand-600">Memorized</p>
          </div>
          <div className="stat-pill p-4 text-center">
            <BookMarked className="mx-auto mb-1 text-amber-600" size={22} />
            <p className="text-2xl font-bold text-sand-900">{stats.learning}</p>
            <p className="text-xs text-sand-600">Learning</p>
          </div>
          <div className="stat-pill p-4 text-center">
            <Star className="mx-auto mb-1 text-gold-500" size={22} />
            <p className="text-2xl font-bold text-sand-900">{stats.total}</p>
            <p className="text-xs text-sand-600">Available</p>
          </div>
        </div>
      </div>

      {setupRequired && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Database setup needed: run the migration <code className="text-xs">20260611_hifz_and_push.sql</code> in Supabase.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${
              filter === f ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-800'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-center text-sand-600">Loading your progress…</p>
      ) : (
        <div className="space-y-3">
          {filteredSurahs.map((surah) => {
            const row = progressMap.get(surah.number);
            const isMem = row?.status === 'memorized';
            const isLearning = row?.status === 'learning';
            return (
              <div key={surah.number} className="surface-card flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-arabic text-xl text-violet-800">{surah.arabicName}</p>
                  <p className="font-bold text-sand-900">
                    {surah.number}. {surah.englishName}
                    <span className="ml-2 text-xs font-normal text-sand-500">({surah.ayahCount} ayahs)</span>
                  </p>
                  <span className="mt-1 inline-block rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold capitalize text-violet-800">
                    {surah.difficulty}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!row && (
                    <>
                      <button
                        type="button"
                        disabled={saving === surah.number}
                        onClick={() => updateSurah(surah, 'learning')}
                        className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-bold text-amber-900 hover:bg-amber-200"
                      >
                        Start learning
                      </button>
                      <button
                        type="button"
                        disabled={saving === surah.number}
                        onClick={() => updateSurah(surah, 'memorized')}
                        className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700"
                      >
                        Mark memorized
                      </button>
                    </>
                  )}
                  {isLearning && (
                    <>
                      <span className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-bold text-amber-900">Learning…</span>
                      <button
                        type="button"
                        disabled={saving === surah.number}
                        onClick={() => updateSurah(surah, 'memorized')}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
                      >
                        ✓ Memorized!
                      </button>
                    </>
                  )}
                  {isMem && (
                    <span className="rounded-xl bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-800">✓ Memorized</span>
                  )}
                  <Link href="/quran/learn" className="rounded-xl border border-violet-200 px-4 py-2 text-sm font-bold text-violet-700 hover:bg-violet-50">
                    Read
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="feature-tile rounded-2xl p-5 text-sm text-violet-900">
        <strong>Tip:</strong> Practice a little every day. Pair this with the{' '}
        <Link href="/studio" className="font-bold underline">Recording Studio</Link> to record your recitation!
      </div>
    </div>
  );
}
