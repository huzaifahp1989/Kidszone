'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Modal } from './Modal';
import { Button } from './Button';
import { AnnouncementImageSlideshow } from './AnnouncementImageSlideshow';
import { getAnnouncementSlides } from '@/lib/announcement-images';
import { canShowSessionPopup, markSessionPopupShown } from '@/lib/popup-session-cap';

type Announcement = {
  id: string;
  text: string;
  bg_color: string;
  image_url?: string | null;
  image_urls?: string[] | null;
  slide_interval_seconds?: number;
  popup_delay_seconds?: number;
  popup_repeat_minutes?: number;
};

export function SiteAnnouncementPopup() {
  const pathname = usePathname();
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!announcements.length) return;
    const current = announcements[currentIndex];
    if (!current) return;

    const delaySeconds = Math.max(0, Number(current.popup_delay_seconds || 0));
    const timer = window.setTimeout(() => {
      if (!canShowSessionPopup('announcement')) return;
      setOpen(true);
      markSessionPopupShown('announcement');
    }, delaySeconds * 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [announcements, currentIndex]);

  React.useEffect(() => {
    const path = pathname || '/';
    let mounted = true;

    fetch(`/api/announcements/active?mode=popup&path=${encodeURIComponent(path)}`, {
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then(({ announcements }) => {
        if (!mounted) return;
        const rows: Announcement[] = Array.isArray(announcements) ? announcements : [];
        if (!rows.length) {
          setAnnouncements([]);
          setCurrentIndex(0);
          setOpen(false);
          return;
        }

        const now = Date.now();
        const eligible = rows.filter((item) => {
          const lastShownKey = `site-announcement-popup-last:${item.id}:${path}`;
          const lastShownRaw = typeof window !== 'undefined' ? window.localStorage.getItem(lastShownKey) : null;
          const lastShown = Number(lastShownRaw || 0);
          const repeatMinutes = Math.max(1, Number(item.popup_repeat_minutes || 1440));
          const cooldownMs = repeatMinutes * 60 * 1000;
          if (!lastShown || !Number.isFinite(lastShown)) return true;
          return now - lastShown >= cooldownMs;
        });

        setAnnouncements(eligible);
        setCurrentIndex(0);
        setOpen(false);
      })
      .catch(() => {
        if (!mounted) return;
        setAnnouncements([]);
        setCurrentIndex(0);
        setOpen(false);
      });

    return () => {
      mounted = false;
    };
  }, [pathname]);

  const closePopup = () => {
    const announcement = announcements[currentIndex];
    if (announcement?.id && typeof window !== 'undefined') {
      const path = pathname || '/';
      window.localStorage.setItem(`site-announcement-popup-last:${announcement.id}:${path}`, String(Date.now()));
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex < announcements.length) {
      setCurrentIndex(nextIndex);
      setOpen(true);
      return;
    }

    setOpen(false);
  };

  if (pathname.startsWith('/admin')) return null;
  const announcement = announcements[currentIndex] || null;
  if (!announcement) return null;

  const slides = getAnnouncementSlides(announcement);
  const hasText = Boolean(announcement.text?.trim());
  const title = slides.length > 0 && !hasText ? 'Announcement' : 'Important Message';

  return (
    <Modal isOpen={open} onClose={closePopup} title={title} size="lg">
      <div className="space-y-4 text-slate-700">
        {slides.length > 0 && (
          <AnnouncementImageSlideshow
            slides={slides}
            intervalSeconds={announcement.slide_interval_seconds ?? 5}
            alt={hasText ? announcement.text.slice(0, 120) : 'Site announcement'}
          />
        )}

        {hasText && (
          <div className="rounded-xl border border-black/10 p-4" style={{ backgroundColor: announcement.bg_color }}>
            <p className="whitespace-pre-wrap font-semibold text-white">{announcement.text}</p>
          </div>
        )}

        <Button variant="primary" className="w-full" onClick={closePopup}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
