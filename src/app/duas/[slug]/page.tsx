'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, BookOpenText } from 'lucide-react';
import { DuaQuiz } from '@/components/DuaQuiz';
import { getDuaCategoryBySlug } from '@/data/dua-library';

export default function DuaCategoryPage() {
  const params = useParams<{ slug: string }>();
  const slug = String(params?.slug || '');
  const category = getDuaCategoryBySlug(slug);

  if (!category) {
    return (
      <div className="page-inner p-8">
        <p className="font-semibold">Topic not found.</p>
        <Link href="/duas" className="text-teal-700 underline">
          Back to Duas &amp; Names
        </Link>
      </div>
    );
  }

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
          <span className="text-4xl">{category.emoji}</span>
          <h1 className="mt-2 text-3xl font-black">{category.title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-teal-50">{category.description}</p>
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-teal-200">
            Source: {category.source}
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BookOpenText className="text-teal-600" size={20} />
            <h2 className="text-xl font-black text-slate-900">Learn the duas</h2>
          </div>

          <div className="space-y-4">
            {category.duas.map((dua) => (
              <article key={dua.key} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <h3 className="text-sm font-black uppercase tracking-wide text-teal-700">
                  {dua.title}
                </h3>
                <p className="font-arabic mt-3 text-2xl leading-loose text-slate-900" dir="rtl">
                  {dua.arabic}
                </p>
                <p className="mt-2 text-sm italic text-slate-600">{dua.transliteration}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-800">{dua.translation}</p>
                <p className="mt-3 inline-flex rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-800">
                  {dua.reference}
                </p>
              </article>
            ))}
          </div>
        </section>

        <DuaQuiz
          topicKey={category.slug}
          topicTitle={category.title}
          questions={category.quizQuestions}
          backHref="/duas"
          backLabel="Learn another topic"
        />
      </div>
    </div>
  );
}
