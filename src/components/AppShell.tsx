"use client";

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MobileBottomNav } from './MobileBottomNav';
import { AnnouncementBar, InlineAnnouncementBelowSlider } from '@/components/AnnouncementBar';
import { PromoSlideshow } from '@/components/PromoSlideshow';
import { ScrollingTicker } from '@/components/ScrollingTicker';
import { VisitorCounter } from '@/components/VisitorCounter';
import { useAuth } from '@/lib/auth-context';
import { isTestModeEmail } from '@/lib/test-mode';
import { PageTransition } from '@/components/PageTransition';
import { PointsProgressProvider } from '@/lib/points-progress-context';
import { DailyPointsBar } from '@/components/DailyPointsBar';

const PointsProgressPopup = dynamic(
  () => import('@/components/PointsProgressPopup').then(m => m.PointsProgressPopup),
  { ssr: false }
);

const FeedbackBanner = dynamic(() => import('@/components/FeedbackBanner').then(m => m.FeedbackBanner), { ssr: false });
const Navbar = dynamic(() => import('./Navbar').then(m => m.Navbar), { ssr: false });
const SiteAnnouncementPopup = dynamic(
  () => import('@/components/SiteAnnouncementPopup').then(m => m.SiteAnnouncementPopup),
  { ssr: false }
);
const PushNotificationInit = dynamic(
  () => import('@/components/PushNotificationInit').then(m => m.PushNotificationInit),
  { ssr: false }
);
const OneSignalProvider = dynamic(
  () => import('@/components/OneSignalProvider').then(m => m.OneSignalProvider),
  { ssr: false }
);
const EnablePushPrompt = dynamic(
  () => import('@/components/EnablePushPrompt').then(m => m.EnablePushPrompt),
  { ssr: false }
);
const PushOpenTracker = dynamic(
  () => import('@/components/PushOpenTracker').then(m => m.PushOpenTracker),
  { ssr: false }
);
const HomeChatPopup = dynamic(
  () => import('@/components/HomeChatPopup').then(m => m.HomeChatPopup),
  { ssr: false }
);
const WinnerWonPopup = dynamic(
  () => import('@/components/WinnerWonPopup').then(m => m.WinnerWonPopup),
  { ssr: false }
);
const WhatsNewFeaturesPopup = dynamic(
  () => import('@/components/WhatsNewFeaturesPopup').then(m => m.WhatsNewFeaturesPopup),
  { ssr: false }
);
const AgeRequiredGate = dynamic(
  () => import('@/components/AgeRequiredGate').then(m => m.AgeRequiredGate),
  { ssr: false }
);

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

  const hasValidName = React.useMemo(() => {
    const t = (profile?.name ?? '').trim();
    if (!t) return false;
    if (/^learner\b/i.test(t)) return false;
    if (/^user[-_][a-z0-9]+$/i.test(t)) return false;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) return false;
    return true;
  }, [profile?.name]);

  const needsAuthForThisRoute = React.useMemo(() => {
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

  const showChatPopup = !pathname.startsWith('/admin') && pathname !== '/chat';

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
      <AnnouncementBar />
      {user && !pathname.startsWith('/admin') && (
        <div className="mx-auto max-w-7xl px-4 pt-2 sm:px-6">
          <DailyPointsBar compact />
        </div>
      )}
      {!isSignedInHome && <ScrollingTicker />}
      {!isSignedInHome && <PromoSlideshow />}
      <InlineAnnouncementBelowSlider />
      <FeedbackBanner />
      <SiteAnnouncementPopup />
      <OneSignalProvider />
      <PushNotificationInit />
      <Suspense fallback={null}>
        <PushOpenTracker />
      </Suspense>
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
      <footer className="mobile-tabbar-clearance relative mx-3 sm:mx-5 md:mx-8 mt-10 overflow-hidden rounded-[2rem] sm:rounded-t-[2rem] sm:rounded-b-none border border-violet-800/25 bg-gradient-to-br from-violet-950 via-violet-900 to-indigo-950 text-white shadow-[0_-16px_40px_rgba(76,29,149,0.25)]">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.04%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-60" aria-hidden="true" />
        <div className="relative px-6 py-10 text-center sm:px-10">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-xl shadow-lg backdrop-blur-sm">
            🌙
          </div>
          <p className="font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">Kids Zone</p>
          <p className="mt-1 text-sm text-violet-200/90">Islamic learning for ages 5–14</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-violet-300/70">
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
          </div>
          <div className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-6 py-3 backdrop-blur-sm">
            <VisitorCounter />
          </div>
        </div>
      </footer>
      <MobileBottomNav />
      {showChatPopup && <HomeChatPopup />}
      {user && !pathname.startsWith('/admin') && <WinnerWonPopup />}
      {!pathname.startsWith('/admin') && <WhatsNewFeaturesPopup />}
      <AgeRequiredGate />
      <PointsProgressPopup />
    </>
    </PointsProgressProvider>
  );
}
