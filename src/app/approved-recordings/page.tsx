'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock3, Mic, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

type ApprovedCategory = 'quran' | 'nasheed' | 'story' | 'hadith';

type ApprovedRecordingRow = {
  id: string;
  user_id: string | null;
  story_id: string | null;
  category?: 'quran' | 'nasheed' | 'story' | 'hadith' | null;
  title?: string;
  status: 'approved';
  reviewed_at?: string | null;
  submitted_at?: string | null;
  created_at?: string | null;
  duration?: number | null;
  duration_seconds?: number | null;
  points_awarded?: number | null;
  story?: { title?: string } | null;
};

type CategoryMeta = {
  label: string;
  emoji: string;
  emptyText: string;
  recordHref: string;
};

const CATEGORY_ORDER: ApprovedCategory[] = ['quran', 'nasheed', 'story', 'hadith'];

const CATEGORY_META: Record<ApprovedCategory, CategoryMeta> = {
  quran: {
    label: "Qur'an",
    emoji: '📖',
    emptyText: "No approved Qur'an recordings yet.",
    recordHref: '/quran/learn',
  },
  nasheed: {
    label: 'Nasheeds',
    emoji: '🎵',
    emptyText: 'No approved Nasheed recordings yet.',
    recordHref: '/studio',
  },
  story: {
    label: 'Stories',
    emoji: '📚',
    emptyText: 'No approved Story recordings yet.',
    recordHref: '/stories',
  },
  hadith: {
    label: 'Hadith',
    emoji: '📜',
    emptyText: 'No approved Hadith recordings yet.',
    recordHref: '/hadith',
  },
};

function inferCategory(rec: ApprovedRecordingRow): ApprovedCategory | null {
  if (rec.category === 'quran' || rec.category === 'nasheed' || rec.category === 'story' || rec.category === 'hadith') {
    return rec.category;
  }
  if (rec.story_id) return 'story';

  const title = String(rec.title || '').toLowerCase();
  if (title.includes('hadith')) return 'hadith';
  if (title.includes('surah') || title.includes('quran') || title.includes('qur')) return 'quran';
  if (title.includes('nasheed')) return 'nasheed';

  return null;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'Unknown date';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Unknown date';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function ApprovedRecordingsPage() {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<ApprovedRecordingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchApproved = useCallback(async (isRefresh = false) => {
    if (!user?.id) {
      setRecordings([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) setRefreshing(true);

    try {
      const runQuery = async (orderColumn: 'reviewed_at' | 'submitted_at' | 'created_at') => {
        return await supabase
          .from('recordings')
          .select('id, user_id, story_id, category, title, status, reviewed_at, submitted_at, created_at, duration, duration_seconds, points_awarded, story:stories(title)')
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .order(orderColumn, { ascending: false });
      };

      let { data, error } = await runQuery('reviewed_at');
      if (error && error.message?.includes('reviewed_at')) {
        ({ data, error } = await runQuery('submitted_at'));
      }
      if (error && error.message?.includes('submitted_at')) {
        ({ data, error } = await runQuery('created_at'));
      }

      if (error) throw error;
      setRecordings((data || []) as ApprovedRecordingRow[]);
    } catch (error) {
      console.error('Error fetching approved recordings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchApproved();
  }, [fetchApproved]);

  const grouped = useMemo(() => {
    const base: Record<ApprovedCategory, ApprovedRecordingRow[]> = {
      quran: [],
      nasheed: [],
      story: [],
      hadith: [],
    };

    for (const rec of recordings) {
      const category = inferCategory(rec);
      if (!category) continue;
      base[category].push(rec);
    }

    return base;
  }, [recordings]);

  const totalApproved = recordings.length;

  if (!user) {
    return (
      <div className="min-h-screen bg-islamic-light flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-lg">
          <p className="mb-4 text-lg font-bold text-gray-800">Sign in to view approved recordings</p>
          <Link href="/signin" className="inline-block rounded-xl bg-islamic-primary px-6 py-2 font-bold text-white">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-islamic-light py-10 px-4">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Approved Recordings</h1>
            <p className="mt-1 text-sm text-gray-600">
              All approved voice submissions in one place, grouped by category.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-800">
              <CheckCircle2 size={14} /> {totalApproved} approved
            </span>
            <button
              type="button"
              onClick={() => fetchApproved(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Refresh
            </button>
            <Link
              href="/my-recordings"
              className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100"
            >
              View all statuses
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-islamic-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {CATEGORY_ORDER.map((category) => {
              const meta = CATEGORY_META[category];
              const items = grouped[category];

              return (
                <section key={category} className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-black text-gray-900">
                      <span className="mr-2" aria-hidden>{meta.emoji}</span>
                      {meta.label}
                    </h2>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
                      {items.length}
                    </span>
                  </div>

                  {items.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-600">
                      <p>{meta.emptyText}</p>
                      <Link href={meta.recordHref} className="mt-3 inline-flex items-center gap-2 font-bold text-indigo-700 underline">
                        <Mic size={14} /> Record now
                      </Link>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {items.map((rec) => {
                        const shownTitle = rec.story?.title || rec.title || `${meta.label} recording`;
                        const shownDate = rec.reviewed_at || rec.submitted_at || rec.created_at;
                        const seconds = rec.duration ?? rec.duration_seconds ?? 0;
                        const mm = Math.floor(seconds / 60);
                        const ss = Math.floor(seconds % 60).toString().padStart(2, '0');
                        const pts = Math.max(0, Number(rec.points_awarded || 0));

                        return (
                          <li key={rec.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-3">
                            <p className="font-bold text-gray-900">{shownTitle}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                              <span className="inline-flex items-center gap-1">
                                <Clock3 size={12} /> {mm}:{ss}
                              </span>
                              <span>Approved {formatDate(shownDate)}</span>
                              <span className="font-bold text-emerald-700">+{pts} pts</span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
