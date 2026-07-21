'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, PenLine, Sparkles, Star } from 'lucide-react';
import { Button } from '@/components';
import { useAuth } from '@/lib/auth-context';
import { authJsonFetch } from '@/lib/auth-headers';
import { DAILY_HADITH_COUNT, getHadithsForDay, getUtcDayKey } from '@/lib/daily-hadith';
import { ACTIVITY_BONUS_POINTS } from '@/lib/points-policy';

const MIN_LEN = 25;

export default function DailyHadithPage() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const hadiths = useMemo(() => getHadithsForDay(), []);
  const dayKey = useMemo(() => getUtcDayKey(), []);
  const [selectedId, setSelectedId] = useState(hadiths[0]?.id || '');
  const [reflection, setReflection] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const selected = hadiths.find((h) => h.id === selectedId) || hadiths[0];
  const trimmed = reflection.trim();
  const canSubmit =
    Boolean(selected) && trimmed.length >= MIN_LEN && Boolean(user?.id) && !busy && !submitted;

  const submit = async () => {
    if (!user?.id || !canSubmit || !selected) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await authJsonFetch('/api/hadith/reflect', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          hadithId: selected.id,
          reflection: trimmed,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || 'Could not save your reflection.');
        return;
      }
      setSubmitted(true);
      if (data.pointsAwarded > 0) {
        setMessage(`MashaAllah! ⭐ +${data.pointsAwarded} points for today's Hadith reflection.`);
        refreshProfile?.();
      } else {
        setMessage(data.message || 'Reflection saved. Come back tomorrow for a new set of 5!');
      }
    } catch {
      setMessage('Could not connect. Check your internet and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-inner">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" onClick={() => router.push('/')}>
            ← Home
          </Button>
          <Link
            href="/hadith/quiz"
            className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-white px-4 py-2 text-sm font-bold text-teal-800 transition hover:bg-teal-50"
          >
            Extra Hadith Quiz
          </Link>
        </div>

        <header className="page-header text-center sm:text-left">
          <p className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-teal-800">
            <Sparkles size={14} /> Daily Hadith · {DAILY_HADITH_COUNT} today
          </p>
          <h1 className="mt-3 font-heading text-3xl font-extrabold text-sand-900 md:text-4xl">
            Today&apos;s {DAILY_HADITH_COUNT} Hadiths
          </h1>
          <p className="mt-2 max-w-2xl text-sand-600">
            These {DAILY_HADITH_COUNT} sayings change every day ({dayKey}). Read them, pick one you loved,
            and write what you learned for +{ACTIVITY_BONUS_POINTS} points (once per day).
          </p>
        </header>

        <div className="space-y-4">
          {hadiths.map((hadith, index) => {
            const isActive = selected?.id === hadith.id;
            return (
              <button
                key={hadith.id}
                type="button"
                onClick={() => !submitted && setSelectedId(hadith.id)}
                disabled={submitted}
                className={`w-full overflow-hidden rounded-3xl border-2 text-left transition ${
                  isActive
                    ? 'border-teal-500 shadow-md ring-2 ring-teal-200'
                    : 'border-transparent shadow-sm hover:border-teal-200'
                }`}
              >
                <article className="surface-card overflow-hidden rounded-[1.35rem]">
                  <div className="bg-gradient-to-r from-teal-700 to-teal-600 p-4 text-white sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-teal-100">
                      <span className="inline-flex items-center gap-1.5">
                        <BookOpen size={14} /> Hadith {index + 1} · {hadith.topic}
                      </span>
                      <span className="rounded bg-teal-900/40 px-2 py-0.5">{hadith.source}</span>
                    </div>
                    <h2 className="font-heading mt-2 text-base leading-relaxed sm:text-lg md:text-xl">
                      {hadith.english}
                    </h2>
                  </div>
                  <div className="space-y-3 p-4 sm:p-5">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wide text-teal-800">Meaning</h3>
                      <p className="mt-1 text-sm text-sand-700 sm:text-base">{hadith.meaning}</p>
                    </div>
                    <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 p-3">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-amber-900">Try this</h3>
                      <p className="mt-1 text-sm text-sand-700">{hadith.practicalExample}</p>
                    </div>
                    {isActive && !submitted && (
                      <p className="text-xs font-bold text-teal-700">Selected for your reflection ↓</p>
                    )}
                  </div>
                </article>
              </button>
            );
          })}
        </div>

        <section className="surface-card rounded-3xl p-5 sm:p-6">
          <h3 className="flex items-center gap-2 font-bold text-sand-900">
            <PenLine size={18} className="text-teal-700" />
            What did you learn from {selected ? `Hadith ${hadiths.findIndex((h) => h.id === selected.id) + 1}` : 'today'}?
          </h3>
          <p className="mt-1 text-sm text-sand-600">
            Tap a Hadith above, then write in your own words (at least {MIN_LEN} characters).
          </p>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            disabled={submitted || busy}
            rows={5}
            maxLength={2000}
            placeholder="Example: From the hadith about smiling, I learned that a smile is charity…"
            className="mt-4 w-full rounded-2xl border-2 border-sand-200 bg-white px-4 py-3 text-sand-900 outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100 disabled:bg-sand-50"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-sand-500">
            <span>
              {trimmed.length}/{MIN_LEN} minimum
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
              <Star size={12} /> +{ACTIVITY_BONUS_POINTS} points today
            </span>
          </div>

          {!user?.id && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
              <Link href="/signin" className="underline">
                Sign in
              </Link>{' '}
              to save your reflection and earn points.
            </p>
          )}

          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void submit()}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-teal-800 px-5 py-3.5 text-base font-bold text-white shadow-lg transition hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {busy ? 'Saving…' : submitted ? 'Reflection submitted' : 'Submit & earn points'}
          </button>

          {message && (
            <p className="mt-4 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900">
              {message}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
