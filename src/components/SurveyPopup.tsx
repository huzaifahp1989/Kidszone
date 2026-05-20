'use client';

import React, { useEffect, useState } from 'react';

const SURVEY_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSeEVZHFkbYB6isXFrKrdsJszF3rho_3_NqlMHFYdIQ5SypKXg/viewform?usp=header';
const STORAGE_KEY = 'survey_popup_dismissed_date';

export function SurveyPopup() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const dismissed = localStorage.getItem(STORAGE_KEY);
        const today = new Date().toISOString().slice(0, 10);
        if (dismissed !== today) {
          setVisible(true);
        }
      } catch {
        setVisible(true);
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem(STORAGE_KEY, today);
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center p-4 pointer-events-none">
      <div
        className="pointer-events-auto w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#14b8a6]/20 overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        style={{ animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#14b8a6] to-[#0d9488] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📋</span>
            <span className="text-white font-bold text-base">Quick Survey</span>
          </div>
          <button
            onClick={dismiss}
            aria-label="Close"
            className="text-white/80 hover:text-white transition-colors text-xl leading-none font-light"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          <p className="text-[#6a422d] text-sm font-medium leading-relaxed">
            Assalamu Alaikum! 🌙
          </p>
          <p className="text-slate-700 text-sm leading-relaxed">
            Please fill this short survey on how you are finding this app. Your feedback helps us improve the experience for all kids! 🌟
          </p>

          <div className="flex gap-3 pt-1">
            <a
              href={SURVEY_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={dismiss}
              className="flex-1 text-center px-4 py-2.5 bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white font-bold text-sm rounded-xl shadow hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              Fill Survey ✍️
            </a>
            <button
              onClick={dismiss}
              className="px-4 py-2.5 bg-slate-100 text-slate-600 font-semibold text-sm rounded-xl hover:bg-slate-200 transition-all"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </div>
  );
}
