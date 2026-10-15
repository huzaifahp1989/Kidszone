'use client';

import Link from 'next/link';
import React from 'react';
import { useRouter } from 'next/navigation';
import {
  MONTHLY_WINNER_AGE_BRACKETS,
  formatMonthlyWinnerMonth,
  type AdminMonthlyWinner,
  type MonthlyWinnerAgeBracket,
} from '@/lib/monthly-winners';

type WinnerForm = {
  monthKey: string;
  firstName: string;
  ageBracket: MonthlyWinnerAgeBracket;
  city: string;
  parentGuardianConsent: boolean;
};

const currentMonth = () => new Date().toISOString().slice(0, 7);

export default function AdminMonthlyWinnersPage() {
  const router = useRouter();
  const [winners, setWinners] = React.useState<AdminMonthlyWinner[]>([]);
  const [form, setForm] = React.useState<WinnerForm>({
    monthKey: currentMonth(),
    firstName: '',
    ageBracket: '8-10',
    city: '',
    parentGuardianConsent: false,
  });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [message, setMessage] = React.useState('');

  const loadWinners = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/monthly-winners', { cache: 'no-store' });
      const data = await response.json();
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(data?.error || 'Could not load monthly winners.');
      setWinners(Array.isArray(data.winners) ? data.winners as AdminMonthlyWinner[] : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load monthly winners.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    void loadWinners();
  }, [loadWinners]);

  const addWinner = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/monthly-winners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, isPublished: false }),
      });
      const data = await response.json();
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(data?.error || 'Could not add winner.');
      setMessage('Winner saved privately. Publish it after the competition ends and parent/guardian approval is confirmed.');
      setForm((previous) => ({ ...previous, firstName: '', city: '', parentGuardianConsent: false }));
      await loadWinners();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not add winner.');
    } finally {
      setSaving(false);
    }
  };

  const setPublished = async (winner: AdminMonthlyWinner, isPublished: boolean) => {
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/monthly-winners', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: winner.id, isPublished }),
      });
      const data = await response.json();
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(data?.error || 'Could not update winner.');
      setMessage(isPublished ? 'Winner published.' : 'Winner unpublished.');
      await loadWinners();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Could not update winner.');
    }
  };

  const withdrawConsent = async (winner: AdminMonthlyWinner) => {
    if (!window.confirm(`Unpublish ${winner.first_name} and record that parent/guardian approval was withdrawn?`)) return;
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/monthly-winners', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: winner.id, parentGuardianConsent: false }),
      });
      const data = await response.json();
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(data?.error || 'Could not withdraw consent.');
      setMessage('Winner unpublished and parent/guardian approval withdrawn.');
      await loadWinners();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Could not withdraw consent.');
    }
  };

  const deleteWinner = async (winner: AdminMonthlyWinner) => {
    if (!window.confirm(`Delete ${winner.first_name} from ${formatMonthlyWinnerMonth(winner.month_key)} winners?`)) return;
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/admin/monthly-winners?id=${encodeURIComponent(winner.id)}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(data?.error || 'Could not delete winner.');
      setMessage('Winner deleted.');
      await loadWinners();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete winner.');
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Monthly winners</h1>
            <p className="mt-1 text-sm text-slate-600">Add winners after each competition and publish only with guardian approval.</p>
          </div>
          <Link href="/admin" className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800">
            ← Admin
          </Link>
        </header>

        <aside className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          Store and publish only a child&apos;s first name, age bracket, and city. Do not enter surnames or madrasah
          names. Confirm parent/guardian approval before saving, and leave winners unpublished until the competition
          has ended.
        </aside>

        {message ? <p className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800" role="status">{message}</p> : null}
        {error ? <p className="rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-800" role="alert">{error}</p> : null}

        <form onSubmit={addWinner} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Add a winner</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              Competition month
              <input
                type="month"
                value={form.monthKey}
                onChange={(event) => setForm((previous) => ({ ...previous, monthKey: event.target.value }))}
                required
                className="block w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              First name only
              <input
                value={form.firstName}
                onChange={(event) => setForm((previous) => ({ ...previous, firstName: event.target.value }))}
                maxLength={40}
                autoComplete="off"
                required
                className="block w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              Age bracket
              <select
                value={form.ageBracket}
                onChange={(event) => setForm((previous) => ({ ...previous, ageBracket: event.target.value as MonthlyWinnerAgeBracket }))}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                {MONTHLY_WINNER_AGE_BRACKETS.map((bracket) => (
                  <option key={bracket} value={bracket}>{bracket} years</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm font-semibold text-slate-700">
              City
              <input
                value={form.city}
                onChange={(event) => setForm((previous) => ({ ...previous, city: event.target.value }))}
                maxLength={100}
                autoComplete="off"
                required
                className="block w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
          </div>
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.parentGuardianConsent}
              onChange={(event) => setForm((previous) => ({ ...previous, parentGuardianConsent: event.target.checked }))}
              required
              className="mt-1"
            />
            <span>I confirm that this child&apos;s parent or guardian approved public sharing of their first name, age bracket, and city.</span>
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save privately'}
          </button>
        </form>

        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Saved winners</h2>
          {loading ? <p className="rounded-xl bg-white p-5 text-slate-600">Loading winners…</p> : null}
          {!loading && winners.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-5 text-slate-600">No monthly winners have been added.</p>
          ) : null}
          {winners.map((winner) => (
            <article key={winner.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
              <div>
                <h3 className="font-bold text-slate-900">{winner.first_name} · {formatMonthlyWinnerMonth(winner.month_key)}</h3>
                <p className="mt-1 text-sm text-slate-600">Age {winner.age_bracket} · {winner.city}</p>
                <p className={`mt-1 text-xs font-semibold ${winner.parent_guardian_consent ? 'text-emerald-700' : 'text-rose-700'}`}>
                  Parent/guardian approval {winner.parent_guardian_consent ? 'confirmed' : 'withdrawn'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void setPublished(winner, !winner.is_published)}
                  disabled={!winner.parent_guardian_consent}
                  className={`rounded-lg px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 ${
                    winner.is_published ? 'border border-amber-300 bg-amber-50 text-amber-900' : 'bg-teal-700 text-white'
                  }`}
                >
                  {winner.is_published ? 'Unpublish' : 'Publish'}
                </button>
                {winner.parent_guardian_consent ? (
                  <button
                    type="button"
                    onClick={() => void withdrawConsent(winner)}
                    className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm font-bold text-amber-800 hover:bg-amber-50"
                  >
                    Withdraw approval
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void deleteWinner(winner)}
                  className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
