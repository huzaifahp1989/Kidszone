'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronRight } from 'lucide-react';

export function DailyTasksBanner() {
  const isFriday = new Date().getDay() === 5;

  return (
    <Link
      href="/tracker"
      className="group flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 shadow-sm transition hover:border-emerald-400 hover:shadow-md sm:px-5 sm:py-4"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-xl shadow">
          ✅
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-black text-emerald-900 text-sm sm:text-base">Daily Tasks</span>
            {isFriday && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-700">
                ✨ Surah Kahf Friday
              </span>
            )}
          </div>
          <p className="text-xs text-emerald-700 mt-0.5">
            Salah · Durood · Quran · Good Deeds — tick &amp; earn points!
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-black text-white shadow transition group-hover:bg-emerald-600 shrink-0">
        <CheckCircle2 size={14} />
        <span className="hidden sm:inline">My Tasks</span>
        <ChevronRight size={14} />
      </div>
    </Link>
  );
}
