'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Moon, Sparkles, BookOpen, Heart, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { authJsonFetch, getAuthFetchHeaders } from '@/lib/auth-headers';

type RamadanPayload = {
  active: boolean;
  period?: { id: string; start: string; end: string; isDemo?: boolean };
  dayInfo?: {
    dayNumber: number;
    totalDays: number;
    daysRemaining: number;
    inLastTenNights: boolean;
    isOddNight: boolean;
    laylatulQadrHighlight: boolean;
    nextLaylatOddNight: number | null;
    daysUntilNextLaylat: number | null;
  };
  todayMissions?: { quiz: boolean; pledge: boolean; fast: boolean };
  stats?: { fastDaysLogged: number; strongDays: number };
  badges?: Array<{ id: string; earned: boolean; name: string; description: string; icon: string }>;
  links?: { wordSearch: string; quiz: string; pledge: string };
};

export function RamadanModeCard() {
  const { user } = useAuth();
  const [data, setData] = useState<RamadanPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [fastLoading, setFastLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const headers = await getAuthFetchHeaders();
      const res = await fetch(`/api/ramadan/progress?userId=${user.id}`, { cache: 'no-store', headers });
      const json = await res.json();
      setData(json);
    } catch {
      setData({ active: false });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleFastToday = async () => {
    if (!user?.id || !data?.todayMissions) return;
    setFastLoading(true);
    try {
      const res = await authJsonFetch('/api/ramadan/fast', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          action: data.todayMissions.fast ? 'remove' : 'log',
        }),
      });
      if (res.ok) await load();
    } finally {
      setFastLoading(false);
    }
  };

  if (loading || !data?.active || !data.dayInfo) return null;

  const { dayInfo, todayMissions, stats, badges } = data;
  const missionsDone = [todayMissions?.quiz, todayMissions?.pledge, todayMissions?.fast].filter(Boolean).length;

  return (
    <section className="overflow-hidden rounded-3xl border border-indigo-300/60 bg-gradient-to-br from-indigo-950 via-violet-900 to-indigo-900 p-6 text-white shadow-xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-200">
            <Moon size={14} />
            Ramadan mode
            {data.period?.isDemo ? <span className="text-amber-100/70">(preview)</span> : null}
          </div>
          <h3 className="mt-3 text-2xl font-black">Day {dayInfo.dayNumber} of {dayInfo.totalDays}</h3>
          <p className="mt-1 text-sm text-indigo-100">
            {dayInfo.daysRemaining} day{dayInfo.daysRemaining === 1 ? '' : 's'} left in Ramadan
          </p>
        </div>

        {dayInfo.inLastTenNights ? (
          <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-center md:min-w-[180px]">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-200">Last 10 nights</p>
            {dayInfo.laylatulQadrHighlight ? (
              <p className="mt-1 text-lg font-black text-amber-100">Tonight may be Laylatul Qadr ✨</p>
            ) : dayInfo.daysUntilNextLaylat != null ? (
              <p className="mt-1 text-sm font-semibold text-amber-100">
                {dayInfo.daysUntilNextLaylat === 0
                  ? 'Seek Laylatul Qadr tonight'
                  : `${dayInfo.daysUntilNextLaylat} day(s) to next odd night`}
              </p>
            ) : null}
          </div>
        ) : dayInfo.daysUntilNextLaylat != null && dayInfo.nextLaylatOddNight ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center md:min-w-[160px]">
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-200">Laylatul Qadr</p>
            <p className="mt-1 text-sm text-indigo-100">Night {dayInfo.nextLaylatOddNight} in {dayInfo.daysUntilNextLaylat} days</p>
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MissionTile
          done={Boolean(todayMissions?.quiz)}
          icon={<BookOpen size={18} />}
          title="Daily quiz"
          href={data.links?.quiz || '/quiz'}
        />
        <MissionTile
          done={Boolean(todayMissions?.pledge)}
          icon={<Heart size={18} />}
          title="Durood & zikr"
          href={data.links?.pledge || '/pledge'}
        />
        <button
          type="button"
          onClick={toggleFastToday}
          disabled={fastLoading}
          className={`rounded-2xl border p-4 text-left transition ${
            todayMissions?.fast
              ? 'border-emerald-300/50 bg-emerald-500/20'
              : 'border-white/15 bg-white/5 hover:bg-white/10'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-lg">🌙</span>
            {todayMissions?.fast ? <CheckCircle2 size={18} className="text-emerald-300" /> : null}
          </div>
          <p className="mt-2 font-bold">Fasted today</p>
          <p className="text-xs text-indigo-200">
            {fastLoading ? 'Saving…' : todayMissions?.fast ? 'Logged — tap to undo' : 'Tap if you fasted (optional)'}
          </p>
        </button>
      </div>

      <p className="mt-4 text-sm text-indigo-100">
        Today: {missionsDone}/3 Ramadan missions · {stats?.strongDays ?? 0} strong days · {stats?.fastDaysLogged ?? 0} fasts logged
      </p>

      {badges && badges.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {badges.map((badge) => (
            <span
              key={badge.id}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                badge.earned ? 'bg-amber-400/20 text-amber-100 ring-1 ring-amber-300/40' : 'bg-white/5 text-indigo-300'
              }`}
              title={badge.description}
            >
              {badge.icon} {badge.name}
              {badge.earned ? ' ✓' : ''}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          href={data.links?.wordSearch || '/games/word-search/ramadan'}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-indigo-950 hover:bg-amber-400"
        >
          <Sparkles size={16} />
          Ramadan word hunt →
        </Link>
      </div>
    </section>
  );
}

function MissionTile({
  done,
  icon,
  title,
  href,
}: {
  done: boolean;
  icon: React.ReactNode;
  title: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-2xl border p-4 transition hover:scale-[1.01] ${
        done ? 'border-emerald-300/50 bg-emerald-500/20' : 'border-white/15 bg-white/5 hover:bg-white/10'
      }`}
    >
      <div className="flex items-center justify-between gap-2 text-indigo-100">
        {icon}
        {done ? <CheckCircle2 size={18} className="text-emerald-300" /> : null}
      </div>
      <p className="mt-2 font-bold text-white">{title}</p>
      <p className="text-xs text-indigo-200">{done ? 'Done today' : 'Tap to complete'}</p>
    </Link>
  );
}
