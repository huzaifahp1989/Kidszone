'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnnouncementImageSlideshow } from './AnnouncementImageSlideshow';
import { getAnnouncementSlides } from '@/lib/announcement-images';
import { getAnnouncementImageFallbackUrl } from '@/lib/announcement-image-fallback';
import { OCTOBER_HADITH_QUIZ_LAST_DAY } from '@/lib/october-hadith-quiz';

function AnnouncementBarImage({ src }: { src: string }) {
  const [currentSrc, setCurrentSrc] = React.useState(src);

  React.useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={currentSrc}
      alt=""
      className="h-8 w-8 rounded object-cover shrink-0"
      onError={(e) => {
        const fallback = getAnnouncementImageFallbackUrl(src);
        if (fallback && fallback !== currentSrc) {
          setCurrentSrc(fallback);
          return;
        }
        const target = e.currentTarget as HTMLImageElement;
        target.style.display = 'none';
      }}
    />
  );
}

type Announcement = {
  id: string;
  text: string;
  bg_color: string; // hex like #4f46e5
  display_mode?: 'inline' | 'popup' | 'bar';
  target_paths?: string[];
  image_url?: string | null;
  image_urls?: string[] | null;
  slide_interval_seconds?: number;
  created_at: string;
};

export function AnnouncementBar() {
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
  const pathname = usePathname();

  React.useEffect(() => {
    let mounted = true;
    const path = pathname || '/';
    fetch(`/api/announcements/active?mode=bar&path=${encodeURIComponent(path)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(({ announcements }) => {
        if (!mounted) return;
        setAnnouncements(Array.isArray(announcements) ? announcements : []);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      mounted = false;
    };
  }, [pathname]);

  if (!announcements.length) return null;

  return (
    <>
      {announcements.map((announcement) => {
        const slides = getAnnouncementSlides(announcement);
        return (
          <div
            key={announcement.id}
            className="w-full border-b border-black/10"
            style={{ backgroundColor: announcement.bg_color }}
          >
            <div className="max-w-6xl mx-auto py-3 px-4 flex items-center justify-center gap-3">
              {slides[0] && (
                <AnnouncementBarImage src={slides[0]} />
              )}
              <p className="text-white text-sm sm:text-base font-semibold text-center">
                {announcement.text}
              </p>
            </div>
          </div>
        );
      })}
    </>
  );
}

export function InlineAnnouncementBelowSlider() {
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
  const pathname = usePathname();

  React.useEffect(() => {
    let mounted = true;
    const path = pathname || '/';
    fetch(`/api/announcements/active?mode=inline&path=${encodeURIComponent(path)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(({ announcements }) => {
        if (!mounted) return;
        setAnnouncements(Array.isArray(announcements) ? announcements : []);
      })
      .catch(() => {
        /* ignore */
      });

    return () => {
      mounted = false;
    };
  }, [pathname]);

  if (!announcements.length) return null;

  return (
    <>
      {announcements.map((announcement) => {
        const slides = getAnnouncementSlides(announcement);
        const hasText = Boolean(announcement.text?.trim());
        return (
          <div key={announcement.id} className="w-full border-b border-black/10" style={{ backgroundColor: announcement.bg_color }}>
            <div className="max-w-6xl mx-auto py-3 px-4 space-y-3">
              {slides.length > 0 && (
                <AnnouncementImageSlideshow
                  slides={slides}
                  intervalSeconds={announcement.slide_interval_seconds ?? 5}
                  alt={hasText ? announcement.text.slice(0, 120) : 'Site announcement'}
                />
              )}
              {hasText && (
                <p className="text-white text-sm sm:text-base font-semibold text-center">{announcement.text}</p>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}

export function OctoberHadithQuizBanner() {
  const today = new Date().toISOString().slice(0, 10);
  if (today < '2026-10-01' || today > OCTOBER_HADITH_QUIZ_LAST_DAY) return null;

  return (
    <div className="w-full border-b border-emerald-950/10 bg-gradient-to-r from-emerald-700 to-teal-700 text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-2 px-4 py-2.5 text-center sm:flex-row sm:gap-4">
        <p className="text-sm font-bold sm:text-base">
          ✨ What&apos;s new: Take the October Hadith Quiz — 10 written answers, reviewed by our admin team.
        </p>
        <Link
          href="/hadith/quiz/october-2026"
          className="shrink-0 rounded-full bg-white px-4 py-1.5 text-sm font-extrabold text-emerald-800 transition hover:bg-emerald-50"
        >
          Take the quiz · ends 30 October
        </Link>
      </div>
    </div>
  );
}
