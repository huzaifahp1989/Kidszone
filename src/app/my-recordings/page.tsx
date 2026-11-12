'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { getAuthFetchHeaders } from '@/lib/auth-headers';
import { Recording } from '@/types/stories';
import {
  RECORDING_CATEGORIES,
  getRecordingCategoryEmoji,
  getRecordingCategoryLabel,
  getRecordingStatusMeta,
  isEditableStatus,
  type RecordingCategory,
  type RecordingStatus,
} from '@/lib/recording-categories';
import { RECORDING_APPROVED_POINTS } from '@/lib/points-policy';
import {
  Mic,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  Hourglass,
  MessageSquare,
  RefreshCw,
  Pencil,
  Trash2,
  Download,
  Search,
  Send,
  X,
} from 'lucide-react';

type StatusFilter = 'all' | RecordingStatus;
type CategoryFilter = 'all' | RecordingCategory;

function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getAdminFeedback(rec: Recording): string | null {
  return rec.admin_notes?.trim() || rec.admin_feedback?.trim() || null;
}

function extensionFromPath(path?: string | null): string {
  const match = String(path || '').match(/\.([a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : 'webm';
}

const STATUS_TONE_CLASSES: Record<string, string> = {
  neutral: 'bg-blue-50 text-blue-800 border-blue-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  good: 'bg-green-100 text-green-800 border-green-200',
  bad: 'bg-red-100 text-red-800 border-red-200',
};

function StatusBadge({ status }: { status: string }) {
  const meta = getRecordingStatusMeta(status);
  const icon =
    meta.tone === 'good' ? (
      <CheckCircle size={14} className="mr-1" />
    ) : meta.tone === 'bad' ? (
      <XCircle size={14} className="mr-1" />
    ) : meta.tone === 'neutral' ? (
      <Pencil size={14} className="mr-1" />
    ) : (
      <Hourglass size={14} className="mr-1" />
    );

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${
        STATUS_TONE_CLASSES[meta.tone] || STATUS_TONE_CLASSES.pending
      }`}
    >
      {icon}
      {meta.label}
    </span>
  );
}

export default function MyRecordingsPage() {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState<RecordingCategory>('general_audio');

  const fetchRecordings = useCallback(
    async (isRefresh = false) => {
      if (!user) return;
      if (isRefresh) setRefreshing(true);
      setLoadError(null);
      try {
        const headers = await getAuthFetchHeaders();
        const response = await fetch('/api/my-recordings', { headers, cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || 'Could not load your recordings.');
        }
        setRecordings(payload.recordings || []);
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Could not load your recordings.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user]
  );

  useEffect(() => {
    if (user) {
      void fetchRecordings();
    } else {
      setLoading(false);
    }
  }, [fetchRecordings, user]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return recordings.filter((rec) => {
      if (categoryFilter !== 'all' && rec.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && rec.status !== statusFilter) return false;
      if (!term) return true;
      return (
        (rec.title || '').toLowerCase().includes(term) ||
        (rec.description || '').toLowerCase().includes(term)
      );
    });
  }, [categoryFilter, recordings, search, statusFilter]);

  const stats = useMemo(() => {
    return recordings.reduce(
      (acc, rec) => {
        if (rec.status === 'approved') acc.approved += 1;
        else if (rec.status === 'rejected') acc.rejected += 1;
        else if (rec.status === 'draft' || rec.status === 'saved') acc.drafts += 1;
        else acc.pending += 1;
        return acc;
      },
      { approved: 0, rejected: 0, pending: 0, drafts: 0 }
    );
  }, [recordings]);

  const startEditing = (rec: Recording) => {
    setActionError(null);
    setEditingId(rec.id);
    setEditTitle(rec.title || '');
    setEditDescription(rec.description || '');
    setEditCategory((rec.category as RecordingCategory) || 'general_audio');
  };

  const patchRecording = async (id: string, body: Record<string, unknown>) => {
    const headers = await getAuthFetchHeaders({ 'Content-Type': 'application/json' });
    const response = await fetch(`/api/my-recordings/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Could not update this recording.');
    }
    return payload.recording as Recording | undefined;
  };

  const handleSaveEdit = async (rec: Recording) => {
    setActionError(null);
    const title = editTitle.trim();
    if (!title) {
      setActionError('Please give your recording a title.');
      return;
    }
    setBusyId(rec.id);
    try {
      const updated = await patchRecording(rec.id, {
        title,
        description: editDescription,
        category: editCategory,
      });
      setRecordings((prev) =>
        prev.map((item) =>
          item.id === rec.id
            ? { ...item, title, description: editDescription, category: editCategory, ...(updated || {}) }
            : item
        )
      );
      setEditingId(null);
      setStatusMessage('Recording updated.');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not update this recording.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSubmitForReview = async (rec: Recording) => {
    setActionError(null);
    setBusyId(rec.id);
    try {
      const updated = await patchRecording(rec.id, { status: 'submitted' });
      setRecordings((prev) =>
        prev.map((item) =>
          item.id === rec.id
            ? { ...item, status: 'submitted', submitted_at: new Date().toISOString(), ...(updated || {}) }
            : item
        )
      );
      setStatusMessage('Sent to your teacher for review.');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not submit this recording.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (rec: Recording) => {
    setActionError(null);
    const confirmed =
      typeof window === 'undefined'
        ? false
        : window.confirm(`Delete "${rec.title || 'this recording'}"? This cannot be undone.`);
    if (!confirmed) return;

    setBusyId(rec.id);
    try {
      const headers = await getAuthFetchHeaders();
      const response = await fetch(`/api/my-recordings/${rec.id}`, { method: 'DELETE', headers });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Could not delete this recording.');
      }
      setRecordings((prev) => prev.filter((item) => item.id !== rec.id));
      setStatusMessage('Recording deleted.');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not delete this recording.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDownload = (rec: Recording) => {
    if (!rec.audio_url) {
      setActionError('This recording is not available to download.');
      return;
    }
    const base = (rec.title || 'recording').replace(/[^\w\- ]+/g, '').trim() || 'recording';
    const link = document.createElement('a');
    link.href = rec.audio_url;
    link.download = `${base}.${extensionFromPath(rec.audio_path)}`;
    link.target = '_blank';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-islamic-light flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg">
          <p className="text-xl text-gray-600 mb-4">Please sign in to view your recordings.</p>
          <Link
            href="/signin"
            className="inline-block bg-islamic-primary text-white px-6 py-2 rounded-lg font-bold"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-islamic-light py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Recordings</h1>
            <p className="text-sm text-gray-500 mt-1">
              Listen back, edit, rename, download or submit your recordings for review.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fetchRecordings(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <Link
              href="/approved-recordings"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              <CheckCircle size={16} /> Approved only
            </Link>
            <Link
              href="/studio"
              className="bg-islamic-primary text-white px-6 py-2 rounded-full font-bold hover:bg-opacity-90 transition flex items-center"
            >
              <Mic size={18} className="mr-2" /> Record New
            </Link>
          </div>
        </div>

        {(statusMessage || actionError || loadError) && (
          <div className="mb-6 space-y-2">
            {statusMessage && (
              <div className="flex items-start justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
                <span>{statusMessage}</span>
                <button type="button" onClick={() => setStatusMessage(null)} aria-label="Dismiss">
                  <X size={16} />
                </button>
              </div>
            )}
            {actionError && (
              <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                <span>{actionError}</span>
                <button type="button" onClick={() => setActionError(null)} aria-label="Dismiss">
                  <X size={16} />
                </button>
              </div>
            )}
            {loadError && (
              <div className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                <span>{loadError}</span>
                <button
                  type="button"
                  onClick={() => fetchRecordings(true)}
                  className="underline shrink-0"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        )}

        {!loading && recordings.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-center">
              <p className="text-2xl font-black text-blue-800">{stats.drafts}</p>
              <p className="text-xs font-semibold text-blue-700">Drafts</p>
            </div>
            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-center">
              <p className="text-2xl font-black text-yellow-800">{stats.pending}</p>
              <p className="text-xs font-semibold text-yellow-700">Pending</p>
            </div>
            <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-center">
              <p className="text-2xl font-black text-green-800">{stats.approved}</p>
              <p className="text-xs font-semibold text-green-700">Approved</p>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center">
              <p className="text-2xl font-black text-red-800">{stats.rejected}</p>
              <p className="text-xs font-semibold text-red-700">Rejected</p>
            </div>
          </div>
        )}

        {!loading && recordings.length > 0 && (
          <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by title or description"
                  aria-label="Search recordings"
                  className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm text-gray-800 focus:border-islamic-primary focus:outline-none"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}
                aria-label="Filter by category"
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:border-islamic-primary focus:outline-none"
              >
                <option value="all">All categories</option>
                {RECORDING_CATEGORIES.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.emoji} {category.label}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
                aria-label="Filter by status"
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:border-islamic-primary focus:outline-none"
              >
                <option value="all">All statuses</option>
                <option value="draft">Draft</option>
                <option value="saved">Saved</option>
                <option value="submitted">Pending review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Showing {filtered.length} of {recordings.length} recordings
            </p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-islamic-primary"></div>
          </div>
        ) : recordings.length === 0 ? (
          <div className="rounded-3xl border border-gray-100 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
              <Mic size={32} className="text-gray-400" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-gray-700">No recordings yet</h3>
            <p className="mb-6 text-gray-500">
              Record Qur&apos;an, Nasheeds, Stories or Hadith and earn {RECORDING_APPROVED_POINTS}{' '}
              points when approved!
            </p>
            <Link
              href="/studio"
              className="inline-block bg-islamic-primary text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition"
            >
              Open Recording Studio
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-gray-100 bg-white p-10 text-center shadow-sm">
            <p className="font-semibold text-gray-700">No recordings match your filters.</p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setCategoryFilter('all');
                setStatusFilter('all');
              }}
              className="mt-3 text-sm font-semibold text-islamic-primary underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((rec) => {
              const durationSeconds = rec.duration ?? rec.duration_seconds ?? 0;
              const isEditing = editingId === rec.id;
              const isBusy = busyId === rec.id;
              const adminFeedback = getAdminFeedback(rec);
              const canEdit = isEditableStatus(rec.status);
              const canSubmit = rec.status === 'draft' || rec.status === 'saved';
              const title = rec.title || 'Studio Recording';

              return (
                <div
                  key={rec.id}
                  className={`flex flex-col gap-4 rounded-2xl border bg-white p-6 shadow-sm ${
                    rec.status === 'approved'
                      ? 'border-green-200'
                      : rec.status === 'rejected'
                        ? 'border-red-200'
                        : 'border-gray-100'
                  }`}
                >
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full border border-teal-100 bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-800">
                          <span aria-hidden>{getRecordingCategoryEmoji(rec.category)}</span>
                          {getRecordingCategoryLabel(rec.category)}
                        </span>
                        <StatusBadge status={rec.status} />
                      </div>

                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <label
                              htmlFor={`title-${rec.id}`}
                              className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500"
                            >
                              Title
                            </label>
                            <input
                              id={`title-${rec.id}`}
                              value={editTitle}
                              onChange={(event) => setEditTitle(event.target.value)}
                              maxLength={120}
                              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-islamic-primary focus:outline-none"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`category-${rec.id}`}
                              className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500"
                            >
                              Category
                            </label>
                            <select
                              id={`category-${rec.id}`}
                              value={editCategory}
                              onChange={(event) =>
                                setEditCategory(event.target.value as RecordingCategory)
                              }
                              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-islamic-primary focus:outline-none"
                            >
                              {RECORDING_CATEGORIES.map((category) => (
                                <option key={category.slug} value={category.slug}>
                                  {category.emoji} {category.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label
                              htmlFor={`description-${rec.id}`}
                              className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500"
                            >
                              Description (optional)
                            </label>
                            <textarea
                              id={`description-${rec.id}`}
                              value={editDescription}
                              onChange={(event) => setEditDescription(event.target.value)}
                              maxLength={1000}
                              rows={3}
                              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:border-islamic-primary focus:outline-none"
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(rec)}
                              disabled={isBusy}
                              className="inline-flex items-center gap-1 rounded-xl bg-islamic-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-opacity-90 disabled:opacity-60"
                            >
                              <CheckCircle size={14} /> Save changes
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                            >
                              <X size={14} /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h3 className="mb-1 text-xl font-bold text-gray-800">{title}</h3>
                          {rec.description && (
                            <p className="mb-2 text-sm text-gray-600">{rec.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center">
                              <Calendar size={14} className="mr-1" /> Created{' '}
                              {formatDate(rec.created_at)}
                            </span>
                            <span className="flex items-center">
                              <Clock size={14} className="mr-1" />
                              {formatDuration(durationSeconds)}
                            </span>
                            {rec.reviewed_at && (
                              <span className="flex items-center">
                                <CheckCircle size={14} className="mr-1" /> Reviewed{' '}
                                {formatDate(rec.reviewed_at)}
                              </span>
                            )}
                          </div>
                        </>
                      )}

                      {!isEditing && rec.status === 'approved' && (
                        <p className="mt-2 text-sm font-semibold text-green-700">
                          MashaAllah! Your recording was approved
                          {rec.points_awarded ? ` — you earned ${rec.points_awarded} points!` : '.'}
                        </p>
                      )}
                      {!isEditing && rec.status === 'rejected' && (
                        <p className="mt-2 text-sm font-semibold text-red-700">
                          This recording was not approved. Read the teacher&apos;s feedback below
                          and try again!
                        </p>
                      )}
                      {!isEditing && rec.status === 'submitted' && (
                        <p className="mt-2 text-sm text-yellow-700">
                          Waiting for a teacher to review your recording. Check back soon!
                        </p>
                      )}
                      {!isEditing && (rec.status === 'draft' || rec.status === 'saved') && (
                        <p className="mt-2 text-sm text-blue-700">
                          Saved privately. Submit it when you are ready for your teacher to review.
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      {rec.status === 'approved' && rec.points_awarded != null && rec.points_awarded > 0 && (
                        <div className="rounded-lg border border-yellow-100 bg-yellow-50 px-4 py-2 font-bold text-yellow-700">
                          ⭐ {rec.points_awarded} pts
                        </div>
                      )}
                    </div>
                  </div>

                  {!isEditing && (
                    <>
                      {rec.audio_url ? (
                        <audio
                          controls
                          preload="none"
                          src={rec.audio_url}
                          className="w-full"
                          aria-label={`Playback for ${title}`}
                        />
                      ) : (
                        <p className="text-sm text-gray-400">
                          Audio is unavailable for this recording.
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {canSubmit && (
                          <button
                            type="button"
                            onClick={() => handleSubmitForReview(rec)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1 rounded-xl bg-islamic-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-opacity-90 disabled:opacity-60"
                          >
                            <Send size={14} /> Submit for review
                          </button>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => startEditing(rec)}
                            className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                          >
                            <Pencil size={14} /> Edit / Rename
                          </button>
                        )}
                        <Link
                          href="/studio"
                          className="inline-flex items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                        >
                          <Mic size={14} /> Record again
                        </Link>
                        {rec.audio_url && (
                          <button
                            type="button"
                            onClick={() => handleDownload(rec)}
                            className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                          >
                            <Download size={14} /> Download
                          </button>
                        )}
                        {rec.status !== 'approved' && (
                          <button
                            type="button"
                            onClick={() => handleDelete(rec)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        )}
                      </div>
                    </>
                  )}

                  {adminFeedback && (rec.status === 'approved' || rec.status === 'rejected') && (
                    <div
                      className={`rounded-xl border p-4 ${
                        rec.status === 'approved'
                          ? 'border-green-100 bg-green-50'
                          : 'border-red-100 bg-red-50'
                      }`}
                    >
                      <div className="mb-1.5 flex items-center gap-2">
                        <MessageSquare
                          size={14}
                          className={rec.status === 'approved' ? 'text-green-700' : 'text-red-700'}
                        />
                        <p
                          className={`text-xs font-bold uppercase tracking-wide ${
                            rec.status === 'approved' ? 'text-green-800' : 'text-red-800'
                          }`}
                        >
                          Teacher feedback
                        </p>
                      </div>
                      <p
                        className={`whitespace-pre-wrap text-sm ${
                          rec.status === 'approved' ? 'text-green-900' : 'text-red-900'
                        }`}
                      >
                        {adminFeedback}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
