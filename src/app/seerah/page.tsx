'use client';

import Link from 'next/link';
import React from 'react';
import { useAuth } from '@/lib/auth-context';
import { SEERAH_CHAPTERS } from '@/lib/seerah-course';
import { BookOpen, CheckCircle2, Download, Moon, Sun } from 'lucide-react';

type ProgressResponse = {
  setupRequired?: boolean;
  chapters: Array<{
    chapterNumber: number;
    completed: boolean;
    passed: boolean;
    finalScore: number;
  }>;
  completionCount: number;
  passedCount: number;
  allCompleted: boolean;
  allPassed: boolean;
  certificate: { id: string } | null;
};

export default function SeerahCoursePage() {
  const { user, profile } = useAuth();
  const [progress, setProgress] = React.useState<ProgressResponse | null>(null);
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return (window.localStorage.getItem('seerah-theme') as 'light' | 'dark') || 'light';
  });

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('seerah-theme', theme);
    }
  }, [theme]);

  React.useEffect(() => {
    async function loadProgress() {
      if (!user?.id) {
        setProgress(null);
        return;
      }
      try {
        const res = await fetch(`/api/seerah/progress?userId=${encodeURIComponent(user.id)}`, { cache: 'no-store' });
        const data = await res.json();
        if (res.ok) {
          setProgress(data);
        }
      } catch {
        setProgress(null);
      }
    }
    loadProgress();
  }, [user?.id]);

  const chapterStatus = new Map<number, { completed: boolean; passed: boolean; finalScore: number }>();
  for (const row of progress?.chapters || []) {
    chapterStatus.set(row.chapterNumber, {
      completed: row.completed,
      passed: row.passed,
      finalScore: row.finalScore,
    });
  }

  const shellClass = theme === 'dark'
    ? 'min-h-screen bg-slate-950 text-slate-100'
    : 'min-h-screen bg-[#f5f3ff] text-slate-800';

  return (
    <div className={shellClass}>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-600">Seerah Learning Course</p>
            <h1 className="mt-2 text-3xl md:text-4xl font-black">Seerah of Prophet Muhammad ﷺ</h1>
            <p className="mt-2 text-sm md:text-base opacity-90">
              Learn the Seerah in 5 structured chapters with typed-answer quizzes and one attempt per chapter.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>

        {!user?.id ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 text-amber-900 p-4">
            <p className="font-semibold">Please sign in to start the Seerah course and track your progress.</p>
            <Link href="/signin?next=%2Fseerah" className="mt-3 inline-flex rounded-lg bg-amber-500 text-white px-4 py-2 font-bold">
              Sign In
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-900 p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-bold">Progress: {progress?.completionCount || 0}/5 chapters submitted</p>
              <p className="text-sm">Results are shown after admin review.</p>
            </div>
            {progress?.certificate ? (
              <a
                href={`/api/seerah/certificate?userId=${encodeURIComponent(user.id)}`}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white px-4 py-2 font-bold"
              >
                <Download size={16} /> Download Certificate
              </a>
            ) : null}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SEERAH_CHAPTERS.map((chapter) => {
            const status = chapterStatus.get(chapter.chapterNumber);
            return (
              <article key={chapter.chapterNumber} className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Chapter {chapter.chapterNumber}</p>
                    <h2 className="mt-1 text-xl font-black text-slate-900">{chapter.title}</h2>
                    <p className="mt-2 text-sm text-slate-600">{chapter.subtitle}</p>
                  </div>
                  {status?.completed ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold bg-blue-100 text-blue-700">
                      <CheckCircle2 size={14} /> Submitted
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold bg-slate-100 text-slate-700">
                      <BookOpen size={14} /> Not Started
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-slate-500">5 typed-answer questions • One attempt</p>
                  <Link
                    href={`/seerah/chapter/${chapter.chapterNumber}`}
                    className="inline-flex rounded-lg bg-teal-600 text-white px-3 py-2 text-sm font-bold hover:bg-teal-700"
                  >
                    {status?.completed ? 'View Submission' : 'Read Chapter'}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
