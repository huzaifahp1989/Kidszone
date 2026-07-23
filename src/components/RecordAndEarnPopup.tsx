'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mic } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { RECORDING_APPROVED_POINTS } from '@/lib/points-policy';
import { canShowSessionPopup, markSessionPopupShown } from '@/lib/popup-session-cap';

const FEATURE_VERSION = 'v1';
const STORAGE_KEY = `record-earn-popup:${FEATURE_VERSION}`;
const SESSION_ID = 'record-earn';

const RECORDING_TYPES = [
  { emoji: '📖', label: "Qur'an" },
  { emoji: '🎵', label: 'Nasheed' },
  { emoji: '📜', label: 'Hadith' },
  { emoji: '📚', label: 'Stories' },
] as const;

type RecordAndEarnPopupProps = {
  /** Page key for once-per-day dismiss tracking */
  pageKey: 'quiz' | 'games';
};

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
 * Once-per-day Record & Earn popup on Quiz and Games pages.
 */
export function RecordAndEarnPopup({ pageKey }: RecordAndEarnPopupProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const dismissed = readDismissed();
        if (dismissed[pageKey] === todayKey()) return;
        if (!canShowSessionPopup(SESSION_ID)) return;
        markSessionPopupShown(SESSION_ID);
        setOpen(true);
      } catch {
        setOpen(true);
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [pageKey]);

  const dismiss = () => {
    const next = { ...readDismissed(), [pageKey]: todayKey() };
    writeDismissed(next);
    setOpen(false);
  };

  return (
    <Modal isOpen={open} onClose={dismiss} title="Record & Earn Points" size="md">
      <div className="space-y-4">
        <div className="rounded-2xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-4 text-white shadow-md">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <Mic size={24} />
            </span>
            <div>
              <p className="text-lg font-black leading-tight">
                Earn more points by recording!
              </p>
              <p className="mt-1 text-sm text-teal-50/95">
                Record Qur&apos;an, Nasheed, Hadith or Stories — get{' '}
                <span className="font-bold text-amber-200">+{RECORDING_APPROVED_POINTS} points</span>{' '}
                when approved.
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {RECORDING_TYPES.map((type) => (
              <span
                key={type.label}
                className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold"
              >
                <span aria-hidden>{type.emoji}</span>
                {type.label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link href="/studio" onClick={dismiss} className="w-full sm:flex-1">
            <Button variant="primary" className="inline-flex w-full items-center justify-center gap-1.5">
              <Mic size={16} />
              Record now
            </Button>
          </Link>
          <Button variant="outline" className="w-full sm:flex-1" onClick={dismiss}>
            Maybe later
          </Button>
        </div>
      </div>
    </Modal>
  );
}
