'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, RefreshCw } from 'lucide-react';
import { WRITTEN_COMPETITION_CATEGORIES, categoryLabel, type WrittenCompetition } from '@/lib/written-competition';

const adminHeaders = { 'Content-Type': 'application/json', 'x-admin-auth': 'true' };

export default function AdminWrittenCompetitionsPage() {
  const router = useRouter();
  const [competitions, setCompetitions] = useState<WrittenCompetition[]>([]);
  const [tableMissing, setTableMissing] = useState(false);
  const [setupSql, setSetupSql] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('seerah');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/written-competitions', { headers: adminHeaders, cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setCompetitions(json.competitions || []);
      setTableMissing(Boolean(json.tableMissing));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('admin_auth') !== 'true') {
      router.push('/admin/login');
      return;
    }
    void load();
  }, [load, router]);

  const runSetup = async () => {
    setMessage('');
    setError('');
    const res = await fetch('/api/admin/written-competitions/setup', { method: 'POST', headers: adminHeaders });
    const json = await res.json();
    if (!res.ok) {
      setError(json.message || json.error || 'Setup failed');
      if (json.sql) setSetupSql(json.sql);
      return;
    }
    setMessage(json.message);
    await load();
    if (json.competitionId) router.push(`/admin/written-competitions/${json.competitionId}`);
  };

  const seedRabi = async () => {
    const res = await fetch('/api/admin/written-competitions', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ seedRabiUlAwwal: true }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || 'Could not create Rabi ul Awwal quiz');
      return;
    }
    router.push(`/admin/written-competitions/${json.competitionId}`);
  };

  const createCompetition = async () => {
    if (!name.trim()) return;
    const res = await fetch('/api/admin/written-competitions', {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ name: name.trim(), category }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || 'Could not create competition');
      return;
    }
    router.push(`/admin/written-competitions/${json.competition.id}`);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.push('/admin')} className="rounded-full border bg-white p-2 shadow-sm">
            <ArrowLeft size={18} />
          </button>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Written competitions</p>
            <h1 className="text-3xl font-black text-slate-900">Question management &amp; marking</h1>
          </div>
        </div>

        {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</div>}
        {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</div>}

        {tableMissing && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="font-bold text-amber-950">Database tables are not set up yet.</p>
            <button type="button" onClick={() => void runSetup()} className="mt-3 rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white">
              Try automatic setup
            </button>
            {setupSql && (
              <textarea readOnly value={setupSql} className="mt-4 h-48 w-full rounded-xl border bg-white p-3 font-mono text-xs" />
            )}
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-black text-slate-900">Create a new competition</h2>
          <p className="mt-1 text-sm text-slate-600">Reusable for Ramadan, Qur’an, Hadith, Muharram, or any written Islamic competition.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Competition name" className="flex-1 rounded-xl border px-4 py-3" />
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-xl border px-4 py-3">
              {WRITTEN_COMPETITION_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {categoryLabel(item)}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => void createCompetition()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white">
              <Plus size={16} /> Create
            </button>
          </div>
          <button type="button" onClick={() => void seedRabi()} className="mt-4 text-sm font-bold text-emerald-800">
            Create / restore Rabi ul Awwal Seerah Quiz
          </button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-slate-900">Competitions</h2>
            <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
          {loading && <p className="mt-4 text-sm text-slate-500">Loading...</p>}
          <div className="mt-4 space-y-3">
            {competitions.map((competition) => (
              <button
                key={competition.id}
                type="button"
                onClick={() => router.push(`/admin/written-competitions/${competition.id}`)}
                className="w-full rounded-2xl border border-slate-200 p-4 text-left hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-900">{competition.name}</p>
                    <p className="text-xs text-slate-500">
                      {categoryLabel(competition.category)} · /competitions/written/{competition.slug}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${competition.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                    {competition.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
