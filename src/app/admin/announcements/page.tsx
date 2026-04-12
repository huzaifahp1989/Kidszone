'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components';

type Announcement = {
  id: string;
  text: string;
  bg_color: string;
  active: boolean;
  created_at: string;
};

export default function AdminAnnouncements() {
  const router = useRouter();
  const [text, setText] = React.useState('');
  const [color, setColor] = React.useState('#4f46e5');
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const auth = localStorage.getItem('admin_auth');
    if (auth !== 'true') {
      router.push('/admin/login');
      return;
    }
    loadAnnouncements();
  }, [router]);

  const loadAnnouncements = async () => {
    try {
      const res = await fetch('/api/admin/announcements', {
        headers: { 'x-admin-auth': 'true' },
      });
      const data = await res.json();
      if (res.ok) setAnnouncements(data.announcements || []);
    } catch {
      /* ignore */
    }
  };

  const createAnnouncement = async (activate: boolean) => {
    if (!text.trim()) {
      alert('Please enter announcement text');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-auth': 'true',
        },
        body: JSON.stringify({ text, bg_color: color, active: activate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setText('');
      setAnnouncements([data.announcement, ...announcements]);
      alert(activate ? 'Announcement created and activated' : 'Announcement saved');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const setActive = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-auth': 'true',
        },
        body: JSON.stringify({ id, active: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to activate');
      setAnnouncements(announcements.map(a => ({ ...a, active: a.id === id })));
      alert('Activated');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-islamic-light to-white py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow p-6 border border-slate-200">
          <h1 className="text-2xl font-bold mb-4">Site Announcement</h1>
          <label className="block text-sm font-medium text-slate-700 mb-1">Announcement Text</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="Type the message to display across all pages..."
          />
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Background Color</label>
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="w-16 h-10 p-0 border border-slate-300 rounded cursor-pointer"
              aria-label="Background color"
            />
          </div>
          <div className="flex gap-2 mt-6">
            <Button onClick={() => createAnnouncement(false)} disabled={loading}>
              Save Draft
            </Button>
            <Button onClick={() => createAnnouncement(true)} disabled={loading}>
              Save & Activate
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 border border-slate-200">
          <h2 className="text-xl font-bold mb-4">Recent Announcements</h2>
          <div className="space-y-3">
            {announcements.map(a => (
              <div
                key={a.id}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200"
              >
                <div className="flex-1">
                  <div className="text-sm font-semibold">{a.text}</div>
                  <div className="text-xs text-slate-500">
                    {new Date(a.created_at).toLocaleString()} •{' '}
                    <span className="inline-block w-3 h-3 rounded-sm align-middle mr-1" style={{ backgroundColor: a.bg_color }} />
                    {a.bg_color} {a.active ? '• Active' : ''}
                  </div>
                </div>
                {!a.active && (
                  <Button variant="outline" onClick={() => setActive(a.id)} disabled={loading}>
                    Activate
                  </Button>
                )}
              </div>
            ))}
            {announcements.length === 0 && (
              <p className="text-sm text-slate-500">No announcements yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
