'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Mic } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { RECORDING_APPROVED_POINTS } from '@/lib/points-policy';
import { canShowSessionPopup, markSessionPopupShown } from '@/lib/popup-session-cap';

type RecordAndEarnPopupProps = {
  pageKey: 'quiz' | 'games';
};

const STORAGE_KEY = 'record-earn-popup:v1';

const RECORDING_TYPES = [
  { emoji: '📖', label: "Qur'an" },
  { emoji: '🎵', label: 'Nasheeds' },
  { emoji: '📚', label: 'Stories' },
  { emoji: '📜', label: 'Hadith' },
] as const;

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
export function RecordAndEarnPopup({ pageKey }: RecordAndEarnPopupProps) {
  const [open, setOpen] = useState(false);
  const sessionId = useMemo(() => `record-earn:${pageKey}`, [pageKey]);

  useEffect(() => {
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
  }, [pageKey, sessionId]);

  const dismiss = () => {
    const next = { ...readDismissed(), [pageKey]: todayKey() };
    writeDismissed(next);
    setOpen(false);
  };

  return (
    <Modal isOpen={open} onClose={dismiss} title="Record & Earn Points" size="md">
      <div className="space-y-5">
        <div className="rounded-2xl border border-teal-200/80 bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-4 text-white">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <Mic size={24} className="text-white" />
            </span>
            <div>
              <p className="text-lg font-black leading-tight">Earn more points by recording!</p>
              <p className="mt-1 text-sm text-teal-100/90">
                Record Qur&apos;an, Nasheeds, Stories &amp; Hadith — get{' '}
                <span className="font-bold text-amber-200">+{RECORDING_APPROVED_POINTS} points</span> when approved.
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {RECORDING_TYPES.map((type) => (
              <span
                key={type.label}
                className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold text-white"
              >
                <span aria-hidden>{type.emoji}</span>
                {type.label}
              </span>
            ))}
          </div>
        </div>

        <p className="text-sm text-sand-600">
          Open the Recording Studio, choose what you want to recite, and submit your recording. An admin will review it
          and award points when approved.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href="/studio"
            onClick={dismiss}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-teal-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800"
          >
            <Mic size={18} />
            Start recording
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex flex-1 items-center justify-center rounded-2xl border border-sand-200 bg-sand-50 px-4 py-3 text-sm font-bold text-sand-800 transition hover:bg-sand-100"
          >
            Maybe later
          </button>
        </div>
      </div>
    </Modal>
  );
}
