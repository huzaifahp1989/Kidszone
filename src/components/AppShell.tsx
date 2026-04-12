"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { Navbar } from './Navbar';
import { MobileBottomNav } from './MobileBottomNav';
import { AnnouncementBar } from '@/components/AnnouncementBar';
import { VisitorCounter } from '@/components/VisitorCounter';
import { useAuth } from '@/lib/auth-context';

const WinnerPopup = dynamic(() => import('@/components/WinnerPopup').then(m => m.WinnerPopup), { ssr: false });
const FeedbackBanner = dynamic(() => import('@/components/FeedbackBanner').then(m => m.FeedbackBanner), { ssr: false });

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const fallbackName = user?.email ? user.email.split('@')[0] : undefined;

  const hasValidName = React.useMemo(() => {
    const t = (profile?.name ?? '').trim();
    if (!t) return false;
    if (/^learner\b/i.test(t)) return false;
    if (/^user[-_][a-z0-9]+$/i.test(t)) return false;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{4}-[0-9a-f]{12}$/i.test(t)) return false;
    return true;
  }, [profile?.name]);

  const needsAuthForThisRoute = React.useMemo(() => {
    const protectedPrefixes = ['/games', '/hadith', '/quran-quiz', '/quran-match'];
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
    if (profile && !hasValidName && pathname !== '/profile') {
      const msg = encodeURIComponent('Please add your name to your profile before playing quizzes and games.');
      router.replace(`/profile?message=${msg}`);
    }
  }, [needsAuthForThisRoute, loading, user, profile, hasValidName, pathname, router]);

  React.useEffect(() => {
    console.log('AppShell mounted, hydration successful');
  }, []);

  return (
    <>
      <Navbar
        username={profile?.name ?? fallbackName}
        points={profile?.points}
        level={profile?.level}
        badges={profile?.badges}
        onLogout={user ? logout : undefined}
      />
      <AnnouncementBar />
      <FeedbackBanner />
      <main className="min-h-screen pb-24 md:pb-12">{children}</main>
      <footer className="bg-gradient-to-r from-kids-secondary to-kids-primary text-white p-8 text-center text-sm mt-12 rounded-t-3xl shadow-kids-hover mb-20 md:mb-0">
        <p className="font-bold text-lg mb-2">&copy; 2025 Islamic Kids Learning Platform</p>
        <p className="opacity-90">A fun, safe, and educational Islamic learning platform for children aged 5-14</p>
        <p className="text-xs opacity-75 mt-4">v1.0.3 • For educational purposes</p>
        <div className="mt-6 bg-white/10 inline-block px-6 py-3 rounded-2xl">
          <VisitorCounter />
        </div>
      </footer>
      <MobileBottomNav />
      <WinnerPopup />
    </>
  );
}
