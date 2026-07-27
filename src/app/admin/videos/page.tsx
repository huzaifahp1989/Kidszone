'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, PlayCircle, Trash2, VideoIcon } from 'lucide-react';

type VideoSourceType = 'youtube' | 'upload' | 'external';

type VideoRow = {
  id: string;
  title: string;
  description: string;
  source_type: VideoSourceType;
  video_url: string;
  youtube_video_id: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  points_reward: number;
  is_active: boolean;
  created_at: string | null;
};

const EMPTY_FORM = {
  title: '',
  description: '',
  source_type: 'youtube' as VideoSourceType,
  video_url: '',
  thumbnail_url: '',
  duration_seconds: '',
  points_reward: 25,
  is_active: true,
};

export default function AdminVideosPage() {
  const router = useRouter();
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const isEdit = useMemo(() => Boolean(editingId), [editingId]);

  const loadVideos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/videos', {
        headers: { 'x-admin-auth': 'true' },
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load videos');
      setVideos(json.videos || []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadVideos();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const onSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const body = {
        id: editingId,
        title: form.title,
        description: form.description,
        source_type: form.source_type,
        video_url: form.video_url,
        thumbnail_url: form.thumbnail_url || null,
        duration_seconds: form.duration_seconds === '' ? null : Number(form.duration_seconds),
        points_reward: Number(form.points_reward || 0),
        is_active: form.is_active,
      };

      const res = await fetch('/api/admin/videos', {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-auth': 'true',
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to save video');

      if (isEdit) {
        setVideos((prev) => prev.map((v) => (v.id === editingId ? json.video : v)));
        setMessage('Video updated.');
      } else {
        setVideos((prev) => [json.video, ...prev]);
        setMessage('Video added.');
      }
      resetForm();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save video');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm('Delete this video?')) return;
    try {
      const res = await fetch(`/api/admin/videos?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-admin-auth': 'true' },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to delete video');
      setVideos((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to delete video');
    }
  };

  const startEdit = (video: VideoRow) => {
    setEditingId(video.id);
    setForm({
      title: video.title || '',
      description: video.description || '',
      source_type: video.source_type || 'youtube',
      video_url: video.video_url || '',
      thumbnail_url: video.thumbnail_url || '',
      duration_seconds: video.duration_seconds == null ? '' : String(video.duration_seconds),
      points_reward: Number(video.points_reward || 25),
      is_active: Boolean(video.is_active),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="rounded-full bg-white p-2 shadow-sm hover:bg-slate-100"
          >
            <ArrowLeftIcon size={20} className="text-slate-700" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Video Learning CMS</h1>
            <p className="text-sm text-slate-500">Add YouTube or hosted videos. Kids get points only after full watch.</p>
          </div>
        </div>

        {message ? (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
            {message}
          </div>
        ) : null}

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            {isEdit ? 'Edit video' : 'Add new video'}
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Video title"
              className="rounded-lg border px-3 py-2"
            />
            <select
              value={form.source_type}
              onChange={(e) => setForm((prev) => ({ ...prev, source_type: e.target.value as VideoSourceType }))}
              className="rounded-lg border px-3 py-2"
            >
              <option value="youtube">YouTube</option>
              <option value="upload">Uploaded / direct file</option>
              <option value="external">External URL</option>
            </select>
          </div>

          <textarea
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Description"
            rows={3}
            className="mt-3 w-full rounded-lg border px-3 py-2"
          />

          <input
            value={form.video_url}
            onChange={(e) => setForm((prev) => ({ ...prev, video_url: e.target.value }))}
            placeholder={form.source_type === 'youtube' ? 'YouTube URL or 11-char ID' : 'https://...'}
            className="mt-3 w-full rounded-lg border px-3 py-2"
          />

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <input
              value={form.thumbnail_url}
              onChange={(e) => setForm((prev) => ({ ...prev, thumbnail_url: e.target.value }))}
              placeholder="Thumbnail URL (optional)"
              className="rounded-lg border px-3 py-2"
            />
            <input
              type="number"
              min={0}
              value={form.duration_seconds}
              onChange={(e) => setForm((prev) => ({ ...prev, duration_seconds: e.target.value }))}
              placeholder="Duration seconds (optional)"
              className="rounded-lg border px-3 py-2"
            />
            <input
              type="number"
              min={0}
              max={200}
              value={form.points_reward}
              onChange={(e) => setForm((prev) => ({ ...prev, points_reward: Number(e.target.value || 0) }))}
              placeholder="Points reward"
              className="rounded-lg border px-3 py-2"
            />
          </div>

          <label className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
            />
            Active
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {saving ? 'Saving...' : isEdit ? 'Update video' : 'Save video'}
            </button>
            {isEdit ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border bg-white shadow-sm">
          <div className="border-b px-5 py-3 font-bold text-slate-900">{videos.length} videos</div>
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : (
            <div className="divide-y">
              {videos.map((video) => (
                <div key={video.id} className="flex items-start justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-semibold text-slate-900">{video.title}</p>
                    <p className="text-xs text-slate-500">
                      {video.source_type} | +{video.points_reward} pts | {video.duration_seconds ?? 'n/a'} sec | {video.is_active ? 'active' : 'inactive'}
                    </p>
                    <p className="mt-1 text-sm text-slate-600 line-clamp-2">{video.description || 'No description'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={video.video_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border bg-white p-2 text-slate-700 hover:bg-slate-50"
                      title="Open video URL"
                    >
                      <PlayCircle size={17} />
                    </a>
                    <button
                      type="button"
                      onClick={() => startEdit(video)}
                      className="rounded-lg border bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(video.id)}
                      className="rounded-lg border bg-white p-2 text-red-600 hover:bg-red-50"
                      title="Delete video"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {videos.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <VideoIcon className="mx-auto mb-2" size={24} />
                  No videos yet.
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
