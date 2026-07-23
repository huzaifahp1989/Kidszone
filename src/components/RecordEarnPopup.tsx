'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mic } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { RECORDING_APPROVED_POINTS } from '@/lib/points-policy';
import { canShowSessionPopup, markSessionPopupShown } from '@/lib/popup-session-cap';

const STORAGE_KEY = 'kidszone-record-earn-popup:v1';

const RECORDING_TYPES = [
  { emoji: '📖', label: "Qur'an" },
  { emoji: '🎵', label: 'Nasheeds' },
  { emoji: '📚', label: 'Stories' },
  { emoji: '📜', label: 'Hadith' },
] as const;

const TARGET_PAGES: Array<{ key: string; match: (path: string) => boolean }> = [
  { key: 'quiz', match: (p) => p === '/quiz' || p.startsWith('/quiz/') },
  { key: 'games', match: (p) => p === '/games' || p.startsWith('/games/') },
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
 * One-per-day popup on Quiz and Games promoting the Recording Studio.
 */
export function RecordEarnPopup() {
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

    const sessionId = `record-earn:${pageKey}`;
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
    }, 1200);

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
    <Modal isOpen={open} onClose={dismiss} title="Record & Earn Points" size="md">
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-2xl border border-teal-200/80 bg-gradient-to-r from-teal-50 via-white to-emerald-50 p-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
            <Mic size={24} />
          </span>
          <div>
            <p className="text-base font-extrabold text-teal-900">
              Earn more points by recording!
            </p>
            <p className="mt-1 text-sm text-teal-800">
              Record Qur&apos;an, Nasheed, Hadith or Stories — get{' '}
              <span className="font-bold text-teal-700">+{RECORDING_APPROVED_POINTS} points</span> when your
              recording is approved.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {RECORDING_TYPES.map((type) => (
            <span
              key={type.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-900"
            >
              <span aria-hidden>{type.emoji}</span>
              {type.label}
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/studio"
            onClick={dismiss}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800"
          >
            <Mic size={16} />
            Start recording
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-sand-200 bg-sand-50 px-4 py-3 text-sm font-bold text-sand-800 transition hover:bg-sand-100"
          >
            Maybe later
          </button>
        </div>
      </div>
    </Modal>
  );
}
