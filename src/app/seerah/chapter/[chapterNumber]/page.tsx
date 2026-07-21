'use client';

import Link from 'next/link';
import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getSeerahChapter } from '@/lib/seerah-course';
import { Bookmark, Moon, Sun } from 'lucide-react';

type ChapterProgress = {
  chapterNumber: number;
  completed: boolean;
  passed: boolean;
  finalScore: number;
  submittedAt: string | null;
  status: string | null;
  answers: string[] | null;
};

type ProgressResponse = {
  chapters: ChapterProgress[];
};

type BookmarkItem = {
  chapterNumber: number;
  sectionIndex: number;
  title: string;
};

export default function SeerahChapterPage() {
  const params = useParams<{ chapterNumber: string }>();
  const router = useRouter();
  const chapterNumber = Number(params?.chapterNumber || 0);
  const chapter = getSeerahChapter(chapterNumber);
  const { user, profile } = useAuth();

  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return (window.localStorage.getItem('seerah-theme') as 'light' | 'dark') || 'light';
  });
  const [readConfirmed, setReadConfirmed] = React.useState(false);
  const [answers, setAnswers] = React.useState<string[]>(Array.from({ length: 5 }, () => ''));
  const [progress, setProgress] = React.useState<ProgressResponse | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [bookmarks, setBookmarks] = React.useState<BookmarkItem[]>([]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('seerah-theme', theme);
    }
  }, [theme]);

  React.useEffect(() => {
    if (!user?.id) return;
    const key = `seerah-bookmarks-${user.id}`;
    try {
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setBookmarks(parsed.filter((item) => item.chapterNumber === chapterNumber));
      }
    } catch {
      setBookmarks([]);
    }
  }, [user?.id, chapterNumber]);

  React.useEffect(() => {
    async function loadProgress() {
      if (!user?.id) return;
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

  if (!chapter) {
    return (
      <div className="min-h-screen p-8">
        <p className="font-semibold">Chapter not found.</p>
        <Link href="/seerah" className="text-teal-600 underline">Back to Seerah</Link>
      </div>
    );
  }

  const chapterProgress = progress?.chapters?.find((row) => row.chapterNumber === chapterNumber) || null;
  const alreadySubmitted = Boolean(chapterProgress?.completed);

  const addBookmark = (sectionIndex: number, title: string) => {
    if (!user?.id) return;
    const key = `seerah-bookmarks-${user.id}`;
    const item: BookmarkItem = { chapterNumber, sectionIndex, title };
    try {
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      const next = Array.isArray(parsed) ? [...parsed.filter((x: BookmarkItem) => !(x.chapterNumber === chapterNumber && x.sectionIndex === sectionIndex)), item] : [item];
      window.localStorage.setItem(key, JSON.stringify(next));
      setBookmarks(next.filter((x: BookmarkItem) => x.chapterNumber === chapterNumber));
      setMessage('Section bookmarked.');
    } catch {
      setMessage('Could not save bookmark.');
    }
  };

  const submit = async () => {
    if (!user?.id || !chapter) return;
    if (alreadySubmitted) return;
    if (answers.some((a) => !a.trim())) {
      setMessage('Please answer all questions before submitting.');
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/seerah/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          userName: profile?.name || '',
          email: user.email || profile?.email || '',
          chapterNumber,
          answers,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Could not submit.');
        return;
      }
      setMessage('Your answers have been submitted. Your result will be available after admin review.');
      router.refresh();
      const pr = await fetch(`/api/seerah/progress?userId=${encodeURIComponent(user.id)}`, { cache: 'no-store' });
      const pd = await pr.json();
      if (pr.ok) setProgress(pd);
    } catch {
      setMessage('Network error while submitting.');
    } finally {
      setSaving(false);
    }
  };

  const shellClass = theme === 'dark' ? 'min-h-screen bg-slate-950 text-slate-100' : 'min-h-screen bg-[#f5f3ff] text-slate-800';

  return (
    <div className={shellClass}>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/seerah" className="text-sm font-bold text-teal-600 underline">Back to Course</Link>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>

        <header className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wide text-teal-700">Chapter {chapter.chapterNumber}</p>
          <h1 className="mt-1 text-2xl md:text-3xl font-black text-slate-900">{chapter.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{chapter.subtitle}</p>
        </header>

        <article className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm space-y-5">
          {chapter.content.map((paragraph, index) => (
            <section id={`section-${index + 1}`} key={index} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Section {index + 1}</h2>
                <button
                  type="button"
                  onClick={() => addBookmark(index + 1, `Section ${index + 1}`)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-teal-700"
                >
                  <Bookmark size={12} /> Bookmark
                </button>
              </div>
              <p className="leading-7 text-[15px] md:text-base text-slate-800 whitespace-pre-wrap">{paragraph}</p>
            </section>
          ))}

          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <p className="font-bold text-indigo-900 mb-2">Authentic References</p>
            <ul className="list-disc pl-5 text-sm text-indigo-800 space-y-1">
              {chapter.references.map((ref) => (
                <li key={ref}>{ref}</li>
              ))}
            </ul>
          </div>

          {bookmarks.length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-bold text-amber-900 mb-2">Your Bookmarks</p>
              <div className="flex flex-wrap gap-2">
                {bookmarks.map((bookmark) => (
                  <a key={`${bookmark.sectionIndex}`} href={`#section-${bookmark.sectionIndex}`} className="text-xs font-bold bg-white border border-amber-300 rounded-full px-3 py-1 text-amber-700">
                    {bookmark.title}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </article>

        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <label className="flex items-start gap-2 text-sm font-semibold text-emerald-900">
            <input type="checkbox" checked={readConfirmed} onChange={(e) => setReadConfirmed(e.target.checked)} className="mt-1" />
            I have finished reading this chapter and I am ready for the typed-answer quiz.
          </label>
        </section>

        {(readConfirmed || alreadySubmitted) && (
          <section className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-sm space-y-4">
            <h2 className="text-xl font-black text-slate-900">Chapter Quiz (Typed Answers Only)</h2>
            <p className="text-sm text-slate-600">One attempt per chapter. Your answers will be reviewed by an admin and your result will be shown after marking.</p>

            {chapter.quizQuestions.map((q, index) => (
              <div key={q.id} className="space-y-2">
                <label className="block font-semibold text-slate-800">{index + 1}. {q.question}</label>
                <textarea
                  rows={3}
                  disabled={alreadySubmitted}
                  value={alreadySubmitted ? (chapterProgress?.answers?.[index] || '') : answers[index]}
                  onChange={(e) => setAnswers((prev) => prev.map((v, i) => (i === index ? e.target.value : v)))}
                  className="w-full rounded-xl border border-slate-300 p-3"
                  placeholder="Type your answer from memory..."
                />
              </div>
            ))}

            {alreadySubmitted ? (
              <div className="rounded-xl p-3 text-sm font-bold bg-blue-50 text-blue-800">
                ✅ Submitted on {chapterProgress?.submittedAt ? new Date(chapterProgress.submittedAt).toLocaleString() : '-'} • Awaiting admin review
              </div>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={submit}
                className="inline-flex rounded-xl bg-teal-600 text-white px-5 py-3 font-bold hover:bg-teal-700 disabled:opacity-60"
              >
                {saving ? 'Submitting...' : 'Submit Chapter Quiz'}
              </button>
            )}

            {message ? <p className="text-sm font-semibold text-teal-700">{message}</p> : null}
          </section>
        )}
      </div>
    </div>
  );
}
