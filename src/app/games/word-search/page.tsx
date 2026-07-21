'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';

const themes = [
  {
    id: 'ramadan',
    title: 'Ramadan Word Hunt',
    description: 'Find words about fasting, taraweeh, and Eid',
    emoji: '🌙',
    color: 'from-violet-600 to-indigo-700',
  },
  {
    id: 'seerah',
    title: 'Seerah Word Hunt',
    description: 'Discover words from the life of the Prophet (SAW)',
    emoji: '📜',
    color: 'from-indigo-600 to-violet-700',
  },
  {
    id: 'quran',
    title: 'Quran Word Hunt',
    description: 'Learn Quranic terms like surah, ayah, and tajwid',
    emoji: '📖',
    color: 'from-purple-600 to-violet-700',
  },
];

export default function WordSearchHubPage() {
  return (
    <div className="page-inner mx-auto max-w-4xl space-y-8">
      <div className="page-header">
        <h1>🔍 Islamic Word Hunts</h1>
        <p>Find hidden words in the grid, then answer bonus questions to earn points!</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        {themes.map((t) => (
          <Link
            key={t.id}
            href={`/games/word-search/${t.id}`}
            className="feature-tile group block rounded-2xl p-6"
          >
            <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${t.color} text-3xl shadow-md transition group-hover:scale-105`}>
              {t.emoji}
            </div>
            <h2 className="font-heading text-xl font-bold text-sand-900">{t.title}</h2>
            <p className="mt-2 text-sm text-sand-600">{t.description}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-violet-700">
              <Search size={16} /> Play now →
            </span>
          </Link>
        ))}
      </div>

      <Link href="/games/salah-steps" className="inline-block text-sm font-semibold text-emerald-700 hover:underline mr-4">
        🕌 Salah Steps game →
      </Link>
      <Link href="/games" className="inline-block text-sm font-semibold text-violet-700 hover:underline">
        ← Back to all games
      </Link>
    </div>
  );
}
