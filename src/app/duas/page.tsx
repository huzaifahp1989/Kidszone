'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Heart, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  ALLAH_99_NAMES,
  DUA_CATEGORIES,
  readDuaProgress,
  type DuaProgress,
} from '@/data/dua-library';

type HubCard = {
  slug: string;
  href: string;
  emoji: string;
  title: string;
  description: string;
  meta: string;
};

const NAMES_CARD: HubCard = {
  slug: '99-names',
  href: '/duas/names',
  emoji: '☪️',
  title: '99 Names of Allah',
  description: 'Learn every beautiful name with its Arabic, transliteration and English meaning.',
  meta: `${ALLAH_99_NAMES.length} names · quiz`,
};

const HUB_CARDS: HubCard[] = [
  NAMES_CARD,
  ...DUA_CATEGORIES.map((category) => ({
    slug: category.slug,
    href: `/duas/${category.slug}`,
    emoji: category.emoji,
    title: category.title,
    description: category.description,
    meta: `${category.duas.length} duas · ${category.source}`,
  })),
];

export default function DuaLibraryPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [progress, setProgress] = useState<DuaProgress>({});

  useEffect(() => {
    if (!user?.id) {
      setProgress({});
      return;
    }
    setProgress(readDuaProgress(user.id));
  }, [user?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return HUB_CARDS;
    return HUB_CARDS.filter(
      (card) => card.title.toLowerCase().includes(q) || card.description.toLowerCase().includes(q)
    );
  }, [query]);

  const completedCount = HUB_CARDS.filter((card) => progress[card.slug]?.completed).length;

  return (
    <div className="page-inner quran-learn-mobile pb-28">
      <div className="mx-auto max-w-5xl">
        <div className="page-header mb-6 sm:mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1.5 text-xs font-bold text-teal-800 sm:px-4 sm:text-sm">
            <Heart size={16} /> Duas &amp; Names
          </div>
          <h1>🤲 Duas &amp; Names of Allah</h1>
          <p className="text-sm sm:text-base">
            Learn the 99 Names of Allah and beautiful duas from the Quran and Hadith — with Arabic,
            transliteration and English translation. Take a quiz after each one to earn points.
          </p>
        </div>

        {user?.id ? (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p className="font-bold">
              Your progress: {completedCount}/{HUB_CARDS.length} topics completed
            </p>
            <p className="mt-1 text-emerald-800/90">
              Score 80% or higher on a quiz to complete a topic and earn points.
            </p>
          </div>
        ) : (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-bold">Learn for free — sign in to save progress and earn points.</p>
            <Link href="/signin?next=/duas" className="mt-2 inline-flex font-bold text-teal-700 underline">
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
              placeholder="Search duas or names…"
              className="min-h-11 w-full rounded-xl border border-sand-200 py-3 pl-10 pr-4 text-base outline-none ring-teal-200 focus:ring-2 sm:text-sm"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {filtered.map((card) => {
            const row = progress[card.slug];
            return (
              <Link
                key={card.slug}
                href={card.href}
                className="surface-card group block min-h-11 rounded-2xl p-4 transition active:scale-[0.99] sm:p-5 sm:hover:ring-2 sm:hover:ring-teal-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{card.emoji}</span>
                    <div>
                      <h2 className="text-lg font-black text-sand-900 sm:text-xl">{card.title}</h2>
                      <p className="mt-1 line-clamp-2 text-sm text-sand-600">{card.description}</p>
                    </div>
                  </div>
                  {row?.completed ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
                      <CheckCircle2 size={14} /> Done
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-sand-500">
                  <span>{card.meta}</span>
                  <span className="font-bold text-teal-700 group-hover:underline">Learn →</span>
                </div>
              </Link>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p className="rounded-2xl border border-dashed border-sand-200 bg-sand-50 px-4 py-10 text-center text-sm text-sand-500">
            Nothing matches your search. Try a different word.
          </p>
        )}

        <div className="feature-tile mt-8 rounded-2xl border-teal-200 bg-teal-50/60 p-4 sm:p-6">
          <h3 className="font-heading text-lg font-bold text-teal-900">How it works</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-teal-900/90">
            <li>Pick a topic — the 99 Names, or duas from the Quran, Hadith or daily life.</li>
            <li>Learn every dua or name with its Arabic, transliteration and English meaning.</li>
            <li>Answer 5 quick questions at the bottom of the page.</li>
            <li>Score 80%+ to complete the topic and <strong>earn points</strong>.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
