'use client';

import React from 'react';
import Link from 'next/link';
import { CalendarDays, Moon, Sparkles, Star } from 'lucide-react';
import { ISLAMIC_MONTHS } from '@/data/islamic-months';
import { getUkHijriDate, type UkHijriDate } from '@/lib/hijri-date';

export default function IslamicCalendarPage() {
  const [hijri, setHijri] = React.useState<UkHijriDate | null>(null);
  const [selected, setSelected] = React.useState<number>(1);

  React.useEffect(() => {
    const today = getUkHijriDate();
    setHijri(today);
    setSelected(today.monthNumber);
  }, []);

  const selectedMonth = ISLAMIC_MONTHS.find((m) => m.number === selected) ?? ISLAMIC_MONTHS[0];

  return (
    <div className="min-h-screen bg-teal-50 pattern-islamic">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:space-y-8">
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-600/30 bg-white px-4 py-2">
            <CalendarDays size={16} className="text-teal-600" />
            <span className="text-sm font-semibold text-teal-700">Islamic Calendar</span>
          </div>
          <h1 className="text-4xl font-bold text-teal-900 md:text-5xl">The Islamic Calendar</h1>
          <p className="text-lg text-sand-700">
            Discover today&apos;s Islamic date and learn about all twelve beautiful months.
          </p>
        </div>

        {/* Today's date — big and visible at the top */}
        <div className="overflow-hidden rounded-3xl border border-teal-600/30 bg-gradient-to-br from-teal-900 via-teal-700 to-teal-600 p-6 text-white shadow-lg md:p-8">
          <div className="flex flex-col items-center gap-4 text-center md:flex-row md:justify-between md:text-left">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-amber-200">
                <Moon size={16} /> Today&apos;s Islamic date (UK)
              </p>
              {hijri ? (
                <>
                  <p className="mt-2 text-4xl font-black md:text-5xl">{hijri.formatted}</p>
                  {hijri.monthArabic ? (
                    <p className="mt-1 font-arabic text-2xl text-amber-100">{hijri.monthArabic}</p>
                  ) : null}
                  <p className="mt-2 text-sm text-violet-100/90">{hijri.gregorian}</p>
                </>
              ) : (
                <p className="mt-2 text-2xl font-black opacity-80">Loading today&apos;s date…</p>
              )}
            </div>
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white/10 text-5xl backdrop-blur-sm">
              🌙
            </div>
          </div>
          <p className="mt-4 rounded-2xl bg-white/10 px-4 py-2 text-center text-xs text-violet-100/90 md:text-left">
            Adjusted to match the UK moon-sighting date. The exact day can still occasionally vary by a
            day depending on the local sighting.
          </p>
        </div>

        {/* Month picker */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-xl font-bold text-teal-900">
            <Sparkles size={20} className="text-teal-600" /> Explore the 12 months
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {ISLAMIC_MONTHS.map((month) => {
              const isSelected = month.number === selected;
              const isToday = hijri?.monthNumber === month.number;
              return (
                <button
                  key={month.number}
                  type="button"
                  onClick={() => setSelected(month.number)}
                  className={`relative flex flex-col items-start gap-1 rounded-2xl border p-3 text-left transition ${
                    isSelected
                      ? 'border-teal-600 bg-white shadow-md ring-2 ring-teal-600/30'
                      : 'border-teal-300/40 bg-white/70 hover:border-teal-600/50 hover:bg-white'
                  }`}
                >
                  <span className="flex w-full items-center justify-between">
                    <span className="text-2xl" aria-hidden>
                      {month.emoji}
                    </span>
                    <span className="text-xs font-bold text-sand-400">#{month.number}</span>
                  </span>
                  <span className="text-sm font-bold text-teal-900">{month.name}</span>
                  <span className="font-arabic text-base text-teal-700">{month.arabic}</span>
                  {isToday ? (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      <Star size={10} className="fill-amber-500 text-amber-500" /> This month
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected month details */}
        <div className="rounded-3xl border border-teal-300/40 bg-white p-6 shadow-lg md:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-4xl">
              {selectedMonth.emoji}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-2xl font-black text-teal-900">
                  {selectedMonth.number}. {selectedMonth.name}
                </h3>
                {selectedMonth.sacred ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                    Sacred month
                  </span>
                ) : null}
              </div>
              <p className="font-arabic text-2xl text-teal-700">{selectedMonth.arabic}</p>
              <p className="mt-1 text-sm font-semibold text-teal-600">Meaning: {selectedMonth.meaning}</p>
            </div>
          </div>

          <p className="mt-4 text-base leading-7 text-sand-700">{selectedMonth.summary}</p>

          <div className="mt-5">
            <h4 className="mb-2 flex items-center gap-2 font-bold text-teal-700">
              <Sparkles size={18} /> Fun things to know
            </h4>
            <ul className="space-y-2">
              {selectedMonth.facts.map((fact, i) => (
                <li key={i} className="flex items-start gap-2 text-teal-800">
                  <span className="mt-0.5 text-teal-600">✓</span>
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border border-teal-600/20 bg-teal-50 p-6 text-center">
          <p className="text-sm text-teal-800">
            Keep learning every day! Try the{' '}
            <Link href="/quiz" className="font-bold text-teal-700 underline-offset-2 hover:underline">
              Daily Quiz
            </Link>{' '}
            or read{' '}
            <Link href="/hadith" className="font-bold text-teal-700 underline-offset-2 hover:underline">
              today&apos;s Hadith
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
