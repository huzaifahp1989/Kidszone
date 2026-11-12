'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search } from 'lucide-react';
import { DuaQuiz } from '@/components/DuaQuiz';
import { ALLAH_99_NAMES, NAMES_QUIZ_QUESTIONS } from '@/data/dua-library';

export default function NamesOfAllahPage() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALLAH_99_NAMES;
    return ALLAH_99_NAMES.filter(
      (name) =>
        name.transliteration.toLowerCase().includes(q) ||
        name.meaning.toLowerCase().includes(q) ||
        name.arabic.includes(query.trim()) ||
        String(name.number) === q
    );
  }, [query]);

  return (
    <div className="page-inner quran-learn-mobile pb-32">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <Link
          href="/duas"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-teal-700 hover:underline"
        >
          <ArrowLeft size={16} /> Duas &amp; Names
        </Link>

        <section className="rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-600 to-emerald-700 p-6 text-white shadow-lg">
          <span className="text-4xl">☪️</span>
          <h1 className="mt-2 text-3xl font-black">The 99 Names of Allah</h1>
          <p className="mt-3 text-sm leading-relaxed text-teal-50">
            Learn the beautiful names of Allah with their Arabic, transliteration and English meaning.
            The Prophet ﷺ said that whoever learns them enters Paradise.
          </p>
        </section>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-sand-400" size={18} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a name or meaning…"
            className="min-h-11 w-full rounded-xl border border-sand-200 py-3 pl-10 pr-4 text-base outline-none ring-teal-200 focus:ring-2 sm:text-sm"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((name) => (
            <article
              key={name.number}
              className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-teal-100 px-2 text-xs font-bold text-teal-800">
                    {name.number}
                  </span>
                  <p className="mt-2 text-lg font-black text-slate-900">{name.transliteration}</p>
                  <p className="text-sm text-slate-600">{name.meaning}</p>
                </div>
                <p className="font-arabic shrink-0 text-3xl leading-relaxed text-teal-800" dir="rtl">
                  {name.arabic}
                </p>
              </div>
            </article>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-sand-200 bg-sand-50 px-4 py-10 text-center text-sm text-sand-500">
            No names match your search.
          </p>
        ) : null}

        <DuaQuiz
          topicKey="99-names"
          topicTitle="99 Names of Allah"
          questions={NAMES_QUIZ_QUESTIONS}
          backHref="/duas"
          backLabel="Back to Duas & Names"
        />
      </div>
    </div>
  );
}
