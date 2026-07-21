'use client';

import React from 'react';
import Link from 'next/link';
import { BookMarked, ChevronRight } from 'lucide-react';
import { JUZ_AMMA_LABEL, JUZ_AMMA_RANGE } from '@/data/juz-amma';

export default function QuranPage() {
  return (
    <div className="page-inner quran-learn-mobile">
      <div className="mx-auto max-w-4xl">
        <div className="page-header">
          <h1>📖 Learn Quran</h1>
          <p className="text-sm sm:text-base">Discover the beauty of the Quran with easy meanings made for kids!</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          <Link
            href="/quran/learn"
            className="cta-panel group block min-h-11 bg-gradient-to-br from-violet-600 to-indigo-700 text-white active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-3 p-4 sm:gap-4 sm:p-6">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
                  <BookMarked size={14} /> Recommended
                </div>
                <h2 className="text-xl font-bold sm:text-2xl">Juz Amma — Last Juz</h2>
                <p className="mt-2 text-xs text-violet-100 sm:text-sm">
                  {JUZ_AMMA_RANGE} — {JUZ_AMMA_LABEL}. Full Arabic, English translation, meanings, and reciter audio.
                </p>
                <p className="mt-4 text-sm font-bold text-white/90 group-hover:underline">Start learning →</p>
              </div>
              <ChevronRight className="mt-2 shrink-0 opacity-80 transition group-hover:translate-x-1" size={28} />
            </div>
          </Link>

          <Link
            href="/quran/surahs"
            className="cta-panel group block min-h-11 bg-gradient-to-br from-emerald-600 to-teal-700 text-white active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-3 p-4 sm:gap-4 sm:p-6">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold">
                  <BookMarked size={14} /> New
                </div>
                <h2 className="text-xl font-bold sm:text-2xl">Learn a Surah</h2>
                <p className="mt-2 text-xs text-emerald-100 sm:text-sm">
                  Kid-friendly lessons + quizzes for Al-Hujurat, Al-Kahf, Yaseen, Al-Mulk, and more famous surahs.
                </p>
                <p className="mt-4 text-sm font-bold text-white/90 group-hover:underline">Browse surahs →</p>
              </div>
              <ChevronRight className="mt-2 shrink-0 opacity-80 transition group-hover:translate-x-1" size={28} />
            </div>
          </Link>

          <Link
            href="/hifz"
            className="surface-card group block min-h-11 rounded-2xl p-4 transition active:scale-[0.99] sm:col-span-2 sm:p-6 sm:hover:ring-2 sm:hover:ring-violet-200"
          >
            <h2 className="text-lg font-bold text-sand-900 sm:text-xl">Hifz Tracker</h2>
            <p className="mt-2 text-sm text-sand-600">
              Mark surahs you are learning or have memorized — many are from Juz Amma!
            </p>
            <p className="mt-4 text-sm font-bold text-violet-700 group-hover:underline">Open Hifz →</p>
          </Link>
        </div>

        <div className="feature-tile mt-6 rounded-2xl border-violet-200 bg-violet-50/60 p-4 sm:mt-8 sm:p-6">
          <h3 className="font-heading text-lg font-bold text-violet-900">How to learn</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-violet-900/90">
            <li>Pick a surah from <Link href="/quran/learn" className="font-bold underline">Juz Amma</Link> — start with short ones like Al-Ikhlas (112).</li>
            <li>Read the <strong>full meaning</strong> so you understand the whole surah.</li>
            <li>Go through each <strong>ayah</strong> — Arabic text and English meaning.</li>
            <li>Practice daily and track progress in <Link href="/hifz" className="font-bold underline">Hifz Tracker</Link>.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
