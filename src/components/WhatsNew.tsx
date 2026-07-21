'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { WHATS_NEW_ITEMS } from '@/lib/whats-new';

/**
 * Home top banner highlighting new activities kids can try right away.
 */
export function WhatsNew() {
  return (
    <section
      className="overflow-hidden rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-teal-50 p-4 shadow-sm sm:p-5"
      aria-labelledby="whats-new-title"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-amber-900">
          <Sparkles size={12} /> What&apos;s New
        </span>
        <p id="whats-new-title" className="text-sm font-semibold text-sand-700">
          Try these and earn points today
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {WHATS_NEW_ITEMS.slice(0, 8).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group relative flex flex-col rounded-2xl border border-sand-200/80 bg-white/90 p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
          >
            {item.badge && (
              <span className="absolute right-2 top-2 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-950">
                {item.badge}
              </span>
            )}
            <span className="text-2xl" aria-hidden>
              {item.emoji}
            </span>
            <span className="mt-1.5 text-sm font-extrabold text-sand-900 group-hover:text-teal-800">
              {item.title}
            </span>
            <span className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-sand-600 sm:text-xs">
              {item.blurb}
            </span>
            {item.pointsHint && (
              <span className="mt-2 inline-flex w-fit rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-800">
                {item.pointsHint} pts
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
