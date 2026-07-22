'use client';

import React from 'react';
import Link from 'next/link';
import { getUkHijriDate, type UkHijriDate } from '@/lib/hijri-date';

/**
 * A slim, always-visible bar at the top of the app showing today's Islamic
 * (Hijri) date for the UK. Tapping it opens the Islamic calendar where kids can
 * learn about each month. The date is computed on the client so it reflects the
 * visitor's current day in the UK timezone (and avoids SSR/CSR mismatches).
 */
export function HijriDateBanner() {
  const [hijri, setHijri] = React.useState<UkHijriDate | null>(null);

  React.useEffect(() => {
    setHijri(getUkHijriDate());
    // Recompute at UK midnight-ish by refreshing every 30 minutes so the date
    // stays correct for people who leave the app open.
    const id = window.setInterval(() => setHijri(getUkHijriDate()), 30 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="w-full border-b border-amber-300/40 bg-gradient-to-r from-[#4c1d95] via-[#6d28d9] to-[#7c3aed] text-white">
      <Link
        href="/calendar"
        aria-label="Open the Islamic calendar to learn about each month"
        className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-2 text-center transition hover:bg-white/10"
      >
        <span className="text-lg leading-none" aria-hidden>
          🌙
        </span>
        <span className="text-xs font-semibold sm:text-sm">
          <span className="text-amber-200">Islamic date today (UK):</span>{' '}
          {hijri ? (
            <span className="font-extrabold">{hijri.formatted}</span>
          ) : (
            <span className="opacity-80">loading…</span>
          )}
        </span>
        <span className="ml-1 hidden rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-100 sm:inline">
          Learn the months →
        </span>
      </Link>
    </div>
  );
}
