'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpenText, CheckCircle2, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  readSurahReadingProgress,
  SURAH_READINGS,
  type SurahReadingProgress,
} from '@/lib/surah-readings';

export default function SurahReadingsPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [progress, setProgress] = useState<SurahReadingProgress>({});

  useEffect(() => {
    if (!user?.id) {
      setProgress({});
      return;
    }
    setProgress(readSurahReadingProgress(user.id));
  }, [user?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SURAH_READINGS;
    return SURAH_READINGS.filter(
      (reading) =>
        reading.englishName.toLowerCase().includes(q) ||
        reading.arabicName.includes(query.trim()) ||
        String(reading.number).includes(q) ||
        reading.theme.toLowerCase().includes(q)
    );
  }, [query]);

  const completedCount = Object.values(progress).filter((row) => row.completed).length;

  return (
    <div className="page-inner quran-learn-mobile pb-28">
      <div className="mx-auto max-w-5xl">
        <div className="page-header mb-6 sm:mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-800 sm:px-4 sm:text-sm">
            <BookOpenText size={16} /> Read Surah with translation
          </div>
          <h1>📖 Learn Surah</h1>
          <p className="text-sm sm:text-base">
            Read the whole surah with its English translation, then unlock the quiz and earn points.
            Yaseen, Al-Mulk, Al-Kahf, Ar-Rahman and more.
          </p>
        </div>

        {user?.id ? (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p className="font-bold">
              Your progress: {completedCount}/{SURAH_READINGS.length} surahs completed
            </p>
            <p className="mt-1 text-emerald-800/90">
              Read to the end to unlock the quiz, then score 80% or higher to complete a surah.
            </p>
          </div>
        ) : (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-bold">Read for free — sign in to save progress and earn points.</p>
            <Link
              href="/signin?next=/quran/learn-surah"
              className="mt-2 inline-flex font-bold text-emerald-700 underline"
            >
              Sign in →
            </Link>
          </div>
        )}

        <div className="mb-5 sm:mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sand-400" size={18} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search surah name or number…"
              className="min-h-11 w-full rounded-xl border border-sand-200 py-3 pl-10 pr-4 text-base outline-none ring-violet-200 focus:ring-2 sm:text-sm"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {filtered.map((reading) => {
            const row = progress[reading.slug];
            return (
              <Link
                key={reading.slug}
                href={`/quran/learn-surah/${reading.slug}`}
                className="surface-card group block min-h-11 rounded-2xl p-4 transition active:scale-[0.99] sm:p-5 sm:hover:ring-2 sm:hover:ring-violet-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{reading.emoji}</span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-violet-600">
                        Surah {reading.number} · {reading.revelation}
                      </p>
                      <h2 className="mt-1 text-lg font-black text-sand-900 sm:text-xl">
                        {reading.englishName}{' '}
                        <span className="font-arabic text-base text-violet-800">
                          {reading.arabicName}
                        </span>
                      </h2>
                      <p className="mt-2 line-clamp-2 text-sm text-sand-600">{reading.summary}</p>
                    </div>
                  </div>
                  {row?.completed ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
                      <CheckCircle2 size={14} /> Done
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-sand-500">
                  <span>
                    {reading.ayahCount} ayahs · {reading.quizQuestions.length} quiz questions
                  </span>
                  <span className="font-bold text-violet-700 group-hover:underline">Read surah →</span>
                </div>
              </Link>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p className="rounded-2xl border border-dashed border-sand-200 bg-sand-50 px-4 py-10 text-center text-sm text-sand-500">
            No surahs match your search. Try another name or number.
          </p>
        )}

        <div className="feature-tile mt-8 rounded-2xl border-violet-200 bg-violet-50/60 p-4 sm:p-6">
          <h3 className="font-heading text-lg font-bold text-violet-900">How it works</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-violet-900/90">
            <li>Pick a surah and read it ayah by ayah — Arabic with the English translation.</li>
            <li>Read all the way to the <strong>end of the surah</strong> to unlock the quiz.</li>
            <li>Answer {SURAH_READINGS[0]?.quizQuestions.length ?? 5} questions about the surah.</li>
            <li>Score 80%+ to complete the surah and <strong>earn points</strong>.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
