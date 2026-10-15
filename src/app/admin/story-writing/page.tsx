'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import {
  MAX_STORY_POINTS,
  MODERATION_FLAG_LABELS,
  POINT_COMPONENTS,
  PRIZE_RANK_LABELS,
  PRIZE_STATUSES,
  PRIZE_STATUS_LABELS,
  PRIZE_EXAMPLES,
  STORY_BADGES,
  STORY_STATUS_LABELS,
  categoryLabel,
  type ModerationFlag,
  type PointComponentKey,
  type PrizeStatus,
  type StoryStatus,
} from '@/lib/story-writing';

const headers = { 'Content-Type': 'application/json', 'x-admin-auth': 'true' };

type Story = {
  id: string;
  userId: string;
  displayName?: string;
  ageGroup: string;
  title: string;
  content: string;
  islamicLesson: string;
  category: string | null;
  illustrationUrl: string | null;
  status: StoryStatus;
  adminNotes: string | null;
  pointsAwarded: number;
  submittedAt: string | null;
  isFlagged: boolean;
  moderationFlags: string[];
};
type Challenge = { id: string; title: string; description: string; age_group: string; start_date: string; end_date: string; bonus_points: number; is_active: boolean };
type Prize = { id: string; rank: number; title: string; description: string; status: PrizeStatus; winnerName: string | null };
type Overview = {
  counts: { pending: number; approved: number; rejected: number; changesRequested: number };
  competition: { monthKey: string; top10: { rank: number; displayName: string; storyPoints: number; storiesApproved: number; totalPoints: number }[] };
  transactions: { id: string; story_id: string; user_id: string; points: number; displayName: string; created_at: string }[];
  badges: { user_id: string; badge_key: string; displayName: string; awarded_at: string }[];
};

const TABS = ['Pending', 'Approved', 'Rejected', 'Monthly Competition', 'Challenges', 'Points', 'Prizes', 'Badges'] as const;
type Tab = (typeof TABS)[number];
const TAB_STATUS: Partial<Record<Tab, string>> = { Pending: 'PENDING', Approved: 'APPROVED', Rejected: 'REJECTED' };

const EMPTY_CHALLENGE = { id: '', title: '', description: '', ageGroup: 'all', startDate: '', endDate: '', bonusPoints: 0, isActive: true };

const btn = 'rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50';
const field = 'w-full rounded-lg border border-slate-300 px-3 py-2';

export default function AdminStoryWritingPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('Pending');
  const [stories, setStories] = useState<Story[]>([]);
  const [search, setSearch] = useState('');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [competitions, setCompetitions] = useState<{ id: string; monthKey: string; status: string; prizes: Prize[] }[]>([]);
  const [selected, setSelected] = useState<Story | null>(null);
  const [points, setPoints] = useState(25);
  const [parts, setParts] = useState<PointComponentKey[]>(['approved']);
  const [notes, setNotes] = useState('');
  const [challengeForm, setChallengeForm] = useState(EMPTY_CHALLENGE);
  const [prizeForm, setPrizeForm] = useState({ competitionId: '', rank: 1, title: '', description: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [setupRequired, setSetupRequired] = useState(false);
  const [busy, setBusy] = useState(false);

  const call = useCallback(async (url: string, init?: RequestInit) => {
    const res = await fetch(url, { headers, cache: 'no-store', ...init });
    const json = await res.json().catch(() => ({}));
    if (res.status === 503 && json.setupRequired) setSetupRequired(true);
    if (!res.ok) throw new Error(json.error || 'Request failed');
    return json;
  }, []);

  const loadStories = useCallback(async () => {
    const status = TAB_STATUS[tab];
    if (!status) return;
    try {
      const q = new URLSearchParams({ status });
      if (search.trim()) q.set('q', search.trim());
      if (flaggedOnly) q.set('flagged', '1');
      setStories((await call(`/api/admin/story-writing/submissions?${q}`)).stories);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, [tab, search, flaggedOnly, call]);

  const loadOverview = useCallback(async () => {
    try {
      setOverview(await call('/api/admin/story-writing/overview'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  }, [call]);

  const loadChallenges = useCallback(async () => {
    try {
      setChallenges((await call('/api/admin/story-writing/challenges')).challenges);
    } catch {
      /* surfaced by other loaders */
    }
  }, [call]);

  const loadPrizes = useCallback(async () => {
    try {
      setCompetitions((await call('/api/admin/story-writing/prizes')).competitions);
    } catch {
      /* surfaced by other loaders */
    }
  }, [call]);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('admin_auth') !== 'true') {
      router.push('/admin/login');
      return;
    }
    setError('');
    void loadOverview();
    if (TAB_STATUS[tab]) void loadStories();
    if (tab === 'Challenges') void loadChallenges();
    if (tab === 'Prizes') void loadPrizes();
  }, [tab, loadStories, loadOverview, loadChallenges, loadPrizes, router]);

  const suggested = useMemo(() => parts.reduce((s, k) => s + (POINT_COMPONENTS.find((c) => c.key === k)?.points ?? 0), 0), [parts]);

  const open = (story: Story) => {
    setSelected(story);
    setNotes(story.status === 'APPROVED' ? story.adminNotes ?? '' : '');
    setPoints(story.status === 'APPROVED' ? story.pointsAwarded : 25);
    setParts(['approved']);
    setMsg('');
  };

  const toggle = (key: PointComponentKey) => {
    const next = parts.includes(key) ? parts.filter((k) => k !== key) : [...parts, key];
    setParts(next);
    setPoints(Math.min(MAX_STORY_POINTS, next.reduce((s, k) => s + (POINT_COMPONENTS.find((c) => c.key === k)?.points ?? 0), 0)));
  };

  const review = async (action: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES') => {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      const json = await call(`/api/admin/story-writing/submissions/${selected.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action, points, breakdown: parts, notes }),
      });
      setMsg(action === 'APPROVE' ? `Approved with ${points} points.${json.newBadges?.length ? ` New badges: ${json.newBadges.join(', ')}` : ''}` : 'Feedback sent to the child.');
      setSelected(null);
      await Promise.all([loadStories(), loadOverview()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const flag = async (story: Story) => {
    try {
      await call(`/api/admin/story-writing/submissions/${story.id}`, { method: 'PATCH', body: JSON.stringify({ action: story.isFlagged ? 'UNFLAG' : 'FLAG' }) });
      setSelected(null);
      await loadStories();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  const saveChallenge = async () => {
    try {
      await call('/api/admin/story-writing/challenges', {
        method: challengeForm.id ? 'PUT' : 'POST',
        body: JSON.stringify(challengeForm),
      });
      setChallengeForm(EMPTY_CHALLENGE);
      setMsg('Challenge saved.');
      await loadChallenges();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  const deleteChallenge = async (id: string) => {
    if (!window.confirm('Delete this challenge?')) return;
    try {
      await call(`/api/admin/story-writing/challenges?id=${id}`, { method: 'DELETE' });
      await loadChallenges();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  const prizeCall = async (method: string, body: unknown, url = '/api/admin/story-writing/prizes') => {
    try {
      await call(url, { method, body: JSON.stringify(body) });
      setError('');
      await loadPrizes();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  const counts = overview?.counts;

  return (
    <main className="mx-auto max-w-6xl p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Link href="/admin" aria-label="Back to admin" className="rounded-lg bg-slate-100 p-2"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-2xl font-bold">✍️ Story Submissions</h1>
        </div>
        <button type="button" className={`${btn} bg-slate-100`} onClick={() => { void loadOverview(); void loadStories(); }}>
          <RefreshCw className="mr-1 inline h-4 w-4" /> Refresh
        </button>
      </div>

      {setupRequired && (
        <p className="mb-3 rounded-lg bg-amber-100 p-3 text-amber-900">
          Story tables are missing. Apply <code>supabase/migrations/20261004_story_writing_challenge.sql</code> in the Supabase SQL editor.
        </p>
      )}
      {msg && <p className="mb-3 rounded-lg bg-emerald-100 p-3 text-emerald-900">{msg}</p>}
      {error && <p className="mb-3 rounded-lg bg-rose-100 p-3 text-rose-900">{error}</p>}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[['Pending', counts?.pending], ['Approved', counts?.approved], ['Rejected', counts?.rejected], ['Changes requested', counts?.changesRequested]].map(([label, n]) => (
          <div key={String(label)} className="rounded-xl bg-white p-3 text-center shadow"><div className="text-2xl font-bold">{n ?? '–'}</div><div className="text-xs text-slate-500">{label}</div></div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`${btn} ${tab === t ? 'bg-emerald-600 text-white' : 'bg-white shadow'}`}>{t}</button>
        ))}
      </div>

      {TAB_STATUS[tab] && (
        <section>
          <div className="mb-3 flex flex-wrap gap-2">
            <input className={`${field} sm:max-w-xs`} placeholder="Search title, child, ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} /> Flagged only</label>
          </div>
          <div className="overflow-x-auto rounded-xl bg-white shadow">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr><th className="p-2">Story</th><th className="p-2">Child</th><th className="p-2">Age</th><th className="p-2">Category</th><th className="p-2">Submitted</th><th className="p-2">Status</th><th className="p-2">Points</th><th className="p-2" /></tr>
              </thead>
              <tbody>
                {stories.length === 0 && <tr><td className="p-4 text-slate-500" colSpan={8}>No stories.</td></tr>}
                {stories.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="p-2"><div className="font-semibold">{s.title}</div><div className="font-mono text-xs text-slate-400">{s.id.slice(0, 8)}</div>{s.isFlagged && <span className="text-xs font-bold text-rose-600">⚠ flagged</span>}</td>
                    <td className="p-2">{s.displayName}<div className="font-mono text-xs text-slate-400">{s.userId.slice(0, 8)}</div></td>
                    <td className="p-2">{s.ageGroup}</td>
                    <td className="p-2">{categoryLabel(s.category)}</td>
                    <td className="p-2">{s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : '–'}</td>
                    <td className="p-2">{STORY_STATUS_LABELS[s.status]}</td>
                    <td className="p-2">{s.pointsAwarded}</td>
                    <td className="p-2"><button type="button" className={`${btn} bg-emerald-600 text-white`} onClick={() => open(s)}>Review</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'Monthly Competition' && (
        <section className="rounded-xl bg-white p-4 shadow">
          <h2 className="mb-2 text-lg font-bold">Standings for {overview?.competition.monthKey}</h2>
          <SimpleTable rows={(overview?.competition.top10 ?? []).map((e) => [`#${e.rank}`, e.displayName, e.storyPoints, e.storiesApproved, e.totalPoints])} head={['Rank', 'Child', 'Story pts', 'Approved', 'Total pts']} />
        </section>
      )}

      {tab === 'Challenges' && (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-2 rounded-xl bg-white p-4 shadow">
            <h2 className="font-bold">{challengeForm.id ? 'Edit challenge' : 'New challenge'}</h2>
            <input className={field} placeholder="Title" value={challengeForm.title} onChange={(e) => setChallengeForm({ ...challengeForm, title: e.target.value })} />
            <textarea className={field} placeholder="Description" value={challengeForm.description} onChange={(e) => setChallengeForm({ ...challengeForm, description: e.target.value })} />
            <select className={field} value={challengeForm.ageGroup} onChange={(e) => setChallengeForm({ ...challengeForm, ageGroup: e.target.value })}>
              {['all', '5-7', '8-10', '11-14'].map((a) => <option key={a} value={a}>{a === 'all' ? 'All ages' : `Ages ${a}`}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-sm">Start<input type="date" className={field} value={challengeForm.startDate} onChange={(e) => setChallengeForm({ ...challengeForm, startDate: e.target.value })} /></label>
              <label className="text-sm">End<input type="date" className={field} value={challengeForm.endDate} onChange={(e) => setChallengeForm({ ...challengeForm, endDate: e.target.value })} /></label>
            </div>
            <label className="text-sm">Optional bonus points<input type="number" min={0} max={100} className={field} value={challengeForm.bonusPoints} onChange={(e) => setChallengeForm({ ...challengeForm, bonusPoints: Number(e.target.value) })} /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={challengeForm.isActive} onChange={(e) => setChallengeForm({ ...challengeForm, isActive: e.target.checked })} /> Active</label>
            <div className="flex gap-2">
              <button type="button" className={`${btn} bg-emerald-600 text-white`} onClick={saveChallenge}>Save</button>
              {challengeForm.id && <button type="button" className={`${btn} bg-slate-100`} onClick={() => setChallengeForm(EMPTY_CHALLENGE)}>Cancel</button>}
            </div>
          </div>
          <div className="grid content-start gap-2">
            {challenges.map((c) => (
              <div key={c.id} className="rounded-xl bg-white p-3 shadow">
                <div className="font-bold">{c.title} {!c.is_active && <span className="text-xs text-slate-400">(inactive)</span>}</div>
                <div className="text-sm text-slate-600">{c.description}</div>
                <div className="text-xs text-slate-500">{c.age_group} · {c.start_date} → {c.end_date} · bonus {c.bonus_points}</div>
                <div className="mt-2 flex gap-2">
                  <button type="button" className={`${btn} bg-slate-100`} onClick={() => setChallengeForm({ id: c.id, title: c.title, description: c.description, ageGroup: c.age_group, startDate: c.start_date, endDate: c.end_date, bonusPoints: c.bonus_points, isActive: c.is_active })}>Edit</button>
                  <button type="button" className={`${btn} bg-rose-50 text-rose-700`} onClick={() => deleteChallenge(c.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'Points' && (
        <section className="rounded-xl bg-white p-4 shadow">
          <h2 className="mb-2 text-lg font-bold">Points transactions (one per approved story)</h2>
          <SimpleTable head={['Child', 'Story', 'Points', 'Updated']} rows={(overview?.transactions ?? []).map((t) => [t.displayName, t.story_id.slice(0, 8), t.points, new Date(t.created_at).toLocaleDateString()])} />
        </section>
      )}

      {tab === 'Prizes' && (
        <section className="grid gap-4">
          <p className="rounded-lg bg-white p-3 text-sm shadow">Examples: {PRIZE_EXAMPLES.join(', ')}. Winners are assigned automatically when the month ends.</p>
          {competitions.map((c) => (
            <div key={c.id} className="rounded-xl bg-white p-4 shadow">
              <h2 className="mb-2 font-bold">{c.monthKey} ({c.status})</h2>
              {c.prizes.map((p) => (
                <div key={p.id} className="mb-2 flex flex-wrap items-center gap-2 border-t pt-2">
                  <div className="min-w-48 flex-1"><strong>{PRIZE_RANK_LABELS[p.rank]}</strong>: {p.title}<div className="text-xs text-slate-500">Winner: {p.winnerName ?? 'not decided yet'}</div></div>
                  <select className="rounded-lg border px-2 py-2 text-sm" value={p.status} onChange={(e) => prizeCall('PATCH', { id: p.id, status: e.target.value })}>
                    {PRIZE_STATUSES.map((s) => <option key={s} value={s}>{PRIZE_STATUS_LABELS[s]}</option>)}
                  </select>
                  <button type="button" className={`${btn} bg-slate-100`} onClick={() => { const title = window.prompt('Prize title', p.title); if (title) void prizeCall('PATCH', { id: p.id, title }); }}>Rename</button>
                  <button type="button" className={`${btn} bg-rose-50 text-rose-700`} onClick={() => { if (window.confirm('Delete prize?')) void prizeCall('DELETE', undefined, `/api/admin/story-writing/prizes?id=${p.id}`); }}>Delete</button>
                </div>
              ))}
              <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                <select className="rounded-lg border px-2 py-2" value={prizeForm.competitionId === c.id ? prizeForm.rank : 1} onChange={(e) => setPrizeForm({ ...prizeForm, competitionId: c.id, rank: Number(e.target.value) })}>
                  {[1, 2, 3, 4].map((r) => <option key={r} value={r}>{PRIZE_RANK_LABELS[r]}</option>)}
                </select>
                <input className="min-w-48 flex-1 rounded-lg border px-3 py-2" placeholder="Prize (e.g. Amazon voucher)" value={prizeForm.competitionId === c.id ? prizeForm.title : ''} onChange={(e) => setPrizeForm({ ...prizeForm, competitionId: c.id, title: e.target.value })} />
                <button type="button" className={`${btn} bg-emerald-600 text-white`} onClick={() => { if (prizeForm.competitionId === c.id && prizeForm.title.trim()) { void prizeCall('POST', prizeForm); setPrizeForm({ competitionId: '', rank: 1, title: '', description: '' }); } }}>Add prize</button>
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === 'Badges' && (
        <section className="grid gap-4">
          <div className="grid gap-2 rounded-xl bg-white p-4 shadow sm:grid-cols-2">
            {STORY_BADGES.map((b) => <div key={b.key}><span className="text-xl">{b.icon}</span> <strong>{b.label}</strong><div className="text-xs text-slate-500">{b.description}</div></div>)}
          </div>
          <div className="rounded-xl bg-white p-4 shadow">
            <h2 className="mb-2 font-bold">Recently awarded (automatic)</h2>
            <SimpleTable head={['Child', 'Badge', 'Date']} rows={(overview?.badges ?? []).map((b) => [b.displayName, STORY_BADGES.find((x) => x.key === b.badge_key)?.label ?? b.badge_key, new Date(b.awarded_at).toLocaleDateString()])} />
          </div>
        </section>
      )}

      {selected && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2" onClick={() => setSelected(null)}>
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold">{selected.title}</h2>
            <p className="text-sm text-slate-500">{selected.displayName} · age {selected.ageGroup} · {categoryLabel(selected.category)} · {STORY_STATUS_LABELS[selected.status]}</p>
            <p className="font-mono text-xs text-slate-400">Story {selected.id} · User {selected.userId}</p>
            {selected.moderationFlags.length > 0 && (
              <p className="my-2 rounded-lg bg-rose-50 p-2 text-sm text-rose-800">⚠ Auto-flags: {selected.moderationFlags.map((f) => MODERATION_FLAG_LABELS[f as ModerationFlag] ?? f).join(', ')}</p>
            )}
            {selected.illustrationUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selected.illustrationUrl} alt="Illustration" className="my-2 max-h-64 rounded-lg" />
            )}
            <p className="my-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3">{selected.content}</p>
            <p className="rounded-lg bg-emerald-50 p-3"><strong>Islamic lesson:</strong> {selected.islamicLesson}</p>

            <div className="mt-4 grid gap-2">
              <div className="text-sm font-semibold">Suggested point components (total {suggested}; only the number below is awarded)</div>
              <div className="flex flex-wrap gap-2">
                {POINT_COMPONENTS.map((c) => (
                  <button key={c.key} type="button" onClick={() => toggle(c.key)} className={`${btn} ${parts.includes(c.key) ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}>{c.label} +{c.points}</button>
                ))}
              </div>
              <label className="text-sm font-semibold">Points to award (0–{MAX_STORY_POINTS})
                <input type="number" min={0} max={MAX_STORY_POINTS} className={field} value={points} onChange={(e) => setPoints(Number(e.target.value))} />
              </label>
              <label className="text-sm font-semibold">Feedback for the child {selected.status !== 'APPROVED' && '(required to reject / request changes)'}
                <textarea className={field} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy || selected.status === 'DRAFT'} className={`${btn} bg-emerald-600 text-white`} onClick={() => review('APPROVE')}>{selected.status === 'APPROVED' ? 'Update points' : 'Approve'}</button>
                <button type="button" disabled={busy || selected.status === 'DRAFT'} className={`${btn} bg-orange-500 text-white`} onClick={() => review('REQUEST_CHANGES')}>Request changes</button>
                <button type="button" disabled={busy || selected.status === 'DRAFT'} className={`${btn} bg-rose-600 text-white`} onClick={() => review('REJECT')}>Reject</button>
                <button type="button" className={`${btn} bg-slate-200`} onClick={() => flag(selected)}>{selected.isFlagged ? 'Remove flag' : 'Flag content'}</button>
                <button type="button" className={`${btn} bg-white border`} onClick={() => setSelected(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function SimpleTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-slate-500"><tr>{head.map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td className="p-3 text-slate-500" colSpan={head.length}>Nothing yet.</td></tr>}
          {rows.map((r, i) => <tr key={i} className="border-t">{r.map((c, j) => <td key={j} className="p-2">{c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}
