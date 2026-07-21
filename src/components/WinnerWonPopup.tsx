'use client';

import Link from 'next/link';
import React from 'react';
import { createPortal } from 'react-dom';
import { Gift, Sparkles, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { canShowSessionPopup, markSessionPopupShown } from '@/lib/popup-session-cap';

type WinnerStatus = {
  weekStartDate: string;
  isWinner: boolean;
  canSpin: boolean;
  hasSpun: boolean;
  showWinnerPopup: boolean;
};

export function WinnerWonPopup() {
  const [status, setStatus] = React.useState<WinnerStatus | null>(null);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const storageKey = status?.weekStartDate
    ? `kidszone-winner-popup:v1:${status.weekStartDate}`
    : null;

  React.useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          if (!cancelled) setStatus(null);
          return;
        }

        const res = await fetch('/api/rewards/winner-status', {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!res.ok || cancelled) return;

        setStatus(json);
        if (json.showWinnerPopup) {
          const key = `kidszone-winner-popup:v1:${json.weekStartDate}`;
          const seen = typeof window !== 'undefined' ? window.localStorage.getItem(key) : 'seen';
          if (!seen && canShowSessionPopup('winner')) {
            setOpen(true);
            markSessionPopupShown('winner');
          } else {
            setOpen(false);
          }
        } else {
          setOpen(false);
        }
      } catch {
        if (!cancelled) setStatus(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const closePopup = () => {
    if (storageKey && typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, 'seen');
    }
    setOpen(false);
  };

  if (loading || !status?.showWinnerPopup || !open) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-violet-200">
        <div className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-amber-500 px-5 py-6 text-center text-white">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
            <Trophy size={28} />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white/80">Congratulations</p>
          <h2 className="mt-2 text-2xl font-black">You won this week!</h2>
          <p className="mt-2 text-sm text-white/90">
            You were picked as a Kids Zone weekly winner for being active on the platform.
          </p>
        </div>

        <div className="space-y-4 px-5 py-6 text-center">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4">
            <div className="inline-flex items-center gap-2 text-amber-900">
              <Sparkles size={18} />
              <span className="font-bold">Your prize is waiting</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-amber-950">
              Go to the <strong>Rewards</strong> page and <strong>spin the wheel</strong> to see what you have won.
              Your voucher code or image will appear at the top once you spin.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/rewards"
              onClick={closePopup}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-700 px-6 py-3 text-sm font-black text-white shadow-lg transition hover:bg-violet-800"
            >
              <Gift size={16} />
              Go to Rewards &amp; Spin
            </Link>
            <button
              type="button"
              onClick={closePopup}
              className="rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              I&apos;ll spin later
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
