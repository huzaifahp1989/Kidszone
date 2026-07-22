'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

type Announcement = {
  id: string;
  text: string;
  bg_color: string; // hex like #0f766e
  display_mode?: 'inline' | 'popup' | 'bar';
  target_paths?: string[];
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
      {announcements.map((announcement) => (
        <div
          key={announcement.id}
          className="w-full border-b border-black/10"
          style={{ backgroundColor: announcement.bg_color }}
        >
          <div className="max-w-6xl mx-auto py-3 px-4">
            <p className="text-white text-sm sm:text-base font-semibold text-center">
              {announcement.text}
            </p>
          </div>
        </div>
      ))}
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
      {announcements.map((announcement) => (
        <div key={announcement.id} className="w-full border-b border-black/10" style={{ backgroundColor: announcement.bg_color }}>
          <div className="max-w-6xl mx-auto py-3 px-4">
            <p className="text-white text-sm sm:text-base font-semibold text-center">{announcement.text}</p>
          </div>
        </div>
      ))}
    </>
  );
}
