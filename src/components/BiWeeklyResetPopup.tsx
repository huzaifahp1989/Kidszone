'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

type BiWeeklyResetPopupProps = {
  pageKey: 'quiz' | 'games' | 'rewards';
};

const START_DATE_UTC = Date.UTC(2026, 4, 16, 0, 0, 0, 0); // Saturday 16 May 2026
const PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

function getBiWeeklyPeriodIndex(nowMs: number) {
  if (nowMs < START_DATE_UTC) return 0;
  return Math.floor((nowMs - START_DATE_UTC) / PERIOD_MS);
}

export function BiWeeklyResetPopup({ pageKey }: BiWeeklyResetPopupProps) {
  const [periodIndex] = useState(() => getBiWeeklyPeriodIndex(Date.now()));
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  const popupStorageKey = useMemo(() => {
    return `kidszone-weekly-reset-popup:v6:${pageKey}:${periodIndex}`;
  }, [pageKey, periodIndex]);

  useEffect(() => {
    setMounted(true);
    try {
      if (!window.localStorage.getItem(popupStorageKey)) {
        setOpen(true);
      }
    } catch {
      setOpen(true);
    }
  }, [popupStorageKey]);

  const closePopup = () => {
    try {
      window.localStorage.setItem(popupStorageKey, 'seen');
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg sm:text-xl font-black text-slate-900">Kids Zone Winners Notice</h2>
          <button
            onClick={closePopup}
            className="rounded-lg px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-200"
          >
            Close
          </button>
        </div>
        <div className="px-5 py-5 sm:px-6 sm:py-6 space-y-4 text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-teal-800">
            Weekly 5 Activities Challenge
          </p>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left">
            <p className="text-sm font-bold text-slate-900 text-center">Weekly winners announcement</p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-center">
              Winners are picked at random from everyone who qualifies — not by who is #1 on the leaderboard.
            </p>
          </div>
          <p className="text-sm text-teal-800 font-semibold">
            Contact number (WhatsApp):
            {' '}
            <a
              href="https://wa.me/447404644610"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              07404644610
            </a>
          </p>
          <p className="text-teal-900 font-semibold">
            Please note: weekly points are reset manually by admin.
          </p>
          <p className="text-sm text-sand-700">
            Winners are chosen according to 5 completed activities on Kids Zone.
          </p>
          <p className="text-sm text-teal-800 font-semibold">
            Complete any 5 activities every week. It is not fixed to specific activity types.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={closePopup}
              className="px-4 py-2 rounded-lg border border-teal-300/40 text-teal-900 font-semibold hover:bg-teal-100"
            >
              Close
            </button>
            <Link
              href="/leaderboard"
              onClick={closePopup}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-teal-600 to-teal-700 text-white font-bold"
            >
              View Leaderboard
            </Link>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}