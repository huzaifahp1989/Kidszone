'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Star } from 'lucide-react';
import { EARN_MORE_LINKS } from '@/lib/whats-new';

type EarnMorePointsLinksProps = {
  /** Optional heading override */
  title?: string;
};

/**
 * Compact strip of new / related activities — used on Quiz, Games, Pledge.
 */
export function EarnMorePointsLinks({ title = 'Earn more points' }: EarnMorePointsLinksProps) {
  const pathname = usePathname() || '';
  const links = EARN_MORE_LINKS.filter((item) => {
    if (item.href === pathname) return false;
    if (pathname.startsWith('/pledge') && item.href === '/pledge') return false;
    if (pathname.startsWith('/games') && item.href === '/games') return false;
    if (pathname.startsWith('/quiz') && item.href === '/quiz') return false;
    return true;
  }).slice(0, 5);

  if (!links.length) return null;

  return (
    <section
      className="rounded-2xl border border-teal-200/80 bg-gradient-to-r from-teal-50 via-white to-amber-50 p-4 shadow-sm"
      aria-label={title}
    >
      <div className="mb-3 flex items-center gap-2">
        <Star size={16} className="text-amber-500" />
        <h2 className="text-sm font-extrabold text-teal-900 sm:text-base">{title}</h2>
        <span className="text-xs font-medium text-sand-500">New activities for kids</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="relative flex min-w-[9.5rem] shrink-0 flex-col rounded-xl border border-sand-200 bg-white px-3 py-2.5 shadow-sm transition hover:border-teal-300 hover:shadow-md"
          >
            {item.badge && (
              <span className="absolute right-1.5 top-1.5 rounded bg-amber-400 px-1 py-0.5 text-[8px] font-black text-amber-950">
                {item.badge}
              </span>
            )}
            <span className="text-xl" aria-hidden>
              {item.emoji}
            </span>
            <span className="mt-1 text-xs font-extrabold text-sand-900">{item.title}</span>
            <span className="text-[10px] text-sand-500">{item.blurb}</span>
            {item.pointsHint && (
              <span className="mt-1.5 text-[10px] font-bold text-teal-700">{item.pointsHint} pts</span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
