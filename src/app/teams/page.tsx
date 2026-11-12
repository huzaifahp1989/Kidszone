'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Users, Trophy, Sparkles, CalendarDays, LogIn, LogOut, KeyRound } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import type { TeamLeaderboardRow, UserTeam } from '@/lib/teams';

type TeamTab = 'weekly' | 'monthly' | 'lifetime';

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || '';
}

const tabPointsLabel: Record<TeamTab, string> = {
  weekly: 'Week pts',
  monthly: 'Month pts',
  lifetime: 'Total pts',
};

export default function TeamsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TeamTab>('weekly');
  const [teams, setTeams] = useState<TeamLeaderboardRow[]>([]);
  const [team, setTeam] = useState<UserTeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [myLoading, setMyLoading] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [setupRequired, setSetupRequired] = useState(false);

  const loadLeaderboard = useCallback(async (which: TeamTab) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/leaderboard?tab=${which}&t=${Date.now()}`, { cache: 'no-store' });
      const json = await res.json();
      setTeams(Array.isArray(json?.teams) ? (json.teams as TeamLeaderboardRow[]) : []);
    } catch {
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMyTeam = useCallback(async () => {
    if (!user) {
      setTeam(null);
      return;
    }
    setMyLoading(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/teams/me', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (res.status === 401) {
        setTeam(null);
        return;
      }
      const json = await res.json();
      setTeam((json?.team as UserTeam) || null);
    } catch {
      setTeam(null);
    } finally {
      setMyLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadLeaderboard(tab);
  }, [loadLeaderboard, tab]);

  useEffect(() => {
    void loadMyTeam();
  }, [loadMyTeam]);

  const myTeamRank = useMemo(() => {
    if (!team) return -1;
    return teams.findIndex((row) => row.id === team.id);
  }, [teams, team]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/teams/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ joinCode }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Could not join team');
      setTeam((json?.team as UserTeam) || null);
      setJoinCode('');
      setMessage(`You joined ${json?.teamName || 'your team'}!`);
      void loadLeaderboard(tab);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not join team');
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    if (!user || busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const token = await getToken();
      const res = await fetch('/api/teams/leave', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Could not leave team');
      setTeam(null);
      setMessage('You left your team.');
      void loadLeaderboard(tab);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not leave team');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-inner mx-auto max-w-4xl space-y-6">
      <div className="hero-panel p-6 sm:p-8">
        <div className="badge-chip mb-3">Teams</div>
        <h1 className="font-heading text-3xl font-bold text-sand-900 sm:text-4xl">Class Competitions</h1>
        <p className="mt-2 max-w-2xl text-sand-700">
          Join your class or madrasah team with a code and earn points together. Every activity you complete adds
          to your team&rsquo;s score.
        </p>
      </div>

      {setupRequired ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Database setup needed: run the migration <code className="text-xs">20261101_create_teams.sql</code> in Supabase.
        </div>
      ) : null}

      {message ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm font-semibold text-rose-900">
          {error}
        </div>
      ) : null}

      {/* My team / join */}
      {!user ? (
        <div className="surface-card rounded-2xl p-6 text-center">
          <Users className="mx-auto mb-3 text-teal-600" size={40} />
          <p className="font-bold text-sand-900">Sign in to join a team</p>
          <p className="mt-1 text-sm text-sand-700">
            <Link href="/signin" className="font-bold text-violet-700 underline">
              Sign in
            </Link>{' '}
            to join your class team and compete together.
          </p>
        </div>
      ) : myLoading ? (
        <div className="surface-card rounded-2xl p-6 text-center text-sand-600">Loading your team…</div>
      ) : team ? (
        <div className="surface-card rounded-2xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl" aria-hidden>
                {team.emoji}
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Your team</p>
                <p className="text-xl font-black text-sand-900">{team.name}</p>
                {team.description ? <p className="text-sm text-sand-600">{team.description}</p> : null}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Team rank</p>
              <p className="text-2xl font-black text-teal-700">
                {myTeamRank >= 0 ? `#${myTeamRank + 1}` : '—'}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="stat-pill p-3 text-center">
              <p className="text-lg font-black text-teal-700">{team.totalPoints}</p>
              <p className="text-[11px] text-sand-600">Total pts</p>
            </div>
            <div className="stat-pill p-3 text-center">
              <p className="text-lg font-black text-teal-700">{team.memberCount}</p>
              <p className="text-[11px] text-sand-600">Members</p>
            </div>
            <div className="stat-pill p-3 text-center">
              <p className="text-lg font-black text-teal-700">{team.avgPoints}</p>
              <p className="text-[11px] text-sand-600">Avg / member</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-xl bg-teal-50 px-3 py-2 text-sm font-bold text-teal-800 ring-1 ring-teal-100">
              <KeyRound size={15} /> Team code: <span className="tracking-widest">{team.joinCode}</span>
            </span>
            <button
              type="button"
              onClick={handleLeave}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-100 px-4 py-2 text-sm font-bold text-rose-800 hover:bg-rose-200 disabled:opacity-60"
            >
              <LogOut size={16} /> Leave team
            </button>
          </div>

          {team.members.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Members</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {team.members.map((member) => (
                  <li
                    key={member.uid}
                    className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800"
                  >
                    {member.isCaptain ? <span aria-hidden>👑</span> : null}
                    {member.name}
                    <span className="text-violet-500">· {member.points}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <form onSubmit={handleJoin} className="surface-card rounded-2xl p-6">
          <p className="font-bold text-sand-900">Join a team</p>
          <p className="mt-1 text-sm text-sand-700">
            Enter the team code your teacher or parent gave you.
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="TEAM CODE"
              maxLength={10}
              className="w-full rounded-xl border border-teal-200 px-4 py-3 text-base font-bold uppercase tracking-widest text-sand-900 focus:border-teal-500 focus:outline-none sm:flex-1"
            />
            <button
              type="submit"
              disabled={busy || joinCode.trim().length < 4}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              <LogIn size={16} /> Join team
            </button>
          </div>
        </form>
      )}

      {/* Team leaderboard */}
      <div className="overflow-hidden rounded-2xl border border-teal-300/30 bg-white shadow-lg">
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-6 text-white">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Trophy size={20} /> Team Leaderboard
          </h2>
          <p className="text-sm text-white/80">
            Ranked by total team points. Average per member is shown so smaller active teams are represented fairly.
          </p>
        </div>

        <div className="flex gap-1 border-b border-teal-100 bg-teal-50 p-2">
          {(
            [
              { id: 'weekly', label: 'This week', icon: Trophy },
              { id: 'monthly', label: 'This month', icon: CalendarDays },
              { id: 'lifetime', label: 'Lifetime', icon: Sparkles },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                tab === id ? 'bg-teal-600 text-white shadow' : 'text-teal-700 hover:bg-teal-100'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-teal-100" />
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="p-8 text-center">
            <Users size={44} className="mx-auto mb-3 text-teal-300" />
            <p className="font-semibold text-sand-900">No teams yet</p>
            <p className="text-sm text-sand-700">Teams will appear here once they are created and start earning points.</p>
          </div>
        ) : (
          <div className="divide-y divide-teal-100">
            {teams.map((row, index) => {
              const you = team?.id === row.id;
              return (
                <div
                  key={row.id}
                  className={`flex items-center gap-3 p-4 sm:gap-4 ${you ? 'bg-violet-50/70 ring-1 ring-inset ring-violet-200' : ''}`}
                >
                  <div className="w-8 shrink-0 text-center font-bold text-sand-700">#{index + 1}</div>
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl"
                    style={{ backgroundColor: `${row.colour}22` }}
                    aria-hidden
                  >
                    {row.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-bold text-sand-900">
                      <span className="break-words">{row.name}</span>
                      {you ? (
                        <span className="rounded-full bg-violet-200 px-2 py-0.5 text-[10px] font-bold text-violet-800">
                          Your team
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-sand-600">
                      {row.memberCount} member{row.memberCount === 1 ? '' : 's'} · {row.avgPoints} avg / member
                    </p>
                    {row.topMembers.length > 0 ? (
                      <p className="mt-0.5 text-xs text-sand-500">
                        Top: {row.topMembers.map((m) => m.name).join(', ')}
                      </p>
                    ) : null}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xl font-black text-teal-700">{row.totalPoints}</p>
                    <p className="text-[10px] font-semibold uppercase text-sand-500">{tabPointsLabel[tab]}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="feature-tile rounded-2xl p-5 text-sm text-violet-900">
        <strong>How it works:</strong> every point you earn in quizzes, games, Quran, salah and good deeds counts
        toward your team total. Ask your teacher for your class code if you don&rsquo;t have one yet.
      </div>
    </div>
  );
}
