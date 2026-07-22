'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components';
import { getAnnouncementSlides } from '@/lib/announcement-images';

type Announcement = {
  id: string;
  text: string;
  bg_color: string;
  active: boolean;
  display_mode: 'inline' | 'popup' | 'bar';
  target_paths: string[];
  popup_delay_seconds: number;
  popup_repeat_minutes: number;
  start_at: string | null;
  end_at: string | null;
  repeat_unit: 'always' | 'hours' | 'daily' | 'weekly' | 'monthly';
  repeat_every: number;
  show_for_hours: number;
  image_url?: string | null;
  image_urls?: string[] | null;
  slide_interval_seconds?: number;
  created_at: string;
};

const TARGET_PAGES = [
  { label: 'All pages', value: '*' },
  { label: 'Home', value: '/' },
  { label: 'Quiz', value: '/quiz' },
  { label: 'Games', value: '/games' },
  { label: 'Pledge', value: '/pledge' },
  { label: 'Leaderboard', value: '/leaderboard' },
  { label: 'Rewards', value: '/rewards' },
  { label: 'Tasks', value: '/tasks' },
  { label: 'Guide', value: '/guide' },
];

export default function AdminAnnouncements() {
  const router = useRouter();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [text, setText] = React.useState('');
  const [imageSlides, setImageSlides] = React.useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const [slideIntervalSeconds, setSlideIntervalSeconds] = React.useState(5);
  const [color, setColor] = React.useState('#0f766e');
  const [activeInForm, setActiveInForm] = React.useState(false);
  const [displayMode, setDisplayMode] = React.useState<'inline' | 'popup' | 'bar'>('inline');
  const [targetPaths, setTargetPaths] = React.useState<string[]>(['*']);
  const [popupDelaySeconds, setPopupDelaySeconds] = React.useState(0);
  const [popupRepeatMinutes, setPopupRepeatMinutes] = React.useState(1440);
  const [startAt, setStartAt] = React.useState('');
  const [endAt, setEndAt] = React.useState('');
  const [repeatUnit, setRepeatUnit] = React.useState<'always' | 'hours' | 'daily' | 'weekly' | 'monthly'>('always');
  const [repeatEvery, setRepeatEvery] = React.useState(1);
  const [showForHours, setShowForHours] = React.useState(24);
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);
  const [loading, setLoading] = React.useState(false);

  const toDatetimeLocal = (iso: string | null | undefined) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
  };

  const resetForm = () => {
    setEditingId(null);
    setText('');
    setImageSlides([]);
    setSlideIntervalSeconds(5);
    setColor('#0f766e');
    setActiveInForm(false);
    setDisplayMode('inline');
    setTargetPaths(['*']);
    setPopupDelaySeconds(0);
    setPopupRepeatMinutes(1440);
    setStartAt('');
    setEndAt('');
    setRepeatUnit('always');
    setRepeatEvery(1);
    setShowForHours(24);
  };

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

  const uploadImageFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'announcements');
    const res = await fetch('/api/admin/vouchers/upload', {
      method: 'POST',
      headers: { 'x-admin-auth': 'true' },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data.url as string;
  };

  const uploadSlides = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    setUploadingImage(true);
    try {
      const uploaded: string[] = [];
      for (const file of list) {
        uploaded.push(await uploadImageFile(file));
      }
      setImageSlides((prev) => [...prev, ...uploaded]);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const moveSlide = (index: number, direction: -1 | 1) => {
    setImageSlides((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeSlide = (index: number) => {
    setImageSlides((prev) => prev.filter((_, i) => i !== index));
  };

  const createAnnouncement = async (activate: boolean) => {
    if (!text.trim() && imageSlides.length === 0) {
      alert('Please enter announcement text or upload at least one image');
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
        body: JSON.stringify({
          text,
          bg_color: color,
          image_url: imageSlides[0] || null,
          image_urls: imageSlides,
          slide_interval_seconds: slideIntervalSeconds,
          active: activate,
          display_mode: displayMode,
          target_paths: targetPaths,
          popup_delay_seconds: popupDelaySeconds,
          popup_repeat_minutes: popupRepeatMinutes,
          start_at: startAt ? new Date(startAt).toISOString() : null,
          end_at: endAt ? new Date(endAt).toISOString() : null,
          repeat_unit: repeatUnit,
          repeat_every: repeatEvery,
          show_for_hours: showForHours,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      resetForm();
      setAnnouncements([data.announcement, ...announcements]);
      alert(activate ? 'Announcement created and activated' : 'Announcement saved');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setText(announcement.text || '');
    setImageSlides(getAnnouncementSlides(announcement));
    setSlideIntervalSeconds(Math.max(2, Number(announcement.slide_interval_seconds || 5)));
    setColor(announcement.bg_color || '#0f766e');
    setActiveInForm(Boolean(announcement.active));
    setDisplayMode(announcement.display_mode || 'inline');
    setTargetPaths(Array.isArray(announcement.target_paths) && announcement.target_paths.length > 0 ? announcement.target_paths : ['*']);
    setPopupDelaySeconds(Number(announcement.popup_delay_seconds || 0));
    setPopupRepeatMinutes(Number(announcement.popup_repeat_minutes || 1440));
    setStartAt(toDatetimeLocal(announcement.start_at));
    setEndAt(toDatetimeLocal(announcement.end_at));
    setRepeatUnit(announcement.repeat_unit || 'always');
    setRepeatEvery(Math.max(1, Number(announcement.repeat_every || 1)));
    setShowForHours(Math.max(1, Number(announcement.show_for_hours || 24)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateAnnouncement = async () => {
    if (!editingId) return;
    if (!text.trim() && imageSlides.length === 0) {
      alert('Please enter announcement text or upload at least one image');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-auth': 'true',
        },
        body: JSON.stringify({
          id: editingId,
          active: activeInForm,
          text,
          bg_color: color,
          image_url: imageSlides[0] || null,
          image_urls: imageSlides,
          slide_interval_seconds: slideIntervalSeconds,
          display_mode: displayMode,
          target_paths: targetPaths,
          popup_delay_seconds: popupDelaySeconds,
          popup_repeat_minutes: popupRepeatMinutes,
          start_at: startAt ? new Date(startAt).toISOString() : null,
          end_at: endAt ? new Date(endAt).toISOString() : null,
          repeat_unit: repeatUnit,
          repeat_every: repeatEvery,
          show_for_hours: showForHours,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');

      setAnnouncements(announcements.map((a) => (a.id === editingId ? data.announcement : a)));
      resetForm();
      alert('Announcement updated');
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
      setAnnouncements(announcements.map(a => (a.id === id ? { ...a, active: true } : a)));
      alert('Activated');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const setInactive = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-auth': 'true',
        },
        body: JSON.stringify({ id, active: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to deactivate');
      setAnnouncements(announcements.map(a => (a.id === id ? { ...a, active: false } : a)));
      alert('Deactivated');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteAnnouncement = async (announcement: Announcement) => {
    const preview = announcement.text?.trim() || '(Image popup)';
    if (!window.confirm(`Delete this announcement?\n\n"${preview.slice(0, 120)}${preview.length > 120 ? '…' : ''}"\n\nThis cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/announcements?id=${encodeURIComponent(announcement.id)}`, {
        method: 'DELETE',
        headers: { 'x-admin-auth': 'true' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');

      setAnnouncements(announcements.filter((a) => a.id !== announcement.id));
      if (editingId === announcement.id) resetForm();
      alert('Announcement deleted');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleTargetPath = (path: string) => {
    if (path === '*') {
      setTargetPaths(['*']);
      return;
    }

    const withoutAll = targetPaths.filter((p) => p !== '*');
    if (withoutAll.includes(path)) {
      const next = withoutAll.filter((p) => p !== path);
      setTargetPaths(next.length > 0 ? next : ['*']);
      return;
    }

    setTargetPaths([...withoutAll, path]);
  };

  const renderTargetLabel = (paths: string[] | null | undefined) => {
    if (!paths || paths.length === 0 || paths.includes('*')) return 'All pages';
    return paths.join(', ');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-islamic-light to-white py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow p-6 border border-slate-200">
          <h1 className="text-2xl font-bold mb-4">{editingId ? 'Edit Announcement' : 'Site Announcement'}</h1>
          <label className="block text-sm font-medium text-slate-700 mb-1">Announcement Text</label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-300 p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="Type your message here (optional if you add an image)..."
          />

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Popup slides (optional)</label>
            <p className="mb-3 text-xs text-slate-500">
              Add one or more images for popup mode. Multiple slides auto-rotate on the site. JPG, PNG, or WebP.
            </p>

            {imageSlides.length > 0 && (
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {imageSlides.map((url, index) => (
                  <div key={`${url}-${index}`} className="rounded-lg border border-slate-200 bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Slide ${index + 1}`} className="max-h-36 w-full rounded object-contain" />
                    <div className="mt-2 flex flex-wrap gap-1">
                      <button
                        type="button"
                        onClick={() => moveSlide(index, -1)}
                        disabled={index === 0}
                        className="rounded border border-slate-200 px-2 py-1 text-xs font-semibold disabled:opacity-40"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSlide(index, 1)}
                        disabled={index === imageSlides.length - 1}
                        className="rounded border border-slate-200 px-2 py-1 text-xs font-semibold disabled:opacity-40"
                      >
                        →
                      </button>
                      <span className="px-2 py-1 text-xs font-semibold text-slate-500">Slide {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeSlide(index)}
                        className="ml-auto rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-indigo-200 bg-white px-4 py-6 text-center hover:border-indigo-400">
              <span className="text-sm font-semibold text-indigo-700">
                {uploadingImage ? 'Uploading…' : imageSlides.length ? 'Add more slides' : 'Click to upload slides'}
              </span>
              <span className="mt-1 text-xs text-slate-500">Select one or multiple images</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                disabled={uploadingImage}
                onChange={(e) => {
                  const files = e.target.files;
                  if (files?.length) uploadSlides(files);
                  e.target.value = '';
                }}
              />
            </label>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Display Mode</label>
            <select
              value={displayMode}
              onChange={(e) => setDisplayMode(e.target.value as 'inline' | 'popup' | 'bar')}
              className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="inline">Inline (shows below slider)</option>
              <option value="popup">Popup modal</option>
              <option value="bar">Top announcement bar</option>
            </select>
          </div>
          <div className="mt-4">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700 font-medium">
              <input
                type="checkbox"
                checked={activeInForm}
                onChange={(e) => setActiveInForm(e.target.checked)}
                className="rounded border-slate-300"
              />
              Active
            </label>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Show On Pages</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TARGET_PAGES.map((page) => {
                const checked = targetPaths.includes(page.value);
                return (
                  <label key={page.value} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTargetPath(page.value)}
                      className="rounded border-slate-300"
                    />
                    <span>{page.label}</span>
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Inline messages appear directly below the homepage slider area on selected pages.
            </p>
          </div>

          {displayMode === 'popup' && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Popup delay (seconds)</label>
                <input
                  type="number"
                  min={0}
                  value={popupDelaySeconds}
                  onChange={(e) => setPopupDelaySeconds(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <p className="mt-1 text-xs text-slate-500">Wait before showing popup after page load.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Show again after (minutes)</label>
                <input
                  type="number"
                  min={1}
                  value={popupRepeatMinutes}
                  onChange={(e) => setPopupRepeatMinutes(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <p className="mt-1 text-xs text-slate-500">Prevents popup from appearing too frequently.</p>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Slide change speed (seconds)</label>
                <input
                  type="number"
                  min={2}
                  max={60}
                  value={slideIntervalSeconds}
                  onChange={(e) => setSlideIntervalSeconds(Math.max(2, Math.min(60, Number(e.target.value) || 5)))}
                  className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <p className="mt-1 text-xs text-slate-500">
                  How long each image shows before sliding to the next (only when you add 2+ slides).
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start date & time</label>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expiry date & time</label>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Repeat schedule</label>
              <select
                value={repeatUnit}
                onChange={(e) => setRepeatUnit(e.target.value as 'always' | 'hours' | 'daily' | 'weekly' | 'monthly')}
                className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="always">Always</option>
                <option value="hours">Every X hours</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Repeat every</label>
              <input
                type="number"
                min={1}
                disabled={repeatUnit === 'always'}
                value={repeatEvery}
                onChange={(e) => setRepeatEvery(Math.max(1, Number(e.target.value) || 1))}
                className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Show for (hours)</label>
              <input
                type="number"
                min={1}
                disabled={repeatUnit === 'always'}
                value={showForHours}
                onChange={(e) => setShowForHours(Math.max(1, Number(e.target.value) || 1))}
                className="w-full rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Example: Daily + Repeat every 1 + Show for 3 hours = visible for first 3 hours of each day after start time.
          </p>

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
            {editingId ? (
              <>
                <Button onClick={updateAnnouncement} disabled={loading}>
                  Update Announcement
                </Button>
                <Button variant="outline" onClick={resetForm} disabled={loading}>
                  Cancel Edit
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => createAnnouncement(false)} disabled={loading}>
                  Save Draft
                </Button>
                <Button onClick={() => createAnnouncement(true)} disabled={loading}>
                  Save & Activate
                </Button>
              </>
            )}
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
                <div className="flex flex-1 items-start gap-3">
                  {getAnnouncementSlides(a)[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getAnnouncementSlides(a)[0]}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 object-cover"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{a.text || '(Image popup)'}</div>
                  <div className="text-xs text-slate-500">
                    {new Date(a.created_at).toLocaleString()} •{' '}
                    <span className="inline-block w-3 h-3 rounded-sm align-middle mr-1" style={{ backgroundColor: a.bg_color }} />
                    {a.bg_color} • {a.display_mode} • {renderTargetLabel(a.target_paths)}
                    {a.display_mode === 'popup' ? ` • Delay ${a.popup_delay_seconds || 0}s • Repeat ${a.popup_repeat_minutes || 1440}m` : ''}
                    {a.start_at ? ` • Start ${new Date(a.start_at).toLocaleString()}` : ''}
                    {a.end_at ? ` • End ${new Date(a.end_at).toLocaleString()}` : ''}
                    {a.repeat_unit && a.repeat_unit !== 'always' ? ` • ${a.repeat_unit} every ${a.repeat_every || 1} • show ${a.show_for_hours || 24}h` : ''}
                    {a.active ? ' • Active' : ''}
                    {getAnnouncementSlides(a).length > 0
                      ? ` • ${getAnnouncementSlides(a).length} slide${getAnnouncementSlides(a).length === 1 ? '' : 's'}`
                      : ''}
                  </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button variant="outline" onClick={() => startEdit(a)} disabled={loading}>
                    Edit
                  </Button>
                  {!a.active ? (
                    <Button variant="outline" onClick={() => setActive(a.id)} disabled={loading}>
                      Activate
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => setInactive(a.id)} disabled={loading}>
                      Deactivate
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => deleteAnnouncement(a)}
                    disabled={loading}
                    className="border-red-200 text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                </div>
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
