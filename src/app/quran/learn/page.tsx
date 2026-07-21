'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { BookMarked, ChevronRight, Search } from 'lucide-react';
import { JUZ_AMMA_LABEL, JUZ_AMMA_RANGE, JUZ_AMMA_SURAH_LIST } from '@/data/juz-amma';

export default function JuzAmmaLearnPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'short' | 'medium' | 'long'>('all');

  const filtered = useMemo(() => {
    return JUZ_AMMA_SURAH_LIST.filter((s) => {
      const q = query.trim().toLowerCase();
      const matchesQuery =
        !q ||
        s.englishName.toLowerCase().includes(q) ||
        s.arabicName.includes(query.trim()) ||
        String(s.number).includes(q);
      const matchesSize =
        filter === 'all' ||
        (filter === 'short' && s.ayahCount <= 10) ||
        (filter === 'medium' && s.ayahCount > 10 && s.ayahCount <= 25) ||
        (filter === 'long' && s.ayahCount > 25);
      return matchesQuery && matchesSize;
    });
  }, [query, filter]);

  return (
    <div className="page-inner quran-learn-mobile">
      <div className="mx-auto max-w-5xl">
        <div className="page-header mb-6 sm:mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-800 sm:px-4 sm:text-sm">
            <BookMarked size={16} /> {JUZ_AMMA_LABEL}
          </div>
          <h1>📖 Learn Juz Amma</h1>
          <p className="text-sm sm:text-base">
            {JUZ_AMMA_RANGE} — Tajweed colours, translations, meanings, and reciter audio.
          </p>
        </div>

        <div className="mb-5 space-y-3 sm:mb-6">
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
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
            {(['all', 'short', 'medium', 'long'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-bold capitalize transition min-h-11 ${
                  filter === key
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'bg-white text-sand-700 ring-1 ring-sand-200 active:bg-violet-50'
                }`}
              >
                {key === 'all' ? 'All' : key === 'short' ? 'Short (≤10)' : key === 'medium' ? 'Medium' : 'Long'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((surah) => (
            <Link
              key={surah.number}
              href={`/quran/learn/${surah.number}`}
              className="surface-card group flex min-h-11 items-start justify-between gap-3 rounded-2xl p-4 transition active:scale-[0.99] sm:p-5 sm:hover:ring-2 sm:hover:ring-violet-200"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wide text-violet-600 sm:text-xs">
                  Surah {surah.number} · {surah.revelation} · {surah.ayahCount} ayahs
                </p>
                <p className="font-arabic mt-1 text-xl text-violet-800 sm:text-2xl">{surah.arabicName}</p>
                <p className="font-heading mt-1 text-base font-bold text-sand-900 sm:text-lg">{surah.englishName}</p>
                <p className="mt-2 line-clamp-2 text-xs text-sand-600 sm:text-sm">{surah.mainLesson}</p>
              </div>
              <ChevronRight
                size={20}
                className="mt-2 shrink-0 text-sand-400 transition group-active:translate-x-0.5 sm:group-hover:translate-x-0.5 sm:group-hover:text-violet-600"
              />
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="py-12 text-center text-sand-500">No surahs match your search.</p>
        )}

        <div className="feature-tile mt-6 rounded-2xl border-violet-200 bg-violet-50/60 p-4 sm:mt-8 sm:p-6">
          <h2 className="font-heading text-base font-bold text-violet-900 sm:text-lg">💡 Learning tip</h2>
          <p className="mt-2 text-sm leading-relaxed text-violet-900/90">
            Start with short surahs like Al-Asr (103), Al-Ikhlas (112), and An-Nas (114). Read the{' '}
            <strong>full meaning</strong> first, then tap each ayah to listen and learn Tajweed colours!
          </p>
          <Link href="/hifz" className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-violet-700 active:underline">
            Track memorization in Hifz Tracker →
          </Link>
        </div>
      </div>
    </div>
  );
}
