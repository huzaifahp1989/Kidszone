'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, CheckCircle, Languages, Search, XCircle } from 'lucide-react';
import { Button } from '@/components';
import {
  ARABIC_DICTIONARY,
  ARABIC_WORD_CATEGORIES,
  buildDictionaryQuiz,
  wordsInCategory,
  type ArabicWordCategory,
  type DictionaryQuizQuestion,
} from '@/data/arabic-dictionary';

type Phase = 'browse' | 'quiz' | 'done';

export default function ArabicDictionaryPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('browse');
  const [category, setCategory] = useState<ArabicWordCategory | 'all'>('family');
  const [query, setQuery] = useState('');
  const [questions, setQuestions] = useState<DictionaryQuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  const words = useMemo(() => {
    const base = wordsInCategory(category);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (w) =>
        w.english.toLowerCase().includes(q) ||
        w.transliteration.toLowerCase().includes(q) ||
        w.arabic.includes(query.trim())
    );
  }, [category, query]);

  const current = questions[index];
  const activeCategory = ARABIC_WORD_CATEGORIES.find((c) => c.id === category);

  const startQuiz = () => {
    setQuestions(buildDictionaryQuiz(category === 'all' ? 'all' : category, 8));
    setIndex(0);
    setSelected(null);
    setScore(0);
    setPhase('quiz');
  };

  const pickOption = (optionIndex: number) => {
    if (selected !== null || !current) return;
    setSelected(optionIndex);
    if (optionIndex === current.correctIndex) setScore((s) => s + 1);
  };

  const next = () => {
    if (selected === null) return;
    if (index + 1 < questions.length) {
      setIndex((i) => i + 1);
      setSelected(null);
      return;
    }
    setPhase('done');
  };

  return (
    <div className="page-inner">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" onClick={() => router.push('/')}>
            ← Home
          </Button>
          <Link
            href="/quran/learn"
            className="text-sm font-bold text-teal-700 underline-offset-2 hover:underline"
          >
            Read Juz Amma →
          </Link>
        </div>

        <header className="page-header">
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-amber-900">
            <Languages size={14} /> Arabic Learning
          </p>
          <h1 className="mt-3 font-heading text-3xl font-extrabold text-sand-900 md:text-4xl">
            Everyday Arabic words
          </h1>
          <p className="mt-2 max-w-2xl text-sand-600">
            Browse English and Arabic words for family, cars, home, food, and more. Practice a short quiz for
            fun — no points claim.
          </p>
        </header>

        {phase === 'browse' && (
          <>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategory('all')}
                className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${
                  category === 'all'
                    ? 'bg-teal-700 text-white'
                    : 'border border-sand-200 bg-white text-sand-700 hover:bg-teal-50'
                }`}
              >
                All ({ARABIC_DICTIONARY.length})
              </button>
              {ARABIC_WORD_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${
                    category === cat.id
                      ? 'bg-teal-700 text-white'
                      : 'border border-sand-200 bg-white text-sand-700 hover:bg-teal-50'
                  }`}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sand-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search English or Arabic…"
                className="w-full rounded-2xl border-2 border-sand-200 bg-white py-3 pl-10 pr-4 text-sand-900 outline-none focus:border-teal-400"
              />
            </div>

            {activeCategory && category !== 'all' && (
              <p className="text-sm font-medium text-sand-600">
                {activeCategory.emoji} {activeCategory.description}
              </p>
            )}

            <section className="grid gap-3 sm:grid-cols-2">
              {words.map((word) => (
                <article
                  key={word.id}
                  className="feature-tile flex items-center justify-between gap-3 rounded-2xl p-4"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-sand-900">{word.english}</p>
                    <p className="text-xs text-sand-500">{word.transliteration}</p>
                  </div>
                  <p className="font-arabic shrink-0 text-2xl text-teal-900 sm:text-3xl" dir="rtl">
                    {word.arabic}
                  </p>
                </article>
              ))}
              {!words.length && (
                <p className="col-span-full rounded-2xl border border-sand-200 bg-white p-6 text-center text-sand-600">
                  No words match that search. Try another category.
                </p>
              )}
            </section>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={startQuiz}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-teal-800 px-6 py-3.5 font-bold text-white shadow-lg transition hover:shadow-xl"
              >
                <BookOpen size={18} />
                Practice quiz
              </button>
            </div>
          </>
        )}

        {phase === 'quiz' && current && (
          <section className="surface-card rounded-3xl p-5 sm:p-8">
            <div className="mb-4 flex items-center justify-between text-sm font-semibold text-sand-600">
              <span>
                Question {index + 1} / {questions.length}
              </span>
              <span>Score {score}</span>
            </div>
            <p className="text-center text-sm font-bold uppercase tracking-wide text-teal-800">
              {current.prompt}
            </p>
            {current.mode === 'ar-to-en' ? (
              <p className="font-arabic my-6 text-center text-5xl text-teal-900 sm:text-6xl" dir="rtl">
                {current.word.arabic}
              </p>
            ) : (
              <p className="my-6 text-center text-3xl font-extrabold text-sand-900 sm:text-4xl">
                {current.word.english}
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {current.options.map((opt, i) => {
                const isSelected = selected === i;
                const isCorrect = i === current.correctIndex;
                let cls = 'rounded-2xl border-2 px-4 py-3 text-left font-bold transition ';
                if (selected === null) {
                  cls += 'border-sand-200 hover:border-teal-300 hover:bg-teal-50';
                } else if (isCorrect) {
                  cls += 'border-green-500 bg-green-50 text-green-900';
                } else if (isSelected) {
                  cls += 'border-red-400 bg-red-50 text-red-800';
                } else {
                  cls += 'border-sand-100 opacity-50';
                }
                const showArabic = current.mode === 'en-to-ar';
                return (
                  <button
                    key={`${current.id}-${opt}-${i}`}
                    type="button"
                    disabled={selected !== null}
                    onClick={() => pickOption(i)}
                    className={cls}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className={showArabic ? 'font-arabic text-xl' : ''} dir={showArabic ? 'rtl' : undefined}>
                        {opt}
                      </span>
                      {selected !== null && isCorrect && <CheckCircle size={18} />}
                      {selected !== null && isSelected && !isCorrect && <XCircle size={18} />}
                    </span>
                  </button>
                );
              })}
            </div>
            {selected !== null && (
              <div className="mt-4 rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-900">
                <strong>{current.word.english}</strong> —{' '}
                <span className="font-arabic text-lg" dir="rtl">
                  {current.word.arabic}
                </span>{' '}
                ({current.word.transliteration})
              </div>
            )}
            <button
              type="button"
              disabled={selected === null}
              onClick={next}
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-teal-600 to-teal-800 px-5 py-3 font-bold text-white disabled:opacity-50"
            >
              {index + 1 < questions.length ? 'Next word' : 'Finish practice'}
            </button>
          </section>
        )}

        {phase === 'done' && (
          <section className="surface-card rounded-3xl p-6 text-center sm:p-8">
            <p className="text-4xl" aria-hidden>
              🎉
            </p>
            <h2 className="mt-2 font-heading text-2xl font-extrabold text-sand-900">MashaAllah!</h2>
            <p className="mt-2 text-sand-700">
              You scored {score} / {questions.length} on today&apos;s word practice.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={startQuiz}
                className="rounded-xl border-2 border-teal-200 bg-white px-5 py-2.5 font-bold text-teal-800"
              >
                Practice again
              </button>
              <Button variant="outline" onClick={() => setPhase('browse')}>
                Back to learning
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
