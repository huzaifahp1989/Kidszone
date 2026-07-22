'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Trophy, Users, Loader2, Medal } from 'lucide-react';

interface ResultsData {
  quiz: { id: string; title: string; prizeDetails: string; endDate: string | null; bannerUrl: string | null };
  participantCount: number;
  ended: boolean;
  winnersAnnounced: boolean;
  winners: { name: string; place: number }[];
}

const PLACE_BADGE = ['🥇', '🥈', '🥉'];

export default function AudioQuizResultsPage() {
  const params = useParams();
  const quizId = String(params?.quizId || '');
  const [data, setData] = React.useState<ResultsData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/audio-quiz/${quizId}/results`, { cache: 'no-store' });
        const json = await res.json();
        if (active && res.ok) setData(json as ResultsData);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [quizId]);

  return (
    <div className="min-h-screen bg-[#f5f3ff] pattern-islamic">
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-8">
        <Link href="/audio-quiz" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#6d28d9] hover:underline">
          <ArrowLeft size={15} /> All audio quizzes
        </Link>

        {loading ? (
          <div className="rounded-3xl border border-[#c4b5fd]/40 bg-white p-8 text-center shadow">
            <Loader2 className="mx-auto animate-spin text-[#7c3aed]" size={28} />
          </div>
        ) : !data ? (
          <div className="rounded-3xl border border-[#c4b5fd]/40 bg-white p-8 text-center shadow">
            <p className="font-bold text-[#1e1b4b]">Results not found</p>
          </div>
        ) : (
          <>
            <div className="rounded-3xl border border-[#c4b5fd]/40 bg-gradient-to-br from-[#4c1d95] via-[#6d28d9] to-[#7c3aed] p-8 text-center text-white shadow-lg">
              <Trophy className="mx-auto text-amber-300" size={36} />
              <h1 className="mt-2 text-2xl font-black md:text-3xl">{data.quiz.title}</h1>
              <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-bold">
                <Users size={15} /> {data.participantCount} children took part
              </p>
              {data.quiz.prizeDetails ? (
                <p className="mt-2 text-sm text-violet-100">Prize: {data.quiz.prizeDetails}</p>
              ) : null}
            </div>

            {data.winnersAnnounced ? (
              <div className="rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white p-6 text-center shadow-lg">
                <h2 className="text-xl font-black text-amber-700">🎉 Congratulations to our winners! 🎉</h2>
                <p className="mt-1 text-sm text-[#475569]">May Allah reward your effort. Well done to everyone who took part!</p>
                <div className="mt-4 space-y-2">
                  {data.winners
                    .slice()
                    .sort((a, b) => a.place - b.place)
                    .map((w) => (
                      <div
                        key={`${w.place}-${w.name}`}
                        className="flex items-center justify-center gap-3 rounded-2xl border border-amber-200 bg-white px-4 py-3"
                      >
                        <span className="text-2xl">{PLACE_BADGE[w.place - 1] || <Medal className="text-amber-500" />}</span>
                        <span className="text-lg font-black text-[#1e1b4b]">{w.name}</span>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                          {w.place === 1 ? '1st place' : w.place === 2 ? '2nd place' : w.place === 3 ? '3rd place' : `#${w.place}`}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-[#c4b5fd]/40 bg-white p-8 text-center shadow">
                <div className="text-4xl">⏳</div>
                <p className="mt-2 font-black text-[#1e1b4b]">
                  {data.ended ? 'Judging in progress' : 'Quiz still running'}
                </p>
                <p className="mt-1 text-[#475569]">
                  {data.ended
                    ? 'Our judges are listening to every answer. Winners will be announced here soon, inshaAllah.'
                    : 'Winners are revealed after the quiz ends and judging is complete. Scores are kept private.'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
