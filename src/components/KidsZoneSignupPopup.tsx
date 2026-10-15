'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Gift, Sparkles, ArrowRight, UserPlus, CalendarDays } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useAuth } from '@/lib/auth-context';

const STORAGE_KEY_PREFIX = 'kidszone-signup-popup-seen:';

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

const ACTIVITY_PREVIEW = [
  { icon: '📖', label: 'Quran Quiz' },
  { icon: '🎨', label: 'Coloring' },
  { icon: '📚', label: 'Stories' },
  { icon: '💚', label: 'Hadith' },
  { icon: '🧩', label: 'Memory Match' },
  { icon: '🃏', label: 'Flashcards' },
  { icon: '⚔️', label: 'Quran Duel' },
  { icon: '📿', label: 'Daily Duas' },
  { icon: '🌙', label: 'Surah of Week' },
  { icon: '🎮', label: 'Kids Games' },
  { icon: '🤲', label: 'Good Deeds' },
  { icon: '🏆', label: 'Competitions' },
];

const BLOCKED_PATH_PREFIXES = ['/admin', '/signin', '/signup'];

export function KidsZoneSignupPopup() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const blocked = React.useMemo(() => {
    if (!pathname) return false;
    return BLOCKED_PATH_PREFIXES.some((p) => pathname.startsWith(p));
  }, [pathname]);

  useEffect(() => {
    if (authLoading) return;
    if (user?.id) return;
    if (blocked) return;
    if (hasSeenToday()) return;

    const timer = setTimeout(() => {
      if (!hasSeenToday()) {
        setOpen(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [authLoading, user?.id, blocked]);

  const close = () => {
    markSeenToday();
    setOpen(false);
  };

  const goSignup = () => {
    markSeenToday();
    setOpen(false);
    router.push('/signup');
  };

  const goActivities = () => {
    markSeenToday();
    setOpen(false);
    router.push('/activities');
  };

  const goSignin = () => {
    markSeenToday();
    setOpen(false);
    router.push('/signin');
  };

  if (!open) return null;

  return (
    <Modal isOpen={open} onClose={close} title="" size="sm">
      <div className="text-center space-y-4 pb-1">
        <div className="flex justify-center">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 via-rose-200 to-violet-300 shadow-lg">
            <Gift className="h-10 w-10 text-rose-600" strokeWidth={2.2} />
            <span className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow">
              <Sparkles className="h-4 w-4 text-amber-500" strokeWidth={2.4} />
            </span>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-900 leading-tight">
            Win prizes in the Kids Zone!
          </h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            To win prizes, <span className="font-bold text-emerald-700">stay active on Kids Zone</span>.
            There are <span className="font-extrabold text-violet-700">over 10 activities</span> to
            take part in each week.
          </p>
        </div>

        <div className="grid grid-cols-4 gap-2 px-1">
          {ACTIVITY_PREVIEW.map((a) => (
            <div
              key={a.label}
              className="flex flex-col items-center gap-1 rounded-xl bg-slate-50 border border-slate-100 py-2 px-1"
            >
              <div className="text-xl leading-none">{a.icon}</div>
              <div className="text-[10px] font-bold text-slate-600 leading-tight">
                {a.label}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={goSignup}
            className="group w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-sky-600 px-5 py-3.5 text-base font-black text-white shadow-[0_14px_34px_rgba(76,29,149,0.35)] transition hover:scale-[1.015] active:scale-[0.99]"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15">
              <UserPlus size={17} />
            </span>
            Create a free account
            <ArrowRight className="h-4 w-4 -mr-1 transition group-hover:translate-x-0.5" />
          </button>

          <button
            type="button"
            onClick={goActivities}
            className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:border-violet-200 hover:bg-violet-50 transition"
          >
            <CalendarDays className="h-4 w-4 text-violet-600" strokeWidth={2.3} />
            Browse all 10+ activities
          </button>
        </div>

        <button
          type="button"
          onClick={goSignin}
          className="w-full text-xs font-bold text-slate-500 hover:text-slate-700 transition pt-1 pb-0.5"
        >
          Already have an account? <span className="text-indigo-600 underline underline-offset-2">Sign in</span>
        </button>
      </div>
    </Modal>
  );
}
