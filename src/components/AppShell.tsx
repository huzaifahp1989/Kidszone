"use client";

import React, { Suspense, useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MobileBottomNav } from './MobileBottomNav';
import { AnnouncementBar, InlineAnnouncementBelowSlider, OctoberHadithQuizBanner } from '@/components/AnnouncementBar';
import { HijriDateBanner } from '@/components/HijriDateBanner';
import { PromoSlideshow } from '@/components/PromoSlideshow';
import { ScrollingTicker } from '@/components/ScrollingTicker';
import { VisitorCounter } from '@/components/VisitorCounter';
import { useAuth } from '@/lib/auth-context';
import { isTestModeEmail } from '@/lib/test-mode';
import { PageTransition } from '@/components/PageTransition';
import { PointsProgressProvider } from '@/lib/points-progress-context';
import { DailyPointsBar } from '@/components/DailyPointsBar';
import { PointsProgressPopup } from '@/components/PointsProgressPopup';
import { HadithQuizRetryPopup } from '@/components/HadithQuizRetryPopup';
import { EnablePushPrompt } from '@/components/EnablePushPrompt';
import { FeatureSpotlightCarousel } from '@/components/FeatureSpotlightCarousel';
import { LIVE_APP_URL } from '@/lib/app-url';

const Navbar = dynamic(() => import('./Navbar').then(m => m.Navbar), { ssr: false });
const OneSignalProvider = dynamic(
  () => import('@/components/OneSignalProvider').then(m => m.OneSignalProvider),
  { ssr: false }
);
const PushOpenTracker = dynamic(
  () => import('@/components/PushOpenTracker').then(m => m.PushOpenTracker),
  { ssr: false }
);
const RADIO_SRC = "https://a4.asurahosting.com:7820/radio.mp3";

function GlobalRadioBanner() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [mounted, setMounted] = useState(false);

  const togglePlay = () => {
    const a = audioRef.current; if (!a) return;
    if (a.paused) {
      setIsBuffering(true);
      const p = a.play();
      if (p && p.catch) p.catch(() => setIsBuffering(false));
    } else {
      a.pause();
      setIsPlaying(false);
      setIsBuffering(false);
    }
  };
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    const a = audioRef.current; if (!a) return;
    const onPlay = () => { setIsPlaying(true); setIsBuffering(false); };
    const onPause = () => { setIsPlaying(false); setIsBuffering(false); };
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onCanPlay = () => setIsBuffering(false);
    const onEnded = () => { setIsPlaying(false); setIsBuffering(false); };
    const onVolume = () => { setIsMuted(a.muted); setVolume(a.volume); };
    a.addEventListener("play", onPlay);
    a.addEventListener("playing", onPlaying);
    a.addEventListener("pause", onPause);
    a.addEventListener("waiting", onWaiting);
    a.addEventListener("canplay", onCanPlay);
    a.addEventListener("ended", onEnded);
    a.addEventListener("volumechange", onVolume);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("playing", onPlaying);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("waiting", onWaiting);
      a.removeEventListener("canplay", onCanPlay);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("volumechange", onVolume);
    };
  }, []);

  return (
    <>
      <audio
        ref={audioRef}
        src={RADIO_SRC}
        crossOrigin="anonymous"
        preload="none"
      />
      <div className="w-full border-b border-white/20 bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 text-white shadow-sm">
        <div className="mx-auto max-w-7xl px-3 sm:px-5 md:px-8 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-red-500 ring-2 ring-white/70" />
            </span>
            <span className="font-extrabold uppercase tracking-[0.16em] text-[11px] sm:text-xs drop-shadow">
              LIVE
            </span>
            <span className="hidden sm:inline text-blue-100/90 text-xs sm:text-sm font-bold">
              Islam Media Central
            </span>
          </div>
          <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold bg-white/10 px-2 py-1 rounded-full ring-1 ring-white/15 shrink-0 max-w-xs truncate">
            <span className="truncate">Quran • Nasheeds • Reminders</span>
          </span>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {mounted && (
              <label className="hidden sm:inline-flex items-center gap-1.5 cursor-pointer opacity-95 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-white/90">
                  {isMuted || volume === 0 ? (
                    <>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <line x1="23" y1="9" x2="17" y2="15" />
                      <line x1="17" y1="9" x2="23" y2="15" />
                    </>
                  ) : (
                    <>
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </>
                  )}
                </svg>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const a = audioRef.current;
                    const v = Number(e.target.value);
                    if (a) { a.volume = v; a.muted = v === 0; }
                  }}
                  className="w-20 sm:w-24 accent-amber-300 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer"
                />
              </label>
            )}
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause live radio" : "Play Islam Media Central live radio"}
              title={isPlaying ? "Pause" : isBuffering ? "Connecting…" : "Play Live Radio"}
              disabled={isBuffering && !isPlaying}
              className="relative inline-flex items-center justify-center shrink-0
                         gap-1.5 sm:gap-2 rounded-full bg-white text-blue-700 font-extrabold
                         px-3 py-1.5 sm:px-4 sm:py-2 shadow-md ring-1 ring-black/5
                         hover:bg-amber-300 hover:text-blue-800 active:scale-[0.98]
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300
                         transition"
            >
              {isBuffering && !isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : isPlaying ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                  <span className="text-xs sm:text-sm leading-none">Pause</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5 translate-x-[1px]"><path d="M7 5.5v13a1 1 0 0 0 1.52.856l11-6.5a1 1 0 0 0 0-1.712l-11-6.5A1 1 0 0 0 7 5.5z" stroke="rgba(29,78,216,0.08)" /></svg>
                  <span className="text-xs sm:text-sm leading-none">Play</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function hasValidAge(age: unknown): boolean {
  const n = typeof age === 'number' ? age : Number(age);
  return Number.isFinite(n) && n >= 1 && n <= 120;
}

function hasValidCity(city: unknown): boolean {
  return typeof city === 'string' && city.trim().length >= 2;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const fallbackName = user?.email ? user.email.split('@')[0] : undefined;
  const isTestModeUser = isTestModeEmail(user?.email);
  const isSignedInHome = Boolean(user) && pathname === '/';

  // Migrate WebViews still parked on the stale Vercel project (old quiz JS).
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const host = window.location.hostname.toLowerCase();
    if (host !== 'islamic-kids-platform.vercel.app') return;
    const live = window.location.origin.replace(/\/$/, '') || LIVE_APP_URL.replace(/\/$/, '');
    if (new URL(live).host.toLowerCase() === host) return;
    window.location.replace(`${live}${window.location.pathname}${window.location.search}${window.location.hash}`);
  }, []);

  const hasValidName = React.useMemo(() => {
    const t = (profile?.name ?? '').trim();
    if (!t) return false;
    if (/^learner\b/i.test(t)) return false;
    if (/^user[-_][a-z0-9]+$/i.test(t)) return false;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) return false;
    return true;
  }, [profile?.name]);

  const needsAuthForThisRoute = React.useMemo(() => {
    if (pathname === '/hadith/quiz/october-2026') return false;
    const protectedPrefixes = ['/games', '/hadith', '/arabic', '/quran-quiz', '/quran-match'];
    return protectedPrefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  }, [pathname]);

  React.useEffect(() => {
    if (!needsAuthForThisRoute) return;
    if (loading) return;
    if (!user) {
      const msg = encodeURIComponent('Please sign in to play quizzes and games and earn points.');
      const next = encodeURIComponent(pathname || '/');
      router.replace(`/signin?message=${msg}&next=${next}`);
      return;
    }
    if (profile && !hasValidName && pathname !== '/profile' && !isTestModeUser) {
      const msg = encodeURIComponent('Please add your name to your profile before playing quizzes and games.');
      router.replace(`/profile?message=${msg}`);
      return;
    }
    if (profile && !hasValidAge(profile.age) && pathname !== '/profile' && !isTestModeUser) {
      const msg = encodeURIComponent('Please add your age to your profile so we can show the right activities.');
      router.replace(`/profile?message=${msg}`);
      return;
    }
    if (profile && !hasValidCity(profile.city) && pathname !== '/profile' && !isTestModeUser) {
      const msg = encodeURIComponent('Please add your city to your profile before playing quizzes and games.');
      router.replace(`/profile?message=${msg}`);
    }
  }, [needsAuthForThisRoute, loading, user, profile, hasValidName, pathname, router, isTestModeUser]);

  React.useEffect(() => {
    console.log('AppShell mounted, hydration successful');
  }, []);

  return (
    <PointsProgressProvider>
    <>
      <Navbar
        username={profile?.username || profile?.name || fallbackName}
        points={profile?.points}
        level={profile?.level}
        badges={profile?.badges}
        onLogout={user ? logout : undefined}
        loading={loading}
      />
      <FeatureSpotlightCarousel />
      {!pathname.startsWith('/admin') && <GlobalRadioBanner />}
      {!pathname.startsWith('/admin') && <HijriDateBanner />}
      <AnnouncementBar />
      {!pathname.startsWith('/admin') && <OctoberHadithQuizBanner />}
      {user && !pathname.startsWith('/admin') && (
        <div className="mx-auto max-w-7xl px-4 pt-2 sm:px-6">
          <DailyPointsBar compact />
        </div>
      )}
      {!isSignedInHome && <ScrollingTicker />}
      {!isSignedInHome && <PromoSlideshow />}
      <InlineAnnouncementBelowSlider />
      <OneSignalProvider />
      <Suspense fallback={null}>
        <PushOpenTracker />
      </Suspense>
      <PointsProgressPopup />
      {user && !pathname.startsWith('/admin') && <HadithQuizRetryPopup userId={user.id} />}
      {user && !pathname.startsWith('/admin') && <EnablePushPrompt />}
      <main className="app-shell-main min-h-screen pb-24 sm:pb-20 pattern-islamic">
        <div className="app-shell-backdrop" aria-hidden="true" />
        <div className="app-shell-grid" aria-hidden="true" />
        <div className="app-shell-aurora app-shell-aurora-left" aria-hidden="true" />
        <div className="app-shell-aurora app-shell-aurora-right" aria-hidden="true" />
        <div className="app-shell-aurora app-shell-aurora-bottom" aria-hidden="true" />
        <div className="app-shell-content">
          <div className="route-frame">
            <PageTransition routeKey={pathname || '/'}>
              <div className="global-page-frame">{children}</div>
            </PageTransition>
          </div>
        </div>
      </main>
      <footer className="mobile-tabbar-clearance relative mx-3 sm:mx-5 md:mx-8 mt-10 overflow-hidden rounded-[2rem] sm:rounded-t-[2rem] sm:rounded-b-none border border-teal-800/30 bg-gradient-to-br from-teal-900 via-teal-800 to-blue-900 text-white shadow-[0_-16px_40px_rgba(30,58,138,0.22)]">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.04%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-60" aria-hidden="true" />
        <div className="relative px-6 py-10 text-center sm:px-10">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-xl shadow-lg backdrop-blur-sm">
            🌙
          </div>
          <p className="font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">Kids Zone</p>
          <p className="mt-1 text-sm text-teal-100/90">Islamic learning for ages 5–14</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-teal-200/70">
            A fun, safe space to learn Quran, hadith, seerah, and more.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/guide"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              ⭐ How to earn points
            </Link>
            <Link
              href="/quiz"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              🧠 Daily Quiz
            </Link>
            <Link
              href="/leaderboard"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              🏆 Leaderboard
            </Link>
            <Link
              href="/feedback-survey"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              📝 Feedback
            </Link>
          </div>
          <div className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-6 py-3 backdrop-blur-sm">
            <VisitorCounter />
          </div>
        </div>
      </footer>
      <MobileBottomNav />
    </>
    </PointsProgressProvider>
  );
}
