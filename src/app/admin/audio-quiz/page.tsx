'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AUDIO_QUIZ_CATEGORIES,
  AUDIO_QUIZ_AGE_GROUPS,
  AUDIO_RECORDING_MIN_SECONDS,
  AUDIO_RECORDING_MAX_SECONDS,
  AUDIO_RECORDING_DEFAULT_SECONDS,
} from '@/lib/audio-quiz';
import { useAudioRecorder } from '@/lib/use-audio-recorder';

interface AdminAudioQuiz {
  id: string;
  title: string;
  description: string;
  category: string;
  ageGroup: string;
  startDate: string | null;
  endDate: string | null;
  prizeDetails: string;
  maxRecordingSeconds: number;
  questionAudioUrl: string | null;
  questionAudioPath: string | null;
  bannerUrl: string | null;
  winnersCount: number;
  active: boolean;
}

const adminHeaders = { 'Content-Type': 'application/json', 'x-admin-auth': 'true' };

const emptyForm = {
  id: '',
  title: '',
  description: '',
  category: 'General Knowledge',
  ageGroup: 'All ages',
  startDate: '',
  endDate: '',
  prizeDetails: '',
  maxRecordingSeconds: AUDIO_RECORDING_DEFAULT_SECONDS,
  questionAudioPath: '',
  questionAudioUrl: '',
  bannerUrl: '',
  winnersCount: 3,
  active: true,
};

export default function AdminAudioQuizPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = React.useState<AdminAudioQuiz[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');
  const [tableMissing, setTableMissing] = React.useState(false);
  const [setupSql, setSetupSql] = React.useState('');
  const [form, setForm] = React.useState({ ...emptyForm });
  const [uploadingAudio, setUploadingAudio] = React.useState(false);
  const [uploadingBanner, setUploadingBanner] = React.useState(false);
  // Admin can record the question directly with the mic (up to 5 minutes).
  const questionRecorder = useAudioRecorder(300);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/audio-quiz/quizzes', { headers: adminHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setQuizzes(data.quizzes || []);
      setTableMissing(Boolean(data.tableMissing));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('admin_auth') !== 'true') {
      router.push('/admin/login');
      return;
    }
    load();
  }, [router, load]);

  const runSetup = async () => {
    setMessage('');
    setError('');
    setSetupSql('');
    try {
      const res = await fetch('/api/admin/audio-quiz/setup', { method: 'POST', headers: adminHeaders });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || 'Setup failed');
        if (data.sql) setSetupSql(data.sql);
        return;
      }
      setMessage(data.message || 'Tables ready.');
      setTableMissing(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Setup failed');
    }
  };

  const resetForm = () => setForm({ ...emptyForm });

  const startEdit = (q: AdminAudioQuiz) => {
    setForm({
      id: q.id,
      title: q.title,
      description: q.description || '',
      category: q.category,
      ageGroup: q.ageGroup,
      startDate: q.startDate || '',
      endDate: q.endDate || '',
      prizeDetails: q.prizeDetails || '',
      maxRecordingSeconds: q.maxRecordingSeconds,
      questionAudioPath: q.questionAudioPath || '',
      questionAudioUrl: q.questionAudioUrl || '',
      bannerUrl: q.bannerUrl || '',
      winnersCount: q.winnersCount,
      active: q.active,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const uploadFile = async (file: File | null, kind: 'audio' | 'banner') => {
    if (!file) return;
    kind === 'audio' ? setUploadingAudio(true) : setUploadingBanner(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', kind);
      const res = await fetch('/api/admin/audio-quiz/upload', {
        method: 'POST',
        headers: { 'x-admin-auth': 'true' },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      if (kind === 'audio') {
        setForm((f) => ({ ...f, questionAudioPath: data.path || '', questionAudioUrl: data.url || '' }));
      } else {
        setForm((f) => ({ ...f, bannerUrl: data.url || '' }));
      }
      setMessage(`${kind === 'audio' ? 'Question audio' : 'Banner'} uploaded.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      kind === 'audio' ? setUploadingAudio(false) : setUploadingBanner(false);
    }
  };

  const uploadRecordedQuestion = async () => {
    const blob = questionRecorder.blob;
    if (!blob) return;
    setUploadingAudio(true);
    setError('');
    try {
      const type = blob.type || 'audio/webm';
      const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : type.includes('mpeg') ? 'mp3' : 'webm';
      const fd = new FormData();
      fd.append('file', blob, `question.${ext}`);
      fd.append('kind', 'audio');
      const res = await fetch('/api/admin/audio-quiz/upload', {
        method: 'POST',
        headers: { 'x-admin-auth': 'true' },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setForm((f) => ({ ...f, questionAudioPath: data.path || '', questionAudioUrl: data.url || '' }));
      setMessage('Recorded question saved. Children will hear this on the quiz page.');
      questionRecorder.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploadingAudio(false);
    }
  };

  const deleteQuestionAudio = async () => {
    if (!window.confirm('Delete the question recording for this quiz?')) return;
    setError('');
    const path = form.questionAudioPath;
    // Best-effort remove the stored file.
    if (path) {
      try {
        await fetch(`/api/admin/audio-quiz/upload?path=${encodeURIComponent(path)}`, {
          method: 'DELETE',
          headers: { 'x-admin-auth': 'true' },
        });
      } catch {
        /* ignore */
      }
    }
    setForm((f) => ({ ...f, questionAudioPath: '', questionAudioUrl: '' }));
    // If editing an existing quiz, persist the removal immediately.
    if (form.id) {
      try {
        await fetch('/api/admin/audio-quiz/quizzes', {
          method: 'PUT',
          headers: adminHeaders,
          body: JSON.stringify({ id: form.id, questionAudioPath: null, questionAudioUrl: null }),
        });
        load();
      } catch {
        /* ignore */
      }
    }
    setMessage('Question recording deleted.');
  };

  const save = async () => {
    setMessage('');
    setError('');
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    const payload: Record<string, unknown> = {
      ...(form.id ? { id: form.id } : {}),
      title: form.title,
      description: form.description,
      category: form.category,
      ageGroup: form.ageGroup,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      prizeDetails: form.prizeDetails,
      maxRecordingSeconds: Number(form.maxRecordingSeconds) || AUDIO_RECORDING_DEFAULT_SECONDS,
      bannerUrl: form.bannerUrl || null,
      winnersCount: Number(form.winnersCount) || 3,
      active: form.active,
      // Always send (null when removed) so deleting the recording persists and edits keep the path.
      questionAudioPath: form.questionAudioPath || null,
      questionAudioUrl: form.questionAudioUrl || null,
    };
    try {
      const res = await fetch('/api/admin/audio-quiz/quizzes', {
        method: form.id ? 'PUT' : 'POST',
        headers: adminHeaders,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setMessage(form.id ? 'Quiz updated.' : 'Quiz created.');
      resetForm();
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const remove = async (q: AdminAudioQuiz) => {
    if (!window.confirm(`Delete "${q.title}" and all its submissions?`)) return;
    try {
      const res = await fetch(`/api/admin/audio-quiz/quizzes?id=${encodeURIComponent(q.id)}`, {
        method: 'DELETE',
        headers: adminHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete failed');
      setMessage('Quiz deleted.');
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-slate-900">Audio Quiz — Manage</h1>
          <Link href="/admin" className="text-sm font-bold text-violet-700 hover:underline">
            ← Admin
          </Link>
        </div>

        {tableMissing ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
            <p className="font-bold text-amber-800">The Audio Quiz tables are not set up yet.</p>
            <button
              type="button"
              onClick={runSetup}
              className="mt-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700"
            >
              Create tables
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={runSetup}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
          >
            Re-run setup
          </button>
        )}

        {message ? <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
        {setupSql ? (
          <details className="rounded-lg border border-slate-300 bg-white p-3">
            <summary className="cursor-pointer text-sm font-bold text-slate-700">Show SQL to run manually</summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">{setupSql}</pre>
          </details>
        ) : null}

        {/* Form */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-bold text-slate-900">{form.id ? 'Edit quiz' : 'Create a new audio quiz'}</h2>
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-700">
              Title
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Short description
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                Category
                <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
                  {AUDIO_QUIZ_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Age group
                <select value={form.ageGroup} onChange={(e) => setForm((f) => ({ ...f, ageGroup: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
                  {AUDIO_QUIZ_AGE_GROUPS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Start date
                <input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                End date
                <input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Max recording seconds ({AUDIO_RECORDING_MIN_SECONDS}–{AUDIO_RECORDING_MAX_SECONDS})
                <input type="number" min={AUDIO_RECORDING_MIN_SECONDS} max={AUDIO_RECORDING_MAX_SECONDS} value={form.maxRecordingSeconds} onChange={(e) => setForm((f) => ({ ...f, maxRecordingSeconds: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Number of winners
                <input type="number" min={1} max={10} value={form.winnersCount} onChange={(e) => setForm((f) => ({ ...f, winnersCount: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
            </div>
            <label className="block text-sm font-semibold text-slate-700">
              Prize details
              <input value={form.prizeDetails} onChange={(e) => setForm((f) => ({ ...f, prizeDetails: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-bold text-slate-700">Question audio</p>

                {/* Record directly with the mic */}
                <div className="mt-2 rounded-lg bg-violet-50 p-2">
                  <p className="text-xs font-bold text-violet-800">🎤 Record with mic</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {questionRecorder.isRecording ? (
                      <button type="button" onClick={questionRecorder.stopRecording} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white">
                        ⏹ Stop ({questionRecorder.formatTime(questionRecorder.seconds)})
                      </button>
                    ) : (
                      <button type="button" onClick={questionRecorder.startRecording} className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white">
                        ● Record
                      </button>
                    )}
                    {questionRecorder.state === 'finished' && questionRecorder.audioUrl ? (
                      <>
                        <button type="button" onClick={questionRecorder.reset} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-600">
                          Redo
                        </button>
                        <button type="button" onClick={uploadRecordedQuestion} disabled={uploadingAudio} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                          {uploadingAudio ? 'Saving…' : 'Use this recording'}
                        </button>
                      </>
                    ) : null}
                  </div>
                  {questionRecorder.audioUrl ? <audio controls src={questionRecorder.audioUrl} className="mt-2 w-full" /> : null}
                  {questionRecorder.error ? <p className="mt-1 text-xs text-rose-600">{questionRecorder.error}</p> : null}
                </div>

                {/* Or upload a file */}
                <p className="mt-2 text-xs text-slate-500">Or upload a file (MP3, WAV, M4A):</p>
                <input type="file" accept="audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a,audio/aac,.mp3,.wav,.m4a" disabled={uploadingAudio} onChange={(e) => uploadFile(e.target.files?.[0] || null, 'audio')} className="mt-1 w-full text-xs" />
                {uploadingAudio ? <p className="mt-1 text-xs text-slate-500">Uploading…</p> : null}
                {form.questionAudioUrl ? (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-emerald-700">✓ Saved question audio (this plays on the quiz page):</p>
                    <audio controls src={form.questionAudioUrl} className="mt-1 w-full" />
                    <button
                      type="button"
                      onClick={deleteQuestionAudio}
                      className="mt-2 rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-200"
                    >
                      🗑 Delete recording
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-bold text-slate-700">Banner image (optional)</p>
                <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingBanner} onChange={(e) => uploadFile(e.target.files?.[0] || null, 'banner')} className="mt-2 w-full text-xs" />
                {uploadingBanner ? <p className="mt-1 text-xs text-slate-500">Uploading…</p> : null}
                {form.bannerUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.bannerUrl} alt="" className="mt-2 h-20 w-full rounded object-cover" />
                ) : null}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
              Active (visible to children)
            </label>

            <div className="flex gap-2">
              <button type="button" onClick={save} className="rounded-lg bg-violet-600 px-5 py-2 font-bold text-white hover:bg-violet-700">
                {form.id ? 'Update quiz' : 'Create quiz'}
              </button>
              {form.id ? (
                <button type="button" onClick={resetForm} className="rounded-lg border border-slate-300 px-4 py-2 font-bold text-slate-600 hover:bg-slate-100">
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* List */}
        <div className="space-y-2">
          {loading ? (
            <p className="text-slate-500">Loading…</p>
          ) : quizzes.length === 0 ? (
            <p className="text-slate-500">No audio quizzes yet.</p>
          ) : (
            quizzes.map((q) => (
              <div key={q.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    {q.title} {!q.active ? <span className="text-xs text-rose-500">(hidden)</span> : null}
                  </p>
                  <p className="text-xs text-slate-500">
                    {q.category} · Ages {q.ageGroup} · max {q.maxRecordingSeconds}s · {q.winnersCount} winners
                    {q.endDate ? ` · ends ${q.endDate}` : ''}
                  </p>
                  {q.questionAudioUrl ? (
                    <div className="mt-2">
                      <p className="text-[11px] font-semibold text-slate-500">Question audio:</p>
                      <audio controls src={q.questionAudioUrl} className="mt-1 h-8 w-full max-w-xs" />
                    </div>
                  ) : (
                    <p className="mt-1 text-[11px] text-amber-600">No question audio yet — edit to add one.</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link href={`/admin/audio-quiz/${q.id}`} className="rounded-lg bg-violet-100 px-3 py-1.5 text-sm font-bold text-violet-700 hover:bg-violet-200">
                    Submissions
                  </Link>
                  <button type="button" onClick={() => startEdit(q)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-200">
                    Edit
                  </button>
                  <button type="button" onClick={() => remove(q)} className="rounded-lg bg-rose-100 px-3 py-1.5 text-sm font-bold text-rose-700 hover:bg-rose-200">
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
