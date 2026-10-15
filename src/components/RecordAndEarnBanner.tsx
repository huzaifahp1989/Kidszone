'use client';

import Link from 'next/link';
import { ArrowRight, Gift, Mic, Sparkles, Trophy } from 'lucide-react';
import { RECORDING_APPROVED_POINTS } from '@/lib/points-policy';

const RECORDING_TYPES = [
  { emoji: '📖', label: "Qur'an" },
  { emoji: '🎵', label: 'Nasheeds' },
  { emoji: '📚', label: 'Stories' },
  { emoji: '📜', label: 'Hadith' },
] as const;

export function RecordAndEarnBanner() {
  return (
    <Link
      href="/studio"
      className="group relative block overflow-hidden rounded-2xl border-2 border-amber-300 bg-[linear-gradient(115deg,#1e3a8a_0%,#2563eb_52%,#1d4ed8_100%)] p-4 text-white shadow-xl transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-2xl sm:p-6"
    >
      <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full border-[18px] border-white/5" aria-hidden />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/15 shadow-inner" aria-hidden>
            <Mic size={28} className="text-amber-300" />
          </span>
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-950 sm:text-xs">
              <Sparkles size={12} /> Featured competition
            </span>
            <p className="mt-2 text-xl font-black leading-tight sm:text-2xl">
              Kids Recording Competition
            </p>
            <p className="mt-1 max-w-2xl text-sm font-medium text-emerald-50 sm:text-base">
              Send us your best Qur&apos;an recitation, Nasheed, Hadith or Islamic Story recording.
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {RECORDING_TYPES.map((type) => (
                <span
                  key={type.label}
                  className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white sm:text-xs"
                >
                  <span aria-hidden>{type.emoji}</span>
                  {type.label}
                </span>
              ))}
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-black text-amber-950 sm:text-xs">
                <Trophy size={12} /> +{RECORDING_APPROVED_POINTS} pts when approved
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white sm:text-xs">
                <Gift size={12} /> Prizes for winners
              </span>
            </div>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-emerald-800 shadow-md transition group-hover:bg-amber-50 sm:px-5">
          Enter in Studio <ArrowRight size={17} />
        </span>
      </div>
    </Link>
  );
}
