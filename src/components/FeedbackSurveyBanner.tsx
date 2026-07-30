'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, MessageCircle } from 'lucide-react';

const DISMISS_KEY = 'feedback-survey-banner-dismissed-date';
const COMPLETED_KEY = 'feedback-survey-completed';
const MAX_IMPRESSIONS_PER_DAY = 3;

export function FeedbackSurveyBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Never show again after the user has submitted feedback
    if (window.localStorage.getItem(COMPLETED_KEY) === 'true') return;

    const dismissedDate = window.localStorage.getItem(DISMISS_KEY);
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = Number(window.localStorage.getItem(`feedback-survey-today-count:${today}`) || '0');

    // Do not show if user already dismissed today OR has seen it 3+ times today
    if (dismissedDate === today || todayCount >= MAX_IMPRESSIONS_PER_DAY) return;

    const timer = setTimeout(() => {
      setVisible(true);
      try {
        window.localStorage.setItem(`feedback-survey-today-count:${today}`, String(todayCount + 1));
      } catch {}
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    if (typeof window !== 'undefined') {
      const today = new Date().toISOString().slice(0, 10);
      window.localStorage.setItem(DISMISS_KEY, today);
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed top-[72px] left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1rem)] max-w-xl px-1">
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-600 to-emerald-500 p-1 shadow-2xl">
        <div className="rounded-xl bg-white/95 backdrop-blur-sm p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-2xl">
              📋
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="font-black text-slate-900 text-sm sm:text-base leading-tight">
                  Kids Zone Feedback Survey
                </p>
                <button onClick={dismiss} aria-label="Close" className="text-slate-400 hover:text-slate-600 shrink-0 -mt-1 -mr-1 p-1">
                  <X size={18} />
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Share your thoughts and earn <span className="font-black text-emerald-700">+50 points</span> — plus a chance to win a free personalised mug & key ring!
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link
                  href="/feedback-survey"
                  onClick={() => setVisible(false)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-black text-white transition hover:bg-violet-700"
                >
                  <MessageCircle size={13} /> Take Survey
                </Link>
                <button
                  onClick={dismiss}
                  className="inline-flex items-center justify-center rounded-xl border-2 border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  Maybe later
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Every entry enters the draw for a free personalised mug & key ring.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
