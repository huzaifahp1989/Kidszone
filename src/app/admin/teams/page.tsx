'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, Plus, RefreshCw, Trash2, UserPlus, X, ArrowLeft } from 'lucide-react';

const adminHeaders = { 'x-admin-auth': 'true' };

type AdminTeam = {
  id: string;
  name: string;
  description: string | null;
  emoji: string;
  colour: string;
  joinCode: string;
  isActive: boolean;
  memberCount: number;
};

type RosterMember = {
  uid: string;
  name: string;
  role: 'member' | 'captain';
  totalPoints: number;
};

type LearnerResult = {
  uid: string;
  name: string;
};

export default function AdminTeamsPage() {
  const router = useRouter();
  const [teams, setTeams] = React.useState<AdminTeam[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [setupRequired, setSetupRequired] = React.useState(false);

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [emoji, setEmoji] = React.useState('🕌');

  const [selectedTeamId, setSelectedTeamId] = React.useState<string | null>(null);
  const [roster, setRoster] = React.useState<RosterMember[]>([]);
  const [rosterLoading, setRosterLoading] = React.useState(false);
  const [learnerQuery, setLearnerQuery] = React.useState('');
  const [learnerResults, setLearnerResults] = React.useState<LearnerResult[]>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const auth = sessionStorage.getItem('adminAuth') || localStorage.getItem('admin_auth');
      if (auth !== 'true') {
        router.push('/admin/login');
        return;
      }
      const res = await fetch('/api/admin/teams', { headers: adminHeaders, cache: 'no-store' });
      const data = await res.json();
      if (data?.setupRequired) {
        setSetupRequired(true);
        setTeams([]);
        return;
      }
      if (!res.ok) throw new Error(data?.error || 'Failed to load teams');
      setTeams(Array.isArray(data.teams) ? data.teams : []);
      setSetupRequired(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    load();
  }, [load]);

  const loadRoster = React.useCallback(async (teamId: string) => {
    setRosterLoading(true);
    setSelectedTeamId(teamId);
    try {
      const res = await fetch(`/api/admin/teams?teamId=${encodeURIComponent(teamId)}`, {
        headers: adminHeaders,
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load roster');
      setRoster(Array.isArray(data.roster) ? data.roster : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load roster');
      setRoster([]);
    } finally {
      setRosterLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const trimmed = learnerQuery.trim();
    if (trimmed.length < 2) {
      setLearnerResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/users?q=${encodeURIComponent(trimmed)}`, {
          headers: adminHeaders,
          cache: 'no-store',
        });
        const data = await res.json();
        setLearnerResults(Array.isArray(data.users) ? data.users.slice(0, 8) : []);
      } catch {
        setLearnerResults([]);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [learnerQuery]);

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: { ...adminHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), emoji: emoji.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to create team');
      setName('');
      setDescription('');
      setEmoji('🕌');
      setMessage(`Team created. Join code: ${data?.team?.join_code || ''}`);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create team');
    } finally {
      setBusy(false);
    }
  };

  const refreshCode = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/teams', {
        method: 'PATCH',
        headers: { ...adminHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, regenerateCode: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to refresh code');
      setMessage(`New code: ${data?.team?.join_code || ''}`);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to refresh code');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (team: AdminTeam) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/teams', {
        method: 'PATCH',
        headers: { ...adminHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: team.id, isActive: !team.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to update team');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update team');
    } finally {
      setBusy(false);
    }
  };

  const removeTeam = async (id: string, teamName: string) => {
    if (!window.confirm(`Delete "${teamName}"? All members will be removed.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/teams?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: adminHeaders,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to delete team');
      if (selectedTeamId === id) {
        setSelectedTeamId(null);
        setRoster([]);
      }
      setMessage('Team deleted.');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete team');
    } finally {
      setBusy(false);
    }
  };

  const addMember = async (userId: string) => {
    if (!selectedTeamId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/teams/members', {
        method: 'POST',
        headers: { ...adminHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: selectedTeamId, userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to add member');
      setLearnerQuery('');
      setLearnerResults([]);
      await Promise.all([loadRoster(selectedTeamId), load()]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async (userId: string) => {
    if (!selectedTeamId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/teams/members?teamId=${encodeURIComponent(selectedTeamId)}&userId=${encodeURIComponent(userId)}`,
        { method: 'DELETE', headers: adminHeaders }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to remove member');
      await Promise.all([loadRoster(selectedTeamId), load()]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    } finally {
      setBusy(false);
    }
  };

  const selectedTeam = teams.find((team) => team.id === selectedTeamId) || null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft size={16} /> Admin
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900">
            <Users size={24} /> Team Management
          </h1>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {setupRequired ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Database setup needed: run the migration <code className="text-xs">20261101_create_teams.sql</code> in Supabase.
        </div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm font-semibold text-rose-900">
          {error}
        </div>
      ) : null}

      <form onSubmit={createTeam} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-3 font-bold text-slate-900">Create a team</p>
        <div className="grid gap-3 sm:grid-cols-[4rem_1fr]">
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            maxLength={2}
            aria-label="Team emoji"
            className="rounded-xl border border-slate-300 px-3 py-2.5 text-center text-2xl focus:border-teal-500 focus:outline-none"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Team name (e.g. Year 4 Eagles)"
            className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
          />
        </div>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          <Plus size={16} /> Create team
        </button>
      </form>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3">
            <p className="font-bold text-slate-900">Teams ({teams.length})</p>
          </div>
          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : teams.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No teams yet. Create one above.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {teams.map((team) => (
                <li key={team.id} className="flex items-center gap-3 p-4">
                  <span className="text-2xl" aria-hidden>
                    {team.emoji}
                  </span>
                  <button
                    type="button"
                    onClick={() => loadRoster(team.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate font-bold text-slate-900">{team.name}</p>
                    <p className="text-xs text-slate-500">
                      {team.memberCount} member{team.memberCount === 1 ? '' : 's'} · code{' '}
                      <span className="font-bold tracking-widest text-teal-700">{team.joinCode}</span>
                      {team.isActive ? '' : ' · paused'}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => refreshCode(team.id)}
                    title="New code"
                    className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                  >
                    <RefreshCw size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(team)}
                    title={team.isActive ? 'Pause joining' : 'Resume joining'}
                    className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    {team.isActive ? 'On' : 'Off'}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTeam(team.id, team.name)}
                    title="Delete team"
                    className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3">
            <p className="font-bold text-slate-900">
              {selectedTeam ? `Roster · ${selectedTeam.name}` : 'Select a team to manage members'}
            </p>
          </div>

          {!selectedTeam ? (
            <p className="p-5 text-sm text-slate-500">Tap a team name on the left to view and edit its members.</p>
          ) : (
            <div className="p-4">
              <div className="relative">
                <input
                  value={learnerQuery}
                  onChange={(e) => setLearnerQuery(e.target.value)}
                  placeholder="Search learners by name or email…"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none"
                />
                {learnerResults.length > 0 ? (
                  <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                    {learnerResults.map((learner) => (
                      <li key={learner.uid}>
                        <button
                          type="button"
                          onClick={() => addMember(learner.uid)}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-teal-50"
                        >
                          <span className="truncate text-slate-800">{learner.name || 'Friend'}</span>
                          <UserPlus size={15} className="text-teal-600" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              {rosterLoading ? (
                <p className="py-4 text-center text-sm text-slate-500">Loading roster…</p>
              ) : roster.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500">No members yet. Search above to add learners.</p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100">
                  {roster.map((member) => (
                    <li key={member.uid} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0">
                        <span className="truncate font-semibold text-slate-800">{member.name}</span>
                        <span className="ml-2 text-xs text-slate-500">{member.totalPoints} pts</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeMember(member.uid)}
                        className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50"
                        title="Remove from team"
                      >
                        <X size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
