'use client';

import React from 'react';

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

  if (!announcement) return null;

  return (
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
  );
}
