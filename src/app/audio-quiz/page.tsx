'use client';

import React from 'react';
import Link from 'next/link';
import { Mic, Trophy, Clock, CheckCircle2, ArrowRight, Calendar } from 'lucide-react';

interface AudioQuizListItem {
  id: string;
  title: string;
  description: string;
  category: string;
  ageGroup: string;
  startDate: string | null;
  endDate: string | null;
  prizeDetails: string;
  bannerUrl: string | null;
  participantCount: number;
  hasSubmitted: boolean;
  ended: boolean;
}

function formatDate(d: string | null): string {
  if (!d) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) return d;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}`;
}

export default function AudioQuizListPage() {
  const [quizzes, setQuizzes] = React.useState<AudioQuizListItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/audio-quiz/list', { cache: 'no-store' });
        const json = await res.json();
        if (active) setQuizzes(Array.isArray(json.quizzes) ? json.quizzes : []);
      } catch {
        if (active) setQuizzes([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-teal-50 pattern-islamic">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div className="space-y-3 text-center">
          <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-600 to-teal-700 text-3xl text-white shadow-lg">
            🎙️
          </div>
          <h1 className="text-4xl font-black text-teal-900 md:text-5xl">Audio Quiz</h1>
          <p className="mx-auto max-w-2xl text-lg text-sand-700">
            Listen to the audio questions, record your voice answers, earn points when approved — and winners get prizes!
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-3xl bg-teal-100" />
            ))}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="rounded-3xl border border-teal-300/40 bg-white p-8 text-center shadow">
            <Mic size={40} className="mx-auto mb-3 text-teal-300" />
            <p className="font-bold text-teal-900">No audio competitions right now</p>
            <p className="text-sand-700">Check back soon for a new voice challenge!</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {quizzes.map((quiz) => (
              <Link
                key={quiz.id}
                href={`/audio-quiz/${quiz.id}`}
                className="group flex flex-col overflow-hidden rounded-3xl border border-teal-300/40 bg-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                {quiz.bannerUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={quiz.bannerUrl} alt="" className="h-32 w-full object-cover" />
                ) : (
                  <div className="flex h-32 w-full items-center justify-center bg-gradient-to-br from-teal-900 via-teal-700 to-teal-600 text-5xl">
                    🎙️
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-700">
                      {quiz.category}
                    </span>
                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                      Ages {quiz.ageGroup}
                    </span>
                    {quiz.ended ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">Ended</span>
                    ) : null}
                    {quiz.hasSubmitted ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                        <CheckCircle2 size={12} /> Submitted
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-2 text-xl font-black text-teal-900">{quiz.title}</h2>
                  <p className="mt-1 flex-1 text-sm text-sand-700">{quiz.description}</p>
                  {quiz.prizeDetails ? (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold text-amber-700">
                      <Trophy size={14} /> {quiz.prizeDetails}
                    </p>
                  ) : null}
                  <div className="mt-3 flex items-center justify-between text-xs text-sand-600">
                    <span className="inline-flex items-center gap-1">
                      <Mic size={12} /> {quiz.participantCount} entries
                    </span>
                    {quiz.endDate ? (
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={12} /> Ends {formatDate(quiz.endDate)}
                      </span>
                    ) : null}
                  </div>
                  <span className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 px-4 py-2.5 text-sm font-bold text-white">
                    {quiz.ended ? 'View results' : quiz.hasSubmitted ? 'View entry' : 'Play & record'}{' '}
                    <ArrowRight size={15} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-sand-400">
          <Clock size={12} /> One entry per child. Approved recordings earn points; judges pick the winners.
        </p>
      </div>
    </div>
  );
}
