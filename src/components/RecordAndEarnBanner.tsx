'use client';

import Link from 'next/link';
import { Mic } from 'lucide-react';
import { RECORDING_APPROVED_POINTS } from '@/lib/points-policy';

const RECORDING_TYPES = [
  { emoji: '📖', label: "Qur'an" },
  { emoji: '🎵', label: 'Nasheeds' },
  { emoji: '📚', label: 'Stories' },
  { emoji: '📜', label: 'Hadith' },
] as const;

/**
 * Prominent home-page CTA — mirrors the Quiz page challenge banner style.
 */
export function RecordAndEarnBanner() {
  return (
    <Link
      href="/studio"
      className="block rounded-2xl border border-teal-300/50 bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-4 text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 text-2xl" aria-hidden>
            <Mic size={24} className="text-white" />
          </span>
          <div>
            <p className="text-lg font-black leading-tight sm:text-xl">
              Record &amp; Earn Points
            </p>
            <p className="mt-0.5 text-xs text-teal-100/90 sm:text-sm">
              Record Qur&apos;an, Nasheeds, Stories &amp; Hadith — click here to start!
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {RECORDING_TYPES.map((type) => (
                <span
                  key={type.label}
                  className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white sm:text-xs"
                >
                  <span aria-hidden>{type.emoji}</span>
                  {type.label}
                </span>
              ))}
              <span className="inline-flex items-center rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-black text-amber-950 sm:text-xs">
                +{RECORDING_APPROVED_POINTS} pts
              </span>
            </div>
          </div>
        </div>
        <span className="hidden shrink-0 items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold text-teal-50 sm:inline-flex">
          Start recording →
        </span>
      </div>
    </Link>
  );
}
