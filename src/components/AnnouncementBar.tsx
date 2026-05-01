'use client';

import React from 'react';
import Link from 'next/link';

type Announcement = {
  id: string;
  text: string;
  bg_color: string; // hex like #4f46e5
  created_at: string;
};

export function AnnouncementBar() {
  const [announcement, setAnnouncement] = React.useState<Announcement | null>(null);

  React.useEffect(() => {
    let mounted = true;
    fetch('/api/announcements/active', { cache: 'no-store' })
      .then(r => r.json())
      .then(({ announcement }) => {
        if (!mounted) return;
        setAnnouncement(announcement);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      {/* Permanent site-wide notice */}
      <div className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 border-b border-emerald-700">
        <div className="max-w-6xl mx-auto py-2 px-4 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3 text-center">
          <span className="text-white text-sm font-semibold">
            <Link href="/rewards" className="underline underline-offset-2 hover:text-emerald-100 transition-colors">
              Check your rewards, more ways of earning points and important announcements
            </Link>
          </span>
          <span className="hidden sm:inline text-emerald-300">•</span>
          <span className="text-white text-sm font-semibold">
            🏆 Please check the{' '}
            <Link href="/leaderboard" className="underline underline-offset-2 hover:text-emerald-100 transition-colors">
              leaderboard
            </Link>{' '}
            to see who is on top!
          </span>
          <span className="hidden sm:inline text-emerald-300">•</span>
          <a
            href="https://wa.me/447404644610"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white text-sm font-semibold hover:text-emerald-100 transition-colors"
          >
            💬 Any issues? WhatsApp us on{' '}
            <span className="font-bold">07404 644610</span>
          </a>
        </div>
      </div>

      {/* Dynamic DB-sourced announcement (if any) */}
      {announcement && (
        <div
          className="w-full border-b border-black/10"
          style={{ backgroundColor: announcement.bg_color }}
        >
          <div className="max-w-6xl mx-auto py-3 px-4">
            <p className="text-white text-sm sm:text-base font-semibold text-center">
              {announcement.text}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
