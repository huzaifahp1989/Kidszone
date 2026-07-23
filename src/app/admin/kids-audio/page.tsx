'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Headphones, Loader2, Trash2, Upload } from 'lucide-react';
import {
  KIDS_AUDIO_CATEGORIES,
  KIDS_AUDIO_CATEGORY_EMOJI,
  KIDS_AUDIO_CATEGORY_LABELS,
  type KidsAudioCategory,
} from '@/lib/kids-audio';

const adminHeaders = { 'Content-Type': 'application/json', 'x-admin-auth': 'true' };

interface AdminTrack {
  id: string;
  title: string;
  description: string | null;
  category: KidsAudioCategory;
  audio_path: string;
  audio_url: string | null;
  duration_seconds: number;
  cover_emoji: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
}

const emptyForm = {
  title: '',
  description: '',
  category: 'story' as KidsAudioCategory,
  coverEmoji: '🎧',
  sortOrder: 0,
  durationSeconds: 0,
  isPublished: true,
  audioPath: '',
  audioUrl: '',
};

export default function AdminKidsAudioPage() {
  const router = useRouter();
  const [tracks, setTracks] = useState<AdminTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [tableMissing, setTableMissing] = useState(false);
  const [setupSql, setSetupSql] = useState('');
  const [form, setForm] = useState({ ...emptyForm });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/kids-audio', { headers: { 'x-admin-auth': 'true' }, cache: 'no-store' });
      const data = await res.json();
      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setTracks(data.tracks || []);
      setTableMissing(Boolean(data.tableMissing));
      if (data.setupSql) setSetupSql(data.setupSql);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('admin_auth') !== 'true') {
      router.push('/admin/login');
      return;
    }
    load();
  }, [load, router]);

  const loadSetupSql = async () => {
    const res = await fetch('/api/admin/kids-audio/setup', { headers: { 'x-admin-auth': 'true' } });
    const data = await res.json();
    if (res.ok) setSetupSql(data.setupSql || '');
  };

  const handleUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setError('');
    setMessage('');
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/admin/kids-audio/upload', {
        method: 'POST',
        headers: { 'x-admin-auth': 'true' },
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setForm((prev) => ({ ...prev, audioPath: data.path, audioUrl: data.url }));
      setMessage('Audio uploaded. Fill in the details and save.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (!form.title.trim()) throw new Error('Title is required');
      if (!form.audioPath && !editingId) throw new Error('Upload an audio file first');

      if (editingId) {
        const res = await fetch(`/api/admin/kids-audio/${editingId}`, {
          method: 'PATCH',
          headers: adminHeaders,
          body: JSON.stringify({
            title: form.title,
            description: form.description,
            category: form.category,
            coverEmoji: form.coverEmoji,
            sortOrder: form.sortOrder,
            durationSeconds: form.durationSeconds,
            isPublished: form.isPublished,
            audioPath: form.audioPath || undefined,
            audioUrl: form.audioUrl || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.setupSql) {
            setTableMissing(true);
            setSetupSql(data.setupSql);
          }
          throw new Error(data.error || 'Update failed');
        }
        setMessage('Track updated.');
      } else {
        const res = await fetch('/api/admin/kids-audio', {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({
            title: form.title,
            description: form.description,
            category: form.category,
            coverEmoji: form.coverEmoji,
            sortOrder: form.sortOrder,
            durationSeconds: form.durationSeconds,
            isPublished: form.isPublished,
            audioPath: form.audioPath,
            audioUrl: form.audioUrl,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.setupSql) {
            setTableMissing(true);
            setSetupSql(data.setupSql);
          }
          throw new Error(data.error || 'Save failed');
        }
        setMessage('Track added to Kids Audio.');
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (track: AdminTrack) => {
    setEditingId(track.id);
    setForm({
      title: track.title,
      description: track.description || '',
      category: track.category,
      coverEmoji: track.cover_emoji || '🎧',
      sortOrder: track.sort_order || 0,
      durationSeconds: track.duration_seconds || 0,
      isPublished: track.is_published,
      audioPath: track.audio_path,
      audioUrl: track.audio_url || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const togglePublished = async (track: AdminTrack) => {
    try {
      const res = await fetch(`/api/admin/kids-audio/${track.id}`, {
        method: 'PATCH',
        headers: adminHeaders,
        body: JSON.stringify({ isPublished: !track.is_published }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const handleDelete = async (track: AdminTrack) => {
    if (!window.confirm(`Delete “${track.title}”?`)) return;
    try {
      const res = await fetch(`/api/admin/kids-audio/${track.id}`, {
        method: 'DELETE',
        headers: { 'x-admin-auth': 'true' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setMessage('Track deleted.');
      if (editingId === track.id) resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} /> Admin home
          </button>
          <a
            href="/listen"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:underline"
          >
            <Headphones size={16} /> Open Kids Audio page
          </a>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-slate-900">Kids Audio Library</h1>
          <p className="text-slate-600 mt-1">
            Upload Qur&apos;an, nasheed, story and hadith audio for kids to listen on{' '}
            <code className="text-xs bg-slate-200 px-1 rounded">/listen</code>. Review kid submissions under Recordings.
          </p>
        </div>

        {(message || error) && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            {error || message}
          </div>
        )}

        {tableMissing && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
            <p className="font-semibold text-amber-900">Database table missing</p>
            <p className="text-sm text-amber-800">
              Run this SQL in Supabase, then refresh. Kid studio submissions still work via the Recordings table.
            </p>
            <button type="button" onClick={loadSetupSql} className="text-sm font-semibold text-amber-900 underline">
              Load setup SQL
            </button>
            {setupSql && (
              <pre className="text-xs bg-white border border-amber-100 rounded-lg p-3 overflow-auto max-h-64 whitespace-pre-wrap">
                {setupSql}
              </pre>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit track' : 'Add audio for kids'}</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm">
              <span className="font-semibold text-slate-700">Title</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Surah Al-Fatihah for kids"
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold text-slate-700">Category</span>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value as KidsAudioCategory }))}
              >
                {KIDS_AUDIO_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {KIDS_AUDIO_CATEGORY_EMOJI[cat]} {KIDS_AUDIO_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-sm">
            <span className="font-semibold text-slate-700">Description</span>
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 min-h-[80px]"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Short note for kids"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="block text-sm">
              <span className="font-semibold text-slate-700">Emoji</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                value={form.coverEmoji}
                onChange={(e) => setForm((p) => ({ ...p, coverEmoji: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold text-slate-700">Sort order</span>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                value={form.sortOrder}
                onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value) || 0 }))}
              />
            </label>
            <label className="block text-sm">
              <span className="font-semibold text-slate-700">Duration (seconds)</span>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                value={form.durationSeconds}
                onChange={(e) => setForm((p) => ({ ...p, durationSeconds: Number(e.target.value) || 0 }))}
              />
            </label>
          </div>

          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => setForm((p) => ({ ...p, isPublished: e.target.checked }))}
            />
            Published on Kids Audio page
          </label>

          <div className="rounded-xl border border-dashed border-slate-300 p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Upload size={16} /> Audio file (MP3, M4A, WAV, OGG, WebM — max 30MB)
            </p>
            <input
              type="file"
              accept="audio/*,.mp3,.m4a,.wav,.ogg,.webm"
              onChange={(e) => handleUpload(e.target.files?.[0] || null)}
              disabled={uploading}
            />
            {uploading && (
              <p className="text-sm text-slate-500 inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Uploading…
              </p>
            )}
            {form.audioPath && (
              <div className="space-y-2">
                <p className="text-xs text-slate-500 break-all">Path: {form.audioPath}</p>
                {form.audioUrl && <audio controls src={form.audioUrl} className="w-full" />}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || uploading}
              className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : editingId ? 'Update track' : 'Add to library'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 rounded-lg border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel edit
              </button>
            )}
            <button
              type="button"
              onClick={() => router.push('/admin/recordings')}
              className="px-5 py-2.5 rounded-lg border border-indigo-200 text-indigo-700 font-semibold hover:bg-indigo-50"
            >
              Review kid submissions →
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Library tracks ({tracks.length})</h2>
            <button type="button" onClick={load} className="text-sm font-semibold text-slate-500 hover:text-slate-800">
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading…</div>
          ) : tracks.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No library tracks yet.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {tracks.map((track) => (
                <li key={track.id} className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="text-2xl w-10 text-center">{track.cover_emoji || '🎧'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900 truncate">{track.title}</p>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {KIDS_AUDIO_CATEGORY_LABELS[track.category] || track.category}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          track.is_published ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {track.is_published ? 'Published' : 'Hidden'}
                      </span>
                    </div>
                    {track.description && <p className="text-sm text-slate-500 line-clamp-2">{track.description}</p>}
                    {track.audio_url && <audio controls src={track.audio_url} className="w-full mt-2 max-w-md" />}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(track)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePublished(track)}
                      className="px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 text-sm font-semibold hover:bg-emerald-50"
                    >
                      {track.is_published ? 'Hide' : 'Publish'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(track)}
                      className="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-sm font-semibold hover:bg-red-50 inline-flex items-center gap-1"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
