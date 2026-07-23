'use client';

import Link from 'next/link';

/**
 * Featured banner on the home page — encourages kids to record Quran, nasheeds,
 * stories and hadith to earn points after admin review.
 */
export function RecordingStudioBanner() {
  return (
    <Link
      href="/studio"
      className="block rounded-2xl border border-emerald-300/50 bg-gradient-to-r from-[#065f46] via-[#047857] to-[#059669] p-4 text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden>
            🎙️
          </span>
          <div>
            <p className="text-lg font-black leading-tight sm:text-xl">Record &amp; Earn Points</p>
            <p className="text-xs text-emerald-100/90 sm:text-sm">
              Record Qur&apos;an, nasheeds, stories &amp; hadith — click here and earn points after your teacher
              reviews!
            </p>
          </div>
        </div>
        <span className="hidden shrink-0 items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold text-emerald-100 sm:inline-flex">
          Start recording →
        </span>
      </div>
    </Link>
  );
}
