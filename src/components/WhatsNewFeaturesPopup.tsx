'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { WHATS_NEW_ITEMS } from '@/lib/whats-new';
import { canShowSessionPopup, markSessionPopupShown } from '@/lib/popup-session-cap';

/** Bump when the featured new set changes so kids see the popup again. */
const FEATURE_VERSION = 'create-games-manners-v2';
const STORAGE_KEY = `whats-new-features-popup:${FEATURE_VERSION}`;

const TARGET_PAGES: Array<{ key: string; match: (path: string) => boolean }> = [
  { key: 'quiz', match: (p) => p === '/quiz' || p.startsWith('/quiz/') },
  { key: 'games', match: (p) => p === '/games' || p.startsWith('/games/') },
  { key: 'pledge', match: (p) => p === '/pledge' },
  { key: 'leaderboard', match: (p) => p === '/leaderboard' || p.startsWith('/leaderboard/') },
  { key: 'rewards', match: (p) => p === '/rewards' || p.startsWith('/rewards/') },
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function readDismissed(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeDismissed(map: Record<string, string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/**
 * One-per-day popup on Quiz / Games / Pledge / Leaderboard / Rewards
 * highlighting new activities (Create & Play, Hadith, Arabic, Dua).
 */
export function WhatsNewFeaturesPopup() {
  const pathname = usePathname() || '';
  const [open, setOpen] = useState(false);

  const pageKey = useMemo(
    () => TARGET_PAGES.find((p) => p.match(pathname))?.key ?? null,
    [pathname]
  );

  useEffect(() => {
    if (!pageKey) {
      setOpen(false);
      return;
    }

    const sessionId = `whats-new-features:${pageKey}`;
    const timer = window.setTimeout(() => {
      try {
        const dismissed = readDismissed();
        if (dismissed[pageKey] === todayKey()) return;
        if (!canShowSessionPopup(sessionId)) return;
        markSessionPopupShown(sessionId);
        setOpen(true);
      } catch {
        setOpen(true);
      }
    }, 900);

    return () => window.clearTimeout(timer);
  }, [pageKey]);

  const dismiss = () => {
    if (pageKey) {
      const next = { ...readDismissed(), [pageKey]: todayKey() };
      writeDismissed(next);
    }
    setOpen(false);
  };

  if (!pageKey) return null;

  return (
    <Modal isOpen={open} onClose={dismiss} title="What's new — earn more points" size="md">
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
          <Sparkles size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <p>
            New activities to try — Create & Play and Arabic are for practice (no claim points).
            Hadith, Wudu, Names of Allah, and Prophet ﷺ Facts can still earn game/hadith points.
          </p>
        </div>

        <div className="grid max-h-[50vh] grid-cols-2 gap-2.5 overflow-y-auto pr-1">
          {WHATS_NEW_ITEMS.slice(0, 8).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={dismiss}
              className="relative flex flex-col rounded-2xl border border-sand-200 bg-white p-3 shadow-sm transition hover:border-teal-300 hover:shadow-md"
            >
              {item.badge && (
                <span className="absolute right-2 top-2 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-950">
                  {item.badge}
                </span>
              )}
              <span className="text-2xl" aria-hidden>
                {item.emoji}
              </span>
              <span className="mt-1 text-sm font-extrabold text-sand-900">{item.title}</span>
              <span className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-sand-600">
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

        <button
          type="button"
          onClick={dismiss}
          className="w-full rounded-2xl border border-sand-200 bg-sand-50 px-4 py-3 text-sm font-bold text-sand-800 transition hover:bg-sand-100"
        >
          Maybe later
        </button>
      </div>
    </Modal>
  );
}
