'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/Modal';
import { useAuth } from '@/lib/auth-context';

const STORAGE_KEY_PREFIX = 'daily-tasks-popup-seen:';

function getTodayKey() {
  return STORAGE_KEY_PREFIX + new Date().toISOString().slice(0, 10);
}

function hasSeenToday() {
  if (typeof window === 'undefined') return true;
  return !!window.localStorage.getItem(getTodayKey());
}

function markSeenToday() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getTodayKey(), '1');
}

const TASK_HIGHLIGHTS = [
  { icon: '🕌', label: '5 Daily Salah' },
  { icon: '📿', label: 'Durood Ibrahim' },
  { icon: '📜', label: 'Surah Yasin / Mulk' },
  { icon: '💚', label: 'Good Deeds' },
];

export function DailyTasksPopup() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isFriday = new Date().getDay() === 5;

  useEffect(() => {
    if (authLoading) return;
    if (!user?.id) return;
    if (hasSeenToday()) return;

    // Show popup after a short delay so the page settles first
    const timer = setTimeout(() => {
      if (!hasSeenToday()) {
        setOpen(true);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [user?.id, authLoading]);

  const close = () => {
    markSeenToday();
    setOpen(false);
  };

  const goToTasks = () => {
    close();
    router.push('/tracker');
  };

  if (!open) return null;

  return (
    <Modal isOpen={open} onClose={close} title="" size="sm">
      <div className="text-center space-y-4 pb-2">
        {/* Icon header */}
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-4xl shadow-inner">
            ✅
          </div>
        </div>

        <div>
          <h2 className="text-xl font-black text-emerald-900">
            Daily Tasks{isFriday ? ' 🌟 Friday!' : ''}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Have you completed your daily tasks today?
          </p>
          {isFriday && (
            <p className="mt-1 text-xs font-bold text-amber-700 bg-amber-50 rounded-full px-3 py-1 inline-block">
              ✨ Don&apos;t forget Surah Al-Kahf today!
            </p>
          )}
        </div>

        {/* Task highlights */}
        <div className="grid grid-cols-2 gap-2 text-left">
          {TASK_HIGHLIGHTS.map(t => (
            <div
              key={t.label}
              className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2"
            >
              <span className="text-lg">{t.icon}</span>
              <span className="text-xs font-semibold text-emerald-800">{t.label}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400">Tick each task and earn Jannah points! 🌿</p>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={close}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
          >
            Later
          </button>
          <button
            onClick={goToTasks}
            className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-black text-white shadow transition hover:bg-emerald-600"
          >
            Go to My Tasks →
          </button>
        </div>
      </div>
    </Modal>
  );
}
