'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Trophy } from 'lucide-react';
import { categoryLabel, DEFAULT_WRITTEN_SLUG, type WrittenCompetition } from '@/lib/written-competition';

export default function WrittenCompetitionsListPage() {
  const [competitions, setCompetitions] = useState<Array<WrittenCompetition & { open?: boolean }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/written-competitions', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => setCompetitions(json.competitions || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-sand-50 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Written competitions</p>
        <h1 className="mt-2 text-4xl font-black text-slate-900">Study, write, and enter the prize draw</h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          These are handwritten-answer competitions. Type your own answers. Admin marks them. No multiple choice.
        </p>
        {loading && (
          <div className="mt-8 inline-flex items-center gap-2 text-slate-500">
            <Loader2 className="animate-spin" size={16} /> Loading...
          </div>
        )}
        <div className="mt-8 grid gap-4">
          {competitions.map((competition) => (
            <Link
              key={competition.id}
              href={`/competitions/written/${competition.slug}`}
              className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm transition hover:border-emerald-300"
            >
              <p className="text-xs font-bold uppercase tracking-wide text-amber-700">{categoryLabel(competition.category)}</p>
              <h2 className="mt-1 text-2xl font-black text-slate-900">{competition.name}</h2>
              <p className="mt-2 text-sm text-slate-600">{competition.description}</p>
              <p className="mt-3 text-sm font-bold text-emerald-800">{competition.open ? 'Open now' : 'Closed'}</p>
            </Link>
          ))}
          {!loading && competitions.length === 0 && (
            <Link
              href={`/competitions/written/${DEFAULT_WRITTEN_SLUG}`}
              className="inline-flex items-center gap-2 font-bold text-emerald-800"
            >
              <Trophy size={16} /> Open Rabi ul Awwal Seerah Quiz
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
