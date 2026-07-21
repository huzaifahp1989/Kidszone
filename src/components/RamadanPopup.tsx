'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, Button } from '@/components';
import { isRamadanModeActive } from '@/lib/ramadan-mode';

const STORAGE_KEY = 'ramadan_popup_v2_seen';

export function RamadanPopup() {
  const [showRamadanPopup, setShowRamadanPopup] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (!isRamadanModeActive()) return false;
    return !window.localStorage.getItem(STORAGE_KEY);
  });
  const router = useRouter();

  if (!showRamadanPopup) return null;

  const close = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    }
    setShowRamadanPopup(false);
  };

  return (
    <Modal isOpen={showRamadanPopup} onClose={close} title="Ramadan Mubarak! 🌙" size="lg">
      <div className="space-y-4 text-center text-sm text-slate-700 sm:text-base">
        <p className="text-slate-600">
          Ramadan mode is on! Complete daily quiz, durood, and optional fasting logs to earn special badges.
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              close();
              router.push('/quiz');
            }}
            className="w-full rounded-xl border border-purple-100 bg-white p-4 text-left shadow-sm transition hover:bg-purple-50"
          >
            <p className="font-bold text-violet-800">🧠 Daily Quiz</p>
            <p className="text-sm">Earn points every day this Ramadan</p>
          </button>

          <button
            type="button"
            onClick={() => {
              close();
              router.push('/pledge');
            }}
            className="w-full rounded-xl border border-purple-100 bg-white p-4 text-left shadow-sm transition hover:bg-purple-50"
          >
            <p className="font-bold text-rose-600">📿 Durood & Zikr</p>
            <p className="text-sm">Log your dhikr for Ramadan missions</p>
          </button>

          <button
            type="button"
            onClick={() => {
              close();
              router.push('/games/word-search/ramadan');
            }}
            className="w-full rounded-xl border border-amber-100 bg-amber-50 p-4 text-left shadow-sm transition hover:bg-amber-100"
          >
            <p className="font-bold text-amber-900">✨ Ramadan Word Hunt</p>
            <p className="text-sm">Play the special Ramadan word search game</p>
          </button>
        </div>

        <Button variant="primary" className="w-full sm:w-auto" onClick={close}>
          Let&apos;s go!
        </Button>
      </div>
    </Modal>
  );
}
