'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpen, CheckCircle2, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  getDifficultyLabel,
  readSurahProgress,
  SURAH_COURSES,
  type SurahCourseDifficulty,
} from '@/lib/surah-courses';

export default function SurahCoursesPage() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | SurahCourseDifficulty>('all');
  const [progress, setProgress] = React.useState<ReturnType<typeof readSurahProgress>>({});

  React.useEffect(() => {
    if (!user?.id) {
      setProgress({});
      return;
    }
    setProgress(readSurahProgress(user.id));
  }, [user?.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SURAH_COURSES.filter((course) => {
      const matchesQuery =
        !q ||
        course.englishName.toLowerCase().includes(q) ||
        course.arabicName.includes(query.trim()) ||
        String(course.number).includes(q) ||
        course.theme.toLowerCase().includes(q);
      const matchesFilter = filter === 'all' || course.difficulty === filter;
      return matchesQuery && matchesFilter;
    });
  }, [query, filter]);

  const completedCount = Object.values(progress).filter((row) => row.completed).length;

  return (
    <div className="page-inner quran-learn-mobile pb-28">
      <div className="mx-auto max-w-5xl">
        <div className="page-header mb-6 sm:mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-800 sm:px-4 sm:text-sm">
            <BookOpen size={16} /> Learn a Surah
          </div>
          <h1>📚 Surah Learning Activities</h1>
          <p className="text-sm sm:text-base">
            Read kid-friendly lessons about famous surahs, then answer questions to test what you learned.
            Includes Al-Hujurat, Al-Kahf, Yaseen, Al-Mulk, and more!
          </p>
        </div>

        {user?.id ? (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <p className="font-bold">
              Your progress: {completedCount}/{SURAH_COURSES.length} surahs completed
            </p>
            <p className="mt-1 text-emerald-800/90">Score 80% or higher on the quiz to mark a surah complete.</p>
          </div>
        ) : (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-bold">Sign in to save your progress and earn points.</p>
            <Link href="/signin?next=/quran/surahs" className="mt-2 inline-flex font-bold text-emerald-700 underline">
              Sign in →
            </Link>
          </div>
        )}

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
          <div className="flex flex-wrap gap-2">
            {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setFilter(level)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  filter === level
                    ? 'bg-violet-600 text-white'
                    : 'border border-sand-200 bg-white text-sand-700 hover:border-violet-300'
                }`}
              >
                {level === 'all' ? 'All levels' : getDifficultyLabel(level)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {filtered.map((course) => {
            const row = progress[course.slug];
            return (
              <Link
                key={course.slug}
                href={`/quran/surahs/${course.slug}`}
                className="surface-card group block min-h-11 rounded-2xl p-4 transition active:scale-[0.99] sm:p-5 sm:hover:ring-2 sm:hover:ring-violet-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{course.emoji}</span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-violet-600">
                        Surah {course.number} · {getDifficultyLabel(course.difficulty)}
                      </p>
                      <h2 className="mt-1 text-lg font-black text-sand-900 sm:text-xl">
                        {course.englishName}{' '}
                        <span className="font-arabic text-base text-violet-800">{course.arabicName}</span>
                      </h2>
                      <p className="mt-2 line-clamp-2 text-sm text-sand-600">{course.summary}</p>
                    </div>
                  </div>
                  {row?.completed ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
                      <CheckCircle2 size={14} /> Done
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-sand-500">
                  <span>{course.sections.length} lessons · {course.quizQuestions.length} quiz questions</span>
                  <span className="font-bold text-violet-700 group-hover:underline">Start learning →</span>
                </div>
              </Link>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p className="rounded-2xl border border-dashed border-sand-200 bg-sand-50 px-4 py-10 text-center text-sm text-sand-500">
            No surahs match your search. Try another name or clear the filter.
          </p>
        )}

        <div className="feature-tile mt-8 rounded-2xl border-violet-200 bg-violet-50/60 p-4 sm:p-6">
          <h3 className="font-heading text-lg font-bold text-violet-900">How it works</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-violet-900/90">
            <li>Pick a surah — start with <strong>Al-Fatiha</strong> or <strong>Al-Ikhlas</strong> if you are new.</li>
            <li>Read each <strong>lesson section</strong> carefully (made easy for kids).</li>
            <li>Answer the <strong>quiz questions</strong> about what you learned.</li>
            <li>Score 80%+ to complete the surah and earn points!</li>
            <li>For full Arabic text & audio, also visit <Link href="/quran/learn" className="font-bold underline">Juz Amma</Link>.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
