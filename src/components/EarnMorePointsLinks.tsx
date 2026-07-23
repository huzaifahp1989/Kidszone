'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Star } from 'lucide-react';
import { EARN_MORE_LINKS, type WhatsNewItem } from '@/lib/whats-new';
import { RECORDING_APPROVED_POINTS } from '@/lib/points-policy';

type EarnMorePointsLinksProps = {
  /** Optional heading override */
  title?: string;
};

const RECORDING_EARN_LINK: WhatsNewItem = {
  href: '/studio',
  emoji: '🎙️',
  title: 'Record & Earn',
  blurb: "Qur'an, Nasheed, Hadith, Stories",
  badge: 'NEW',
  pointsHint: `+${RECORDING_APPROVED_POINTS}`,
};

/**
 * Compact strip of new / related activities — used on Quiz, Games, Pledge.
 */
export function EarnMorePointsLinks({ title = 'Earn more points' }: EarnMorePointsLinksProps) {
  const pathname = usePathname() || '';
  const otherLinks = EARN_MORE_LINKS.filter((item) => {
    if (item.href === '/studio' || item.href === '/my-recordings') return false;
    if (item.href === pathname) return false;
    if (pathname.startsWith('/pledge') && item.href === '/pledge') return false;
    if (pathname.startsWith('/games') && item.href === '/games') return false;
    if (pathname.startsWith('/quiz') && item.href === '/quiz') return false;
    return true;
  }).slice(0, 4);

  const links = [RECORDING_EARN_LINK, ...otherLinks];

  return (
    <section
      className="rounded-2xl border border-teal-200/80 bg-gradient-to-r from-teal-50 via-white to-amber-50 p-4 shadow-sm"
      aria-label={title}
    >
      <div className="mb-2 flex items-center gap-2">
        <Star size={16} className="text-amber-500" />
        <h2 className="text-sm font-extrabold text-teal-900 sm:text-base">{title}</h2>
        <span className="text-xs font-medium text-sand-500">New activities for kids</span>
      </div>
      <p className="mb-3 text-xs text-teal-800 sm:text-sm">
        Earn more points by recording{' '}
        <span className="font-bold">Qur&apos;an, Nasheed, Hadith or Stories</span> — get{' '}
        <span className="font-bold text-teal-700">+{RECORDING_APPROVED_POINTS} points</span> when approved.{' '}
        <Link href="/studio" className="font-bold text-teal-700 underline-offset-2 hover:underline">
          Click here to record
        </Link>
        .
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex min-w-[9.5rem] shrink-0 flex-col rounded-xl border px-3 py-2.5 shadow-sm transition hover:shadow-md ${
              item.href === '/studio'
                ? 'border-teal-300 bg-teal-50 hover:border-teal-400'
                : 'border-sand-200 bg-white hover:border-teal-300'
            }`}
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
