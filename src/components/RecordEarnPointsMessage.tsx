'use client';

import Link from 'next/link';
import { Mic } from 'lucide-react';
import { RECORDING_APPROVED_POINTS } from '@/lib/points-policy';

/**
 * Compact earn-more message for Quiz, Games, and similar activity pages.
 */
export function RecordEarnPointsMessage() {
  return (
    <section
      className="rounded-2xl border border-teal-200/80 bg-gradient-to-r from-teal-50 via-white to-emerald-50 p-4 shadow-sm"
      aria-label="Earn points by recording"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
            <Mic size={20} />
          </span>
          <div>
            <p className="text-sm font-extrabold text-teal-900 sm:text-base">
              Earn more points by recording!
            </p>
            <p className="mt-0.5 text-xs text-teal-800 sm:text-sm">
              Record Qur&apos;an, Nasheed, Hadith or Stories — get{' '}
              <span className="font-bold text-teal-700">+{RECORDING_APPROVED_POINTS} points</span> when approved.
            </p>
          </div>
        </div>
        <Link
          href="/studio"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800"
        >
          <Mic size={16} />
          Record now
        </Link>
      </div>
    </section>
  );
}
