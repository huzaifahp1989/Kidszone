'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, RefreshCw, Trophy } from 'lucide-react';
import {
  WRITTEN_COMPETITION_CATEGORIES,
  WRITTEN_QUESTION_DIFFICULTIES,
  WRITTEN_SUBMISSION_STATUSES,
  SUBMISSION_STATUS_LABELS,
  WINNER_STATUS_LABELS,
  categoryLabel,
  type WrittenCompetition,
  type WrittenPrize,
  type WrittenQuestionAdmin,
  type WrittenSubmissionStatus,
} from '@/lib/written-competition';

const adminHeaders = { 'Content-Type': 'application/json', 'x-admin-auth': 'true' };

type Tab = 'settings' | 'questions' | 'prizes' | 'submissions' | 'winners';

type SubmissionRow = {
  id: string;
  userName: string;
  email: string;
  status: WrittenSubmissionStatus;
  totalMarks: number;
  maxMarks: number;
  percentage: number;
  submittedAt: string;
};

type WinnerRow = {
  id: string;
  submissionId: string;
  displayName: string;
  userName?: string;
  status: 'awaiting_verification' | 'confirmed' | 'disqualified';
  disqualifyReason: string;
  publicDisplay: boolean;
  prizeId: string | null;
  prizeName?: string | null;
  finalScore?: string | null;
  submittedAt?: string | null;
};

const emptyQuestion: Omit<WrittenQuestionAdmin, 'id'> = {
  questionNumber: 1,
  questionText: '',
  difficulty: 'medium',
  topic: '',
  maxMarks: 10,
  active: true,
  expectedAnswer: '',
  markingGuidance: '',
  minRequiredPoints: 0,
  source: '',
  explanation: '',
};

function toLocalInput(iso: string | null) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export default function AdminWrittenCompetitionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || '');
  const [tab, setTab] = useState<Tab>('settings');
  const [competition, setCompetition] = useState<WrittenCompetition | null>(null);
  const [questions, setQuestions] = useState<WrittenQuestionAdmin[]>([]);
  const [prizes, setPrizes] = useState<WrittenPrize[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [winners, setWinners] = useState<WinnerRow[]>([]);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [questionForm, setQuestionForm] = useState({ ...emptyQuestion, id: '' });
  const [prizeForm, setPrizeForm] = useState({
    id: '',
    prizeName: '',
    prizeDescription: '',
    prizeImageUrl: '',
    prizeImagePath: '',
    sponsor: '',
    sponsorLogoUrl: '',
    winnersCount: 1,
    prizeOrder: 1,
    active: true,
  });
  const [uploading, setUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [disqualifyReason, setDisqualifyReason] = useState('');

  const loadCompetition = useCallback(async () => {
    const res = await fetch(`/api/admin/written-competitions/${id}`, { headers: adminHeaders, cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to load competition');
    setCompetition(json.competition);
  }, [id]);

  const loadQuestions = useCallback(async () => {
    const res = await fetch(`/api/admin/written-competitions/${id}/questions`, { headers: adminHeaders, cache: 'no-store' });
    const json = await res.json();
    if (res.ok) setQuestions(json.questions || []);
  }, [id]);

  const loadPrizes = useCallback(async () => {
    const res = await fetch(`/api/admin/written-competitions/${id}/prizes`, { headers: adminHeaders, cache: 'no-store' });
    const json = await res.json();
    if (res.ok) setPrizes(json.prizes || []);
  }, [id]);

  const loadSubmissions = useCallback(async () => {
    const res = await fetch(`/api/admin/written-competitions/${id}/submissions`, { headers: adminHeaders, cache: 'no-store' });
    const json = await res.json();
    if (res.ok) {
      setSubmissions(json.submissions || []);
      setStats(json.stats || {});
    }
  }, [id]);

  const loadWinners = useCallback(async () => {
    const res = await fetch(`/api/admin/written-competitions/${id}/winners`, { headers: adminHeaders, cache: 'no-store' });
    const json = await res.json();
    if (res.ok) {
      setWinners(json.winners || []);
      setEligibleCount(json.eligibleCount || 0);
    }
  }, [id]);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('admin_auth') !== 'true') {
      router.push('/admin/login');
      return;
    }
    if (!id) return;
    loadCompetition().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'));
    void loadQuestions();
    void loadPrizes();
    void loadSubmissions();
    void loadWinners();
  }, [id, loadCompetition, loadPrizes, loadQuestions, loadSubmissions, loadWinners, router]);

  const filteredSubmissions = useMemo(
    () => (statusFilter === 'all' ? submissions : submissions.filter((row) => row.status === statusFilter)),
    [statusFilter, submissions]
  );

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!competition) return;
    setError('');
    const res = await fetch(`/api/admin/written-competitions/${id}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        ...competition,
        startDate: competition.startDate,
        closingDate: competition.closingDate,
        winnerAnnouncementDate: competition.winnerAnnouncementDate,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || 'Could not save settings');
      return;
    }
    setCompetition(json.competition);
    setMessage('Settings saved.');
  };

  const saveQuestion = async () => {
    if (!questionForm.questionText.trim()) return;
    const method = questionForm.id ? 'PUT' : 'POST';
    const res = await fetch(`/api/admin/written-competitions/${id}/questions`, {
      method,
      headers: adminHeaders,
      body: JSON.stringify(questionForm),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || 'Could not save question');
      return;
    }
    setQuestionForm({ ...emptyQuestion, id: '', questionNumber: questions.length + 1 });
    setMessage('Question saved. You can replace every question from this page.');
    await loadQuestions();
  };

  const uploadPrizeImage = async (file: File, field: 'prizeImageUrl' | 'sponsorLogoUrl') => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'written-prizes');
      const res = await fetch('/api/admin/vouchers/upload', {
        method: 'POST',
        headers: { 'x-admin-auth': 'true' },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      setPrizeForm((prev) => ({
        ...prev,
        [field]: json.url,
        ...(field === 'prizeImageUrl' ? { prizeImagePath: json.path || prev.prizeImagePath } : {}),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const savePrize = async () => {
    if (!prizeForm.prizeName.trim()) return;
    const method = prizeForm.id ? 'PUT' : 'POST';
    const res = await fetch(`/api/admin/written-competitions/${id}/prizes`, {
      method,
      headers: adminHeaders,
      body: JSON.stringify(prizeForm),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || 'Could not save prize');
      return;
    }
    setPrizeForm({
      id: '',
      prizeName: '',
      prizeDescription: '',
      prizeImageUrl: '',
      prizeImagePath: '',
      sponsor: '',
      sponsorLogoUrl: '',
      winnersCount: 1,
      prizeOrder: prizes.length + 1,
      active: true,
    });
    setMessage('Prize saved.');
    await loadPrizes();
  };

  const pickWinner = async () => {
    const res = await fetch(`/api/admin/written-competitions/${id}/winners`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ random: true }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || 'Could not select a winner');
      return;
    }
    setMessage(`Selected winner: ${json.winner?.displayName || json.submission?.userName}. Awaiting admin verification.`);
    await loadWinners();
    await loadSubmissions();
  };

  const confirmWinner = async (winnerId: string, publicDisplay: boolean) => {
    const res = await fetch(`/api/admin/written-competitions/${id}/winners`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ winnerId, action: 'confirm', publicDisplay }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || 'Could not confirm winner');
      return;
    }
    setMessage('Winner confirmed.');
    await loadWinners();
    await loadSubmissions();
  };

  const disqualifyWinner = async (winnerId: string) => {
    if (!disqualifyReason.trim()) {
      setError('Enter a disqualification reason before selecting another winner.');
      return;
    }
    const res = await fetch(`/api/admin/written-competitions/${id}/winners`, {
      method: 'PATCH',
      headers: adminHeaders,
      body: JSON.stringify({ winnerId, action: 'disqualify', reason: disqualifyReason.trim() }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || 'Could not disqualify');
      return;
    }
    setDisqualifyReason('');
    setMessage('Winner disqualified. You can randomly select another eligible entry.');
    await loadWinners();
    await loadSubmissions();
  };

  if (!competition) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <p className="text-slate-600">{error || 'Loading competition...'}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => router.push('/admin/written-competitions')} className="rounded-full border bg-white p-2 shadow-sm">
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">{categoryLabel(competition.category)}</p>
              <h1 className="text-3xl font-black text-slate-900">{competition.name}</h1>
              <p className="text-sm text-slate-500">/competitions/written/{competition.slug}</p>
            </div>
          </div>
          <button type="button" onClick={() => void loadSubmissions()} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold shadow-sm ring-1 ring-slate-200">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</div>}
        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>}

        <div className="flex flex-wrap gap-2">
          {(['settings', 'questions', 'prizes', 'submissions', 'winners'] as Tab[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`rounded-xl px-4 py-2 text-sm font-bold capitalize ${tab === item ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}
            >
              {item === 'questions' ? 'Question Management' : item === 'submissions' ? 'Quiz Submissions' : item}
            </button>
          ))}
        </div>

        {tab === 'settings' && (
          <form onSubmit={(event) => void saveSettings(event)} className="grid gap-4 rounded-2xl border bg-white p-5 shadow-sm">
            <label className="text-sm font-bold">
              Competition name
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2 font-normal"
                value={competition.name}
                onChange={(event) => setCompetition({ ...competition, name: event.target.value })}
              />
            </label>
            <label className="text-sm font-bold">
              Description
              <textarea
                className="mt-1 w-full rounded-xl border px-3 py-2 font-normal"
                rows={3}
                value={competition.description}
                onChange={(event) => setCompetition({ ...competition, description: event.target.value })}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold">
                Category
                <select
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-normal"
                  value={competition.category}
                  onChange={(event) => setCompetition({ ...competition, category: event.target.value as WrittenCompetition['category'] })}
                >
                  {WRITTEN_COMPETITION_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {categoryLabel(item)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-bold">
                Number of questions
                <input
                  type="number"
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-normal"
                  value={competition.questionCount}
                  onChange={(event) => setCompetition({ ...competition, questionCount: Number(event.target.value) })}
                />
              </label>
              <label className="text-sm font-bold">
                Start date
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-normal"
                  value={toLocalInput(competition.startDate)}
                  onChange={(event) => setCompetition({ ...competition, startDate: fromLocalInput(event.target.value) })}
                />
              </label>
              <label className="text-sm font-bold">
                Closing date
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-normal"
                  value={toLocalInput(competition.closingDate)}
                  onChange={(event) => setCompetition({ ...competition, closingDate: fromLocalInput(event.target.value) })}
                />
              </label>
              <label className="text-sm font-bold">
                Winner announcement date
                <input
                  type="datetime-local"
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-normal"
                  value={toLocalInput(competition.winnerAnnouncementDate)}
                  onChange={(event) => setCompetition({ ...competition, winnerAnnouncementDate: fromLocalInput(event.target.value) })}
                />
              </label>
              <label className="text-sm font-bold">
                Maximum answer length
                <input
                  type="number"
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-normal"
                  value={competition.maxAnswerLength}
                  onChange={(event) => setCompetition({ ...competition, maxAnswerLength: Number(event.target.value) })}
                />
              </label>
              <label className="text-sm font-bold">
                Minimum age
                <input
                  type="number"
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-normal"
                  value={competition.minAge ?? ''}
                  onChange={(event) => setCompetition({ ...competition, minAge: event.target.value === '' ? null : Number(event.target.value) })}
                />
              </label>
              <label className="text-sm font-bold">
                Maximum attempts
                <input
                  type="number"
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-normal"
                  value={competition.maxAttempts}
                  onChange={(event) => setCompetition({ ...competition, maxAttempts: Number(event.target.value) })}
                />
              </label>
              <label className="text-sm font-bold">
                Minimum score required
                <input
                  type="number"
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-normal"
                  value={competition.minScoreRequired}
                  onChange={(event) => setCompetition({ ...competition, minScoreRequired: Number(event.target.value) })}
                />
              </label>
              <label className="text-sm font-bold">
                Number of winners
                <input
                  type="number"
                  className="mt-1 w-full rounded-xl border px-3 py-2 font-normal"
                  value={competition.winnersCount}
                  onChange={(event) => setCompetition({ ...competition, winnersCount: Number(event.target.value) })}
                />
              </label>
            </div>
            <label className="text-sm font-bold">
              Rules
              <textarea
                className="mt-1 w-full rounded-xl border px-3 py-2 font-normal"
                rows={4}
                value={competition.rules}
                onChange={(event) => setCompetition({ ...competition, rules: event.target.value })}
              />
            </label>
            <label className="text-sm font-bold">
              Prize information
              <textarea
                className="mt-1 w-full rounded-xl border px-3 py-2 font-normal"
                rows={3}
                value={competition.prizeInformation}
                onChange={(event) => setCompetition({ ...competition, prizeInformation: event.target.value })}
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={competition.active}
                onChange={(event) => setCompetition({ ...competition, active: event.target.checked })}
              />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={competition.showWinnersPublicly}
                onChange={(event) => setCompetition({ ...competition, showWinnersPublicly: event.target.checked })}
              />
              Show confirmed winners publicly (first name + initial only)
            </label>
            <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white">
              Save settings
            </button>
          </form>
        )}

        {tab === 'questions' && (
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="font-black">{questionForm.id ? 'Edit question' : 'Add Question'}</h2>
              <div className="mt-4 grid gap-3">
                <input
                  type="number"
                  placeholder="Question number"
                  className="rounded-xl border px-3 py-2"
                  value={questionForm.questionNumber}
                  onChange={(event) => setQuestionForm({ ...questionForm, questionNumber: Number(event.target.value) })}
                />
                <textarea
                  placeholder="Question text"
                  rows={4}
                  className="rounded-xl border px-3 py-2"
                  value={questionForm.questionText}
                  onChange={(event) => setQuestionForm({ ...questionForm, questionText: event.target.value })}
                />
                <select
                  className="rounded-xl border px-3 py-2"
                  value={questionForm.difficulty}
                  onChange={(event) => setQuestionForm({ ...questionForm, difficulty: event.target.value as WrittenQuestionAdmin['difficulty'] })}
                >
                  {WRITTEN_QUESTION_DIFFICULTIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Topic / category"
                  className="rounded-xl border px-3 py-2"
                  value={questionForm.topic}
                  onChange={(event) => setQuestionForm({ ...questionForm, topic: event.target.value })}
                />
                <textarea
                  placeholder="Expected answer"
                  rows={3}
                  className="rounded-xl border px-3 py-2"
                  value={questionForm.expectedAnswer}
                  onChange={(event) => setQuestionForm({ ...questionForm, expectedAnswer: event.target.value })}
                />
                <textarea
                  placeholder="Marking guidance (admin only)"
                  rows={4}
                  className="rounded-xl border px-3 py-2"
                  value={questionForm.markingGuidance}
                  onChange={(event) => setQuestionForm({ ...questionForm, markingGuidance: event.target.value })}
                />
                <input
                  type="number"
                  placeholder="Maximum marks"
                  className="rounded-xl border px-3 py-2"
                  value={questionForm.maxMarks}
                  onChange={(event) => setQuestionForm({ ...questionForm, maxMarks: Number(event.target.value) })}
                />
                <input
                  type="number"
                  placeholder="Minimum required points"
                  className="rounded-xl border px-3 py-2"
                  value={questionForm.minRequiredPoints}
                  onChange={(event) => setQuestionForm({ ...questionForm, minRequiredPoints: Number(event.target.value) })}
                />
                <input
                  placeholder="Source / reference (admin enters this)"
                  className="rounded-xl border px-3 py-2"
                  value={questionForm.source}
                  onChange={(event) => setQuestionForm({ ...questionForm, source: event.target.value })}
                />
                <textarea
                  placeholder="Explanation"
                  rows={2}
                  className="rounded-xl border px-3 py-2"
                  value={questionForm.explanation}
                  onChange={(event) => setQuestionForm({ ...questionForm, explanation: event.target.value })}
                />
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={questionForm.active}
                    onChange={(event) => setQuestionForm({ ...questionForm, active: event.target.checked })}
                  />
                  Active
                </label>
                <button type="button" onClick={() => void saveQuestion()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white">
                  <Plus size={16} /> {questionForm.id ? 'Update question' : 'Add Question'}
                </button>
              </div>
            </section>
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="font-black">Questions ({questions.length})</h2>
              <div className="mt-4 space-y-3">
                {questions.map((question) => (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => setQuestionForm(question)}
                    className="w-full rounded-2xl border p-4 text-left hover:bg-slate-50"
                  >
                    <p className="text-xs font-bold uppercase text-emerald-700">
                      Q{question.questionNumber} · {question.difficulty} · {question.maxMarks} marks
                    </p>
                    <p className="mt-1 font-bold text-slate-900">{question.questionText}</p>
                    <p className="mt-1 text-xs text-slate-500">{question.active ? 'Active' : 'Inactive'} · {question.topic}</p>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === 'prizes' && (
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="font-black">{prizeForm.id ? 'Edit prize' : 'Add prize'}</h2>
              <div className="mt-4 grid gap-3">
                <input
                  placeholder="Prize name"
                  className="rounded-xl border px-3 py-2"
                  value={prizeForm.prizeName}
                  onChange={(event) => setPrizeForm({ ...prizeForm, prizeName: event.target.value })}
                />
                <textarea
                  placeholder="Prize description"
                  rows={3}
                  className="rounded-xl border px-3 py-2"
                  value={prizeForm.prizeDescription}
                  onChange={(event) => setPrizeForm({ ...prizeForm, prizeDescription: event.target.value })}
                />
                <input
                  placeholder="Sponsor"
                  className="rounded-xl border px-3 py-2"
                  value={prizeForm.sponsor}
                  onChange={(event) => setPrizeForm({ ...prizeForm, sponsor: event.target.value })}
                />
                <label className="text-sm font-bold">
                  Prize image
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="mt-1 block w-full text-sm font-normal"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadPrizeImage(file, 'prizeImageUrl');
                    }}
                  />
                </label>
                {prizeForm.prizeImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={prizeForm.prizeImageUrl} alt="" className="h-32 rounded-xl object-cover" />
                )}
                <label className="text-sm font-bold">
                  Sponsor logo
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="mt-1 block w-full text-sm font-normal"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadPrizeImage(file, 'sponsorLogoUrl');
                    }}
                  />
                </label>
                <input
                  type="number"
                  placeholder="Number of winners"
                  className="rounded-xl border px-3 py-2"
                  value={prizeForm.winnersCount}
                  onChange={(event) => setPrizeForm({ ...prizeForm, winnersCount: Number(event.target.value) })}
                />
                <input
                  type="number"
                  placeholder="Prize order"
                  className="rounded-xl border px-3 py-2"
                  value={prizeForm.prizeOrder}
                  onChange={(event) => setPrizeForm({ ...prizeForm, prizeOrder: Number(event.target.value) })}
                />
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input type="checkbox" checked={prizeForm.active} onChange={(event) => setPrizeForm({ ...prizeForm, active: event.target.checked })} />
                  Active
                </label>
                <button type="button" disabled={uploading} onClick={() => void savePrize()} className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white">
                  {uploading ? 'Uploading...' : 'Save prize'}
                </button>
              </div>
            </section>
            <section className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="font-black">Prizes</h2>
              <div className="mt-4 space-y-3">
                {prizes.map((prize) => (
                  <button key={prize.id} type="button" onClick={() => setPrizeForm({ ...prize, prizeImageUrl: prize.prizeImageUrl || '', prizeImagePath: prize.prizeImagePath || '', sponsorLogoUrl: prize.sponsorLogoUrl || '' })} className="w-full rounded-2xl border p-4 text-left">
                    <p className="font-black">{prize.prizeName}</p>
                    <p className="text-sm text-slate-600">{prize.prizeDescription}</p>
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === 'submissions' && (
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="font-black">Quiz Submissions</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-amber-50 p-3"><p className="text-2xl font-black">{stats.pendingQueue || 0}</p><p className="text-sm">Pending queue</p></div>
              <div className="rounded-xl bg-emerald-50 p-3"><p className="text-2xl font-black">{stats.eligible || 0}</p><p className="text-sm">Eligible</p></div>
              <div className="rounded-xl bg-sky-50 p-3"><p className="text-2xl font-black">{stats.reviewed || 0}</p><p className="text-sm">Reviewed</p></div>
              <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200"><p className="text-2xl font-black">{stats.total || 0}</p><p className="text-sm">Total</p></div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => setStatusFilter('all')} className={`rounded-full px-3 py-1 text-xs font-bold ${statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>All</button>
              {WRITTEN_SUBMISSION_STATUSES.map((status) => (
                <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`rounded-full px-3 py-1 text-xs font-bold ${statusFilter === status ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>
                  {SUBMISSION_STATUS_LABELS[status]}
                </button>
              ))}
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-slate-500">
                    <th className="px-3 py-2">Participant</th>
                    <th className="px-3 py-2 text-right">Score</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Submitted</th>
                    <th className="px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.map((row) => (
                    <tr key={row.id} className="border-b">
                      <td className="px-3 py-3">
                        <p className="font-bold">{row.userName || 'Participant'}</p>
                        <p className="text-xs text-slate-500">{row.email}</p>
                      </td>
                      <td className="px-3 py-3 text-right font-bold">{row.totalMarks} / {row.maxMarks}</td>
                      <td className="px-3 py-3">{SUBMISSION_STATUS_LABELS[row.status]}</td>
                      <td className="px-3 py-3 text-slate-500">{new Date(row.submittedAt).toLocaleString()}</td>
                      <td className="px-3 py-3">
                        <button type="button" onClick={() => router.push(`/admin/written-competitions/${id}/submissions/${row.id}`)} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white">
                          Open
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredSubmissions.length === 0 && <p className="px-3 py-8 text-center text-slate-500">No submissions in this filter.</p>}
            </div>
          </section>
        )}

        {tab === 'winners' && (
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-black">Winner selection</h2>
                <p className="text-sm text-slate-600">Eligible Entries: {eligibleCount}</p>
              </div>
              <button type="button" onClick={() => void pickWinner()} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-white">
                <Trophy size={16} /> Randomly Select Winner
              </button>
            </div>
            <label className="mt-4 block text-sm font-bold">
              Disqualification reason (required before picking another winner)
              <input className="mt-1 w-full rounded-xl border px-3 py-2 font-normal" value={disqualifyReason} onChange={(event) => setDisqualifyReason(event.target.value)} />
            </label>
            <div className="mt-5 space-y-3">
              {winners.map((winner) => (
                <article key={winner.id} className="rounded-2xl border p-4">
                  <p className="text-xs font-bold uppercase text-amber-700">Selected Winner</p>
                  <p className="font-black">{winner.userName || winner.displayName}</p>
                  <p className="text-sm text-slate-600">Public display name: {winner.displayName}</p>
                  <p className="text-sm text-slate-600">{WINNER_STATUS_LABELS[winner.status]}</p>
                  {winner.finalScore && <p className="text-sm text-slate-600">Final score: {winner.finalScore}</p>}
                  {winner.prizeName && <p className="text-sm text-slate-600">Prize: {winner.prizeName}</p>}
                  {winner.submittedAt && (
                    <p className="text-sm text-slate-600">Submitted: {new Date(winner.submittedAt).toLocaleString()}</p>
                  )}
                  {winner.status === 'awaiting_verification' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => void confirmWinner(winner.id, false)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white">
                        Confirm Winner
                      </button>
                      <button type="button" onClick={() => void confirmWinner(winner.id, true)} className="rounded-lg bg-emerald-800 px-3 py-2 text-xs font-bold text-white">
                        Confirm + show publicly
                      </button>
                      <button type="button" onClick={() => void disqualifyWinner(winner.id)} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white">
                        Disqualify Winner
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
