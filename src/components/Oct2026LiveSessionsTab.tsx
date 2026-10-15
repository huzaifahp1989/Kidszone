'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { CalendarCheck, ExternalLink, X, Sparkles, MessageCircle } from 'lucide-react';

const SURVEY_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSfkjM966IcQ8T3ARMPlmeYtWoqUkHxsie7pgQCwYBt7bm4jnw/viewform?usp=publish-editor';
const SUPPRESS_AT_KEY = 'oct2026-live-sessions-tab-suppressed-at-ms';
const SUPPRESS_ROUTES_LEFT_KEY = 'oct2026-live-sessions-tab-routes-left';
const EXPAND_KEY = 'oct2026-live-sessions-tab-expanded-once';

const RESHOW_AFTER_ROUTES = 3;
const RESHOW_AFTER_MS = 5 * 60 * 1000;

const SKIP_PATH_PREFIXES = ['/admin', '/signin', '/signup'];

export function Oct2026LiveSessionsTab() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isCountableRoute =
    !!pathname && !SKIP_PATH_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;
    let autoCollapseTimer: ReturnType<typeof setTimeout> | null = null;
    let timeFallbackTimer: ReturnType<typeof setTimeout> | null = null;

    function clearSuppress() {
      try {
        window.localStorage.removeItem(SUPPRESS_AT_KEY);
        window.localStorage.removeItem(SUPPRESS_ROUTES_LEFT_KEY);
      } catch {}
    }

    function isSuppressed(): boolean {
      try {
        const supAt = Number(window.localStorage.getItem(SUPPRESS_AT_KEY) || '0');
        const routesLeftStr = window.localStorage.getItem(SUPPRESS_ROUTES_LEFT_KEY);
        if (!supAt || routesLeftStr == null) return false;
        const routesLeft = Number(routesLeftStr);
        if (routesLeft <= 0) {
          clearSuppress();
          return false;
        }
        if (Date.now() - supAt >= RESHOW_AFTER_MS) {
          clearSuppress();
          return false;
        }
        return true;
      } catch {
        return false;
      }
    }

    function scheduleTimeFallbackReShow() {
      try {
        const supAt = Number(window.localStorage.getItem(SUPPRESS_AT_KEY) || '0');
        if (!supAt) return;
        const remaining = Math.max(0, RESHOW_AFTER_MS - (Date.now() - supAt));
        timeFallbackTimer = setTimeout(() => {
          if (cancelled) return;
          clearSuppress();
          setExpanded(false);
          setVisible(true);
        }, remaining + 250);
      } catch {}
    }

    if (isSuppressed()) {
      setVisible(false);
      scheduleTimeFallbackReShow();
      return () => {
        cancelled = true;
        if (autoCollapseTimer) clearTimeout(autoCollapseTimer);
        if (timeFallbackTimer) clearTimeout(timeFallbackTimer);
      };
    }

    const expandedBefore = window.localStorage.getItem(EXPAND_KEY) === '1';
    if (!expandedBefore) {
      const show = setTimeout(() => {
        if (cancelled) return;
        setVisible(true);
        setExpanded(true);
        try {
          window.localStorage.setItem(EXPAND_KEY, '1');
        } catch {}
        autoCollapseTimer = setTimeout(() => {
          if (!cancelled) setExpanded(false);
        }, 8000);
      }, 1500);
      return () => {
        cancelled = true;
        clearTimeout(show);
        if (autoCollapseTimer) clearTimeout(autoCollapseTimer);
        if (timeFallbackTimer) clearTimeout(timeFallbackTimer);
      };
    } else {
      const show = setTimeout(() => {
        if (cancelled) return;
        setVisible(true);
      }, 2500);
      return () => {
        cancelled = true;
        clearTimeout(show);
        if (autoCollapseTimer) clearTimeout(autoCollapseTimer);
        if (timeFallbackTimer) clearTimeout(timeFallbackTimer);
      };
    }
  }, [pathname, isCountableRoute]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setExpanded(false);

    if (!isCountableRoute) return;
    try {
      const routesLeftStr = window.localStorage.getItem(SUPPRESS_ROUTES_LEFT_KEY);
      if (routesLeftStr == null) return;
      const routesLeft = Number(routesLeftStr);
      if (Number.isNaN(routesLeft)) return;
      const next = Math.max(0, routesLeft - 1);
      if (next <= 0) {
        window.localStorage.removeItem(SUPPRESS_AT_KEY);
        window.localStorage.removeItem(SUPPRESS_ROUTES_LEFT_KEY);
        setVisible(true);
        setExpanded(false);
      } else {
        window.localStorage.setItem(SUPPRESS_ROUTES_LEFT_KEY, String(next));
      }
    } catch {}
  }, [pathname, isCountableRoute]);

  const skip = !pathname || SKIP_PATH_PREFIXES.some((p) => pathname.startsWith(p));
  if (skip) return null;

  const closeTab = () => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(SUPPRESS_AT_KEY, String(Date.now()));
        window.localStorage.setItem(SUPPRESS_ROUTES_LEFT_KEY, String(RESHOW_AFTER_ROUTES));
      } catch {}
    }
    setVisible(false);
  };

  if (!visible) return null;

  if (!expanded) {
    return (
      <div className="fixed bottom-24 left-3 z-[72] sm:left-5 sm:bottom-28 pointer-events-none">
        <div className="pointer-events-auto relative">
          <span
            className="pointer-events-none absolute -inset-2 rounded-[1.4rem] bg-gradient-to-br from-rose-400/30 via-amber-300/30 to-violet-400/30 blur-xl"
            aria-hidden
          />
          <button
            type="button"
            aria-label="Fill in the Oct 2026 survey to join our live sessions and activities"
            title="Live Sessions — Oct 2026 Survey"
            onClick={() => setExpanded(true)}
            className="relative flex items-center gap-2 rounded-[1.4rem] border border-white/70 bg-gradient-to-br from-rose-500 via-fuchsia-600 to-violet-700 px-3.5 py-3 text-white shadow-[0_16px_40px_rgba(139,92,246,0.45)] ring-1 ring-white/20 hover:scale-[1.02] active:scale-[0.98] transition"
          >
            <span className="pointer-events-none absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-80" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-amber-400 ring-2 ring-white" />
            </span>
            <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
              <span className="absolute inset-0 rounded-full bg-white/10 animate-pulse" />
              <CalendarCheck strokeWidth={2.3} className="relative h-5 w-5 text-white" />
            </span>
            <span className="flex flex-col items-start leading-tight">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-[1px] text-[9px] font-black uppercase tracking-widest">
                <Sparkles className="h-3 w-3 text-amber-200" strokeWidth={2.5} />
                New · Oct 2026
              </span>
              <span className="text-[13px] font-black text-white">
                Live Sessions
              </span>
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-24 left-3 z-[72] sm:left-5 sm:bottom-28 sm:w-[20.5rem] w-[calc(100%-1.5rem)] pointer-events-none">
      <div className="pointer-events-auto relative">
        <span
          className="pointer-events-none absolute -inset-2 rounded-3xl bg-gradient-to-br from-rose-400/25 via-amber-300/25 to-violet-400/25 blur-2xl"
          aria-hidden
        />
        <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-rose-500 via-fuchsia-600 to-violet-700 shadow-[0_22px_50px_rgba(109,40,217,0.55)] ring-1 ring-white/15">
          <div className="absolute inset-0 opacity-40 mix-blend-overlay bg-[radial-gradient(circle_at_20%_0%,rgba(253,224,71,0.55),transparent_45%),radial-gradient(circle_at_100%_60%,rgba(196,181,253,0.45),transparent_55%)]" aria-hidden />

          <div className="relative p-4 sm:p-5 text-white">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                  <span className="absolute inset-0 rounded-2xl bg-white/10 animate-pulse" />
                  <CalendarCheck strokeWidth={2.3} className="relative h-6 w-6 text-amber-100" />
                </div>
                <div className="leading-tight">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 ring-1 ring-white/15 px-2 py-[2px] text-[10px] font-black uppercase tracking-[0.18em] text-amber-100">
                    <Sparkles className="h-3 w-3 text-amber-200" strokeWidth={2.5} />
                    New · Oct 2026
                  </span>
                  <div className="mt-1 text-[15px] font-black">
                    Join Live Sessions
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={closeTab}
                aria-label="Dismiss survey tab"
                className="shrink-0 -mr-1 -mt-1 rounded-full p-1.5 text-white/70 hover:text-white hover:bg-white/15 transition"
              >
                <X size={16} strokeWidth={2.4} />
              </button>
            </div>

            <p className="relative mt-3 text-[13px] leading-relaxed text-white/90">
              Fill in this short survey to join our <span className="font-extrabold text-amber-100">Live sessions</span>{' '}
              and <span className="font-extrabold text-amber-100">activities</span> with other kids in Kids Zone!
            </p>

            <div className="relative mt-4 space-y-2">
              <a
                href={SURVEY_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeTab}
                className="group flex items-center justify-center gap-2 w-full rounded-2xl bg-white px-4 py-3 text-[13px] font-black text-violet-800 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-rose-100 to-violet-100 text-rose-600">
                  <MessageCircle className="h-4 w-4" strokeWidth={2.4} />
                </span>
                Fill in the survey
                <ExternalLink className="h-4 w-4 -mr-0.5 transition group-hover:translate-x-0.5" strokeWidth={2.3} />
              </a>

              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-[11px] font-bold text-white/80 hover:bg-white/10 transition"
              >
                ← Minimize tab
              </button>
            </div>

            <div className="relative mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-white/75">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5">
                🕌 Halaqa
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5">
                🎮 Play &amp; Learn
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5">
                🏆 Competitions
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5">
                🎁 Prizes
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
