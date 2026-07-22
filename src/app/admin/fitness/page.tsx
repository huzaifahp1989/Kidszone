'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Challenge {
  id: string;
  name: string;
  description: string;
  goalType: 'steps' | 'minutes';
  goalTarget: number;
  points: number;
  ageGroup: string;
  active: boolean;
}

const adminHeaders = { 'Content-Type': 'application/json', 'x-admin-auth': 'true' };
const emptyForm = { id: '', name: '', description: '', goalType: 'steps' as 'steps' | 'minutes', goalTarget: 5000, points: 50, ageGroup: 'All ages', active: false };

export default function AdminFitnessPage() {
  const router = useRouter();
  const [challenges, setChallenges] = React.useState<Challenge[]>([]);
  const [stats, setStats] = React.useState<Record<string, number> | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [tableMissing, setTableMissing] = React.useState(false);
  const [setupSql, setSetupSql] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [error, setError] = React.useState('');
  const [form, setForm] = React.useState({ ...emptyForm });
  const [bonusUser, setBonusUser] = React.useState('');
  const [bonusPoints, setBonusPoints] = React.useState(50);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/fitness/challenges', { headers: adminHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setChallenges(data.challenges || []);
      setTableMissing(Boolean(data.tableMissing));
      if (!data.tableMissing) {
        const s = await fetch('/api/admin/fitness/manage', { headers: adminHeaders });
        const sj = await s.json();
        if (s.ok && sj.stats) setStats(sj.stats);
      }
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
      const res = await fetch('/api/admin/fitness/setup', { method: 'POST', headers: adminHeaders });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || 'Setup failed');
        if (data.sql) setSetupSql(data.sql);
        return;
      }
      setMessage(data.message + (data.seeded ? ` Seeded ${data.seeded} default challenges.` : ''));
      setTableMissing(false);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Setup failed');
    }
  };

  const save = async () => {
    setMessage('');
    setError('');
    if (!form.name.trim()) return setError('Name is required.');
    try {
      const res = await fetch('/api/admin/fitness/challenges', {
        method: form.id ? 'PUT' : 'POST',
        headers: adminHeaders,
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setMessage(form.id ? 'Challenge updated.' : 'Challenge created.');
      setForm({ ...emptyForm });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const toggleActive = async (c: Challenge) => {
    await fetch('/api/admin/fitness/challenges', { method: 'PUT', headers: adminHeaders, body: JSON.stringify({ id: c.id, active: !c.active }) });
    load();
  };

  const remove = async (c: Challenge) => {
    if (!window.confirm(`Delete "${c.name}"?`)) return;
    await fetch(`/api/admin/fitness/challenges?id=${encodeURIComponent(c.id)}`, { method: 'DELETE', headers: adminHeaders });
    load();
  };

  const reset = async () => {
    if (!window.confirm('Reset the competition? This deletes ALL step activity and fitness badges.')) return;
    const res = await fetch('/api/admin/fitness/manage', { method: 'POST', headers: adminHeaders, body: JSON.stringify({ action: 'reset' }) });
    const data = await res.json();
    setMessage(res.ok ? data.message : data.error);
    load();
  };

  const giveBonus = async () => {
    if (!bonusUser.trim()) return setError('Enter a user ID for the bonus.');
    const res = await fetch('/api/admin/fitness/manage', { method: 'POST', headers: adminHeaders, body: JSON.stringify({ action: 'bonus', userId: bonusUser.trim(), points: bonusPoints }) });
    const data = await res.json();
    setMessage(res.ok ? `Awarded ${data.awarded} points.` : data.error);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-slate-900">Fitness Challenge — Manage</h1>
          <Link href="/admin" className="text-sm font-bold text-violet-700 hover:underline">← Admin</Link>
        </div>

        {tableMissing ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
            <p className="font-bold text-amber-800">The Fitness tables are not set up yet.</p>
            <button type="button" onClick={runSetup} className="mt-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700">Create tables &amp; seed challenges</button>
          </div>
        ) : (
          <button type="button" onClick={runSetup} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100">Re-run setup</button>
        )}

        {message ? <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">{message}</p> : null}
        {error ? <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
        {setupSql ? (
          <details className="rounded-lg border border-slate-300 bg-white p-3">
            <summary className="cursor-pointer text-sm font-bold text-slate-700">Show SQL to run manually</summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">{setupSql}</pre>
          </details>
        ) : null}

        {stats ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ['Participants', stats.totalParticipants],
              ['Active today', stats.activeToday],
              ['Steps today', stats.stepsToday],
              ['Goals met today', stats.goalsMetToday],
              ['Flagged days', stats.flaggedDays],
              ['All-time steps', stats.totalStepsAllTime],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold text-slate-500">{label}</p>
                <p className="text-xl font-black text-slate-900">{Number(value).toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <a href="/api/admin/fitness/manage?export=csv" className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-100">Export CSV</a>
          <button type="button" onClick={reset} className="rounded-lg bg-rose-100 px-3 py-1.5 text-sm font-bold text-rose-700 hover:bg-rose-200">Reset competition</button>
        </div>

        {/* Challenge form */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-bold text-slate-900">{form.id ? 'Edit challenge' : 'Create a walking challenge'}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
              Name
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Goal type
              <select value={form.goalType} onChange={(e) => setForm((f) => ({ ...f, goalType: e.target.value as 'steps' | 'minutes' }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2">
                <option value="steps">Steps</option>
                <option value="minutes">Minutes walked</option>
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Goal target
              <input type="number" value={form.goalTarget} onChange={(e) => setForm((f) => ({ ...f, goalTarget: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Points
              <input type="number" value={form.points} onChange={(e) => setForm((f) => ({ ...f, points: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} /> Active challenge
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={save} className="rounded-lg bg-violet-600 px-5 py-2 font-bold text-white hover:bg-violet-700">{form.id ? 'Update' : 'Create'}</button>
            {form.id ? <button type="button" onClick={() => setForm({ ...emptyForm })} className="rounded-lg border border-slate-300 px-4 py-2 font-bold text-slate-600 hover:bg-slate-100">Cancel</button> : null}
          </div>
        </div>

        {/* Challenge list */}
        <div className="space-y-2">
          {loading ? <p className="text-slate-500">Loading…</p> : challenges.length === 0 ? <p className="text-slate-500">No challenges yet.</p> : challenges.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <div>
                <p className="font-semibold text-slate-900">{c.name} {c.active ? <span className="text-xs text-emerald-600">● active</span> : null}</p>
                <p className="text-xs text-slate-500">{c.goalTarget.toLocaleString()} {c.goalType} · {c.points} points</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => toggleActive(c)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-200">{c.active ? 'Deactivate' : 'Activate'}</button>
                <button type="button" onClick={() => setForm({ id: c.id, name: c.name, description: c.description, goalType: c.goalType, goalTarget: c.goalTarget, points: c.points, ageGroup: c.ageGroup, active: c.active })} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-slate-200">Edit</button>
                <button type="button" onClick={() => remove(c)} className="rounded-lg bg-rose-100 px-3 py-1.5 text-sm font-bold text-rose-700 hover:bg-rose-200">Delete</button>
              </div>
            </div>
          ))}
        </div>

        {/* Bonus points */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 font-bold text-slate-900">Award bonus points</h2>
          <div className="flex flex-wrap items-center gap-2">
            <input value={bonusUser} onChange={(e) => setBonusUser(e.target.value)} placeholder="User ID (uid)" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input type="number" value={bonusPoints} onChange={(e) => setBonusPoints(Number(e.target.value))} className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button type="button" onClick={giveBonus} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">Award</button>
          </div>
        </div>
      </div>
    </div>
  );
}
