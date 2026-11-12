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
  userId?: string | null;
};

type LearnerResult = {
  uid: string;
  name: string;
  email?: string | null;
  cityNormalized?: string | null;
  ageNormalized?: number | null;
};

const currentMonth = () => new Date().toISOString().slice(0, 7);

const adminHeaders = { 'x-admin-auth': 'true' };

const firstNameOf = (name: string) => name.trim().split(/\s+/)[0] || '';

const bracketForAge = (age: number | null | undefined): MonthlyWinnerAgeBracket | null => {
  if (age == null || !Number.isFinite(age)) return null;
  if (age <= 7) return '5-7';
  if (age <= 10) return '8-10';
  if (age <= 12) return '11-12';
  return '13-14';
};

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

  const [learnerQuery, setLearnerQuery] = React.useState('');
  const [learnerResults, setLearnerResults] = React.useState<LearnerResult[]>([]);
  const [learnerSearching, setLearnerSearching] = React.useState(false);
  const [linkedLearner, setLinkedLearner] = React.useState<{ uid: string; name: string } | null>(null);

  const [photo, setPhoto] = React.useState<{ url: string; path: string } | null>(null);
  const [photoUploading, setPhotoUploading] = React.useState(false);
  const photoInputRef = React.useRef<HTMLInputElement | null>(null);

  const [bulkText, setBulkText] = React.useState('');
  const [bulkMonth, setBulkMonth] = React.useState(currentMonth());
  const [bulkConsent, setBulkConsent] = React.useState(false);
  const [bulkSaving, setBulkSaving] = React.useState(false);

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

  React.useEffect(() => {
    const trimmed = learnerQuery.trim();
    if (trimmed.length < 2) {
      setLearnerResults([]);
      setLearnerSearching(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLearnerSearching(true);
      try {
        const response = await fetch(`/api/admin/users?q=${encodeURIComponent(trimmed)}`, {
          headers: adminHeaders,
          cache: 'no-store',
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Search failed');
        const users = Array.isArray(data.users) ? data.users : [];
        setLearnerResults(users.slice(0, 8) as LearnerResult[]);
      } catch {
        setLearnerResults([]);
      } finally {
        setLearnerSearching(false);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [learnerQuery]);

  const selectLearner = (learner: LearnerResult) => {
    setLinkedLearner({ uid: learner.uid, name: learner.name });
    setForm((previous) => ({
      ...previous,
      userId: learner.uid,
      firstName: previous.firstName || firstNameOf(learner.name),
      city: previous.city || String(learner.cityNormalized || ''),
      ageBracket: bracketForAge(learner.ageNormalized) || previous.ageBracket,
    }));
    setLearnerQuery('');
    setLearnerResults([]);
  };

  const clearLearner = () => {
    setLinkedLearner(null);
    setForm((previous) => ({ ...previous, userId: null }));
  };

  const uploadPhoto = async (file: File): Promise<{ url: string; path: string } | null> => {
    const body = new FormData();
    body.append('file', file);
    const response = await fetch('/api/admin/monthly-winners/upload', { method: 'POST', body });
    const data = await response.json();
    if (response.status === 401) {
      router.push('/admin/login');
      return null;
    }
    if (!response.ok) throw new Error(data?.error || 'Could not upload photo.');
    return { url: String(data.url), path: String(data.path) };
  };

  const handlePhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setMessage('');
    setPhotoUploading(true);
    try {
      const uploaded = await uploadPhoto(file);
      if (uploaded) setPhoto(uploaded);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Could not upload photo.');
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  const updateWinnerPhoto = async (winner: AdminMonthlyWinner, file: File) => {
    setError('');
    setMessage('');
    try {
      const uploaded = await uploadPhoto(file);
      if (!uploaded) return;
      const response = await fetch('/api/admin/monthly-winners', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: winner.id, photoUrl: uploaded.url, photoPath: uploaded.path }),
      });
      const data = await response.json();
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(data?.error || 'Could not update photo.');
      setMessage('Winner photo updated.');
      await loadWinners();
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : 'Could not update photo.');
    }
  };

  const removeWinnerPhoto = async (winner: AdminMonthlyWinner) => {
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/monthly-winners', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: winner.id, photoUrl: null }),
      });
      const data = await response.json();
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(data?.error || 'Could not remove photo.');
      setMessage('Winner photo removed.');
      await loadWinners();
    } catch (photoError) {
      setError(photoError instanceof Error ? photoError.message : 'Could not remove photo.');
    }
  };

  const parseBulkRows = (text: string) =>
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [firstName = '', ageBracket = '', city = ''] = line.split(/[|,\t]/).map((part) => part.trim());
        return { firstName, ageBracket: ageBracket.replace(/\s*-\s*/g, '-'), city };
      });

  const addBulkWinners = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');
    const rows = parseBulkRows(bulkText);
    if (rows.length === 0) {
      setError('Add at least one winner, one per line.');
      return;
    }
    if (!bulkConsent) {
      setError('Confirm parent/guardian approval before saving these winners.');
      return;
    }
    setBulkSaving(true);
    try {
      const winners = rows.map((row) => ({
        monthKey: bulkMonth,
        firstName: row.firstName,
        ageBracket: row.ageBracket,
        city: row.city,
        parentGuardianConsent: true,
        isPublished: false,
      }));
      const response = await fetch('/api/admin/monthly-winners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winners }),
      });
      const data = await response.json();
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(data?.error || 'Could not add winners.');
      const added = Number(data?.added ?? winners.length);
      const skipped = Number(data?.skipped ?? 0);
      const skipNote = skipped > 0 && Array.isArray(data?.errors) && data.errors[0] ? ` (${data.errors[0]})` : '';
      setMessage(`${added} winner${added === 1 ? '' : 's'} saved privately${skipped ? `, ${skipped} skipped${skipNote}` : ''}.`);
      setBulkText('');
      await loadWinners();
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : 'Could not add winners.');
    } finally {
      setBulkSaving(false);
    }
  };

  const addWinner = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/monthly-winners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          isPublished: false,
          ...(photo ? { photoUrl: photo.url, photoPath: photo.path } : {}),
        }),
      });
      const data = await response.json();
      if (response.status === 401) {
        router.push('/admin/login');
        return;
      }
      if (!response.ok) throw new Error(data?.error || 'Could not add winner.');
      setMessage('Winner saved privately. Publish it after the competition ends and parent/guardian approval is confirmed.');
      setForm((previous) => ({ ...previous, firstName: '', city: '', parentGuardianConsent: false, userId: null }));
      setLinkedLearner(null);
      setPhoto(null);
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

  const bulkCount = parseBulkRows(bulkText).length;

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
          Store and publish only a child&apos;s first name, age bracket, city, and an optional approved photo. Do not enter
          surnames or madrasah names. Confirm parent/guardian approval before saving, and leave winners unpublished
          until the competition has ended.
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
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Link to a learner (optional)</p>
            <p className="text-xs text-slate-500">
              Linking a learner also shows a winner tick next to their name on the leaderboard. Leave empty to show the winner on this page only.
            </p>
            {linkedLearner ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2">
                <span className="min-w-0 truncate text-sm font-semibold text-teal-900">Linked: {linkedLearner.name}</span>
                <button type="button" onClick={clearLearner} className="shrink-0 text-xs font-bold text-teal-800 underline">
                  Remove
                </button>
              </div>
            ) : (
              <>
                <input
                  type="search"
                  value={learnerQuery}
                  onChange={(event) => setLearnerQuery(event.target.value)}
                  placeholder="Search learner name or email…"
                  autoComplete="off"
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2"
                />
                {learnerSearching ? <p className="text-xs text-slate-500">Searching…</p> : null}
                {learnerResults.length > 0 ? (
                  <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                    {learnerResults.map((learner) => (
                      <li key={learner.uid} className="flex items-center justify-between gap-3 px-3 py-2">
                        <span className="min-w-0 truncate text-sm text-slate-800">
                          {learner.name}
                          {learner.email ? <span className="text-slate-500"> · {learner.email}</span> : null}
                        </span>
                        <button
                          type="button"
                          onClick={() => selectLearner(learner)}
                          className="shrink-0 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-bold text-white"
                        >
                          Link
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            )}
          </div>
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">Photo (optional)</p>
            <p className="text-xs text-slate-500">
              Only add a photo if the parent or guardian approved sharing it. It appears on the winners page.
            </p>
            {photo ? (
              <div className="flex items-center gap-3">
                <img src={photo.url} alt="Selected winner" className="h-16 w-16 rounded-xl border border-slate-200 object-cover" />
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50"
                >
                  Remove photo
                </button>
              </div>
            ) : (
              <input
                ref={photoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handlePhotoSelect}
                disabled={photoUploading}
                className="block w-full text-sm text-slate-700"
              />
            )}
            {photoUploading ? <p className="text-xs text-slate-500">Uploading photo…</p> : null}
          </div>
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.parentGuardianConsent}
              onChange={(event) => setForm((previous) => ({ ...previous, parentGuardianConsent: event.target.checked }))}
              required
              className="mt-1"
            />
            <span>I confirm that this child&apos;s parent or guardian approved public sharing of their first name, age bracket, city, and photo (if provided).</span>
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save privately'}
          </button>
        </form>

        <form onSubmit={addBulkWinners} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Add several winners in one go</h2>
            <p className="mt-1 text-sm text-slate-600">
              One winner per line, in the format <code className="rounded bg-slate-100 px-1">First name | age bracket | city</code>.
              They are saved privately and can be published individually afterwards.
            </p>
          </div>
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            Competition month
            <input
              type="month"
              value={bulkMonth}
              onChange={(event) => setBulkMonth(event.target.value)}
              required
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 sm:max-w-xs"
            />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            Winners
            <textarea
              value={bulkText}
              onChange={(event) => setBulkText(event.target.value)}
              rows={6}
              placeholder={'Fatima | 8-10 | London\nYusuf | 5-7 | Manchester\nAisha | 11-12 | Birmingham'}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
            />
          </label>
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={bulkConsent}
              onChange={(event) => setBulkConsent(event.target.checked)}
              className="mt-1"
            />
            <span>I confirm that each child&apos;s parent or guardian approved public sharing of their first name, age bracket, and city.</span>
          </label>
          <button
            type="submit"
            disabled={bulkSaving}
            className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {bulkSaving ? 'Saving…' : bulkCount > 0 ? `Save ${bulkCount} winner${bulkCount === 1 ? '' : 's'} privately` : 'Save winners privately'}
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
              <div className="flex min-w-0 items-center gap-3">
                {winner.photo_url ? (
                  <img
                    src={winner.photo_url}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 object-cover"
                  />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-[10px] font-semibold text-slate-400">
                    No photo
                  </span>
                )}
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900">{winner.first_name} · {formatMonthlyWinnerMonth(winner.month_key)}</h3>
                  <p className="mt-1 text-sm text-slate-600">Age {winner.age_bracket} · {winner.city}</p>
                  <p className={`mt-1 text-xs font-semibold ${winner.parent_guardian_consent ? 'text-emerald-700' : 'text-rose-700'}`}>
                    Parent/guardian approval {winner.parent_guardian_consent ? 'confirmed' : 'withdrawn'}
                  </p>
                  {winner.user_id ? (
                    <p className="mt-1 text-xs font-semibold text-teal-700">Winner tick shown on the leaderboard</p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                  {winner.photo_url ? 'Replace photo' : 'Add photo'}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void updateWinnerPhoto(winner, file);
                      event.target.value = '';
                    }}
                  />
                </label>
                {winner.photo_url ? (
                  <button
                    type="button"
                    onClick={() => void removeWinnerPhoto(winner)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Remove photo
                  </button>
                ) : null}
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
