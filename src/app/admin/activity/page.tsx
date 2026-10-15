'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, ArrowLeft, Gamepad2, Search, Sparkles, Star, Users } from 'lucide-react';

type ActivityUser = {
  uid: string;
  name: string;
  email: string;
  contactNumber: string;
  totalPoints: number;
  weeklyPoints: number;
  monthlyPoints: number;
  todayPoints: number;
  activeDays: number;
  weeklyStars: number;
  lastActiveAt: string | null;
  inactiveDays: number | null;
  activity: { quizAttempts: number; gameSessions: number; kidsZoneDays: number; goodDeeds: number; challenges: number };
  recentActions: string[];
};

type ActivityResponse = {
  periodDays: number;
  week: { weekStartDate: string; weekEndDate: string };
  summary: { totalUsers: number; activeThisWeek: number; activeLast30Days: number; kidsZoneUsers: number };
  warnings?: string[];
  users: ActivityUser[];
};

export default function AdminActivityPage() {
  const router = useRouter();
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'kids-zone'>('all');

  useEffect(() => {
    if (localStorage.getItem('admin_auth') !== 'true') {
      router.replace('/admin/login');
      return;
    }

    fetch('/api/admin/user-activity', { headers: { 'x-admin-auth': 'true' }, cache: 'no-store' })
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || 'Could not load activity');
        setData(json);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not load activity'))
      .finally(() => setLoading(false));
  }, [router]);

  const users = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data?.users || []).filter((user) => {
      if (term && ![user.name, user.email, user.contactNumber, user.uid].join(' ').toLowerCase().includes(term)) return false;
      if (filter === 'active') return user.activeDays > 0;
      if (filter === 'inactive') return user.inactiveDays === null || user.inactiveDays >= 7;
      if (filter === 'kids-zone') return user.activity.kidsZoneDays > 0;
      return true;
    });
  }, [data, filter, search]);

  const activityLabel = (user: ActivityUser) => {
    if (user.inactiveDays === null) return { text: 'No recent activity', className: 'bg-slate-100 text-slate-600' };
    if (user.inactiveDays === 0) return { text: 'Active today', className: 'bg-emerald-100 text-emerald-700' };
    if (user.inactiveDays < 7) return { text: `${user.inactiveDays}d ago`, className: 'bg-sky-100 text-sky-700' };
    return { text: `${user.inactiveDays}d inactive`, className: 'bg-amber-100 text-amber-800' };
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700" aria-label="Back to admin">
              <ArrowLeft size={19} />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-slate-900">User Activity</h1>
              <p className="text-sm text-slate-500">Points, weekly stars, and Kids Zone activity from the last 30 days</p>
            </div>
          </div>
        </div>

        {loading && <div className="py-20 text-center font-semibold text-slate-500">Loading user activity...</div>}
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 font-semibold text-rose-700">{error}</div>}

        {data && (
          <>
            <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: 'All users', value: data.summary.totalUsers, icon: Users, color: 'text-indigo-600' },
                { label: 'Active this week', value: data.summary.activeThisWeek, icon: Activity, color: 'text-emerald-600' },
                { label: 'Active in 30 days', value: data.summary.activeLast30Days, icon: Sparkles, color: 'text-sky-600' },
                { label: 'Using Kids Zone', value: data.summary.kidsZoneUsers, icon: Gamepad2, color: 'text-amber-600' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <Icon className={color} size={20} />
                  <div className="mt-2 text-2xl font-black text-slate-900">{value}</div>
                  <div className="text-xs font-bold uppercase text-slate-500">{label}</div>
                </div>
              ))}
            </section>

            <div className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, phone, or user ID" className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 outline-none focus:border-indigo-500" />
              </div>
              <div className="flex flex-wrap gap-2">
                {(['all', 'active', 'inactive', 'kids-zone'] as const).map((value) => (
                  <button key={value} type="button" onClick={() => setFilter(value)} className={`rounded-lg px-3 py-2 text-sm font-bold ${filter === value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    {value === 'kids-zone' ? 'Kids Zone' : value[0].toUpperCase() + value.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[1180px] text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                  <tr>
                    <th className="px-4 py-3">User</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Stars</th><th className="px-4 py-3">Points</th><th className="px-4 py-3">Learning</th><th className="px-4 py-3">Kids Zone</th><th className="px-4 py-3">Recent actions</th><th className="px-4 py-3">Contact</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => {
                    const status = activityLabel(user);
                    return (
                      <tr key={user.uid} className="align-top hover:bg-slate-50">
                        <td className="px-4 py-3"><div className="font-bold text-slate-900">{user.name}</div><div className="max-w-[210px] truncate text-xs text-slate-500">{user.email}</div></td>
                        <td className="px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${status.className}`}>{status.text}</span><div className="mt-1 text-xs text-slate-500">{user.activeDays} active day{user.activeDays === 1 ? '' : 's'} this week</div></td>
                        <td className="px-4 py-3"><div className="flex items-center gap-1 font-black text-amber-600"><Star size={17} fill="currentColor" /> {user.weeklyStars}</div></td>
                        <td className="px-4 py-3"><div className="font-bold text-slate-900">{user.totalPoints.toLocaleString()} total</div><div className="text-xs text-slate-500">{user.weeklyPoints} week · {user.monthlyPoints} month · {user.todayPoints} today</div></td>
                        <td className="px-4 py-3"><div className="font-semibold text-slate-800">{user.activity.quizAttempts} quizzes</div><div className="text-xs text-slate-500">{user.activity.gameSessions} game sessions</div></td>
                        <td className="px-4 py-3"><div className="font-semibold text-slate-800">{user.activity.goodDeeds} good deeds</div><div className="text-xs text-slate-500">{user.activity.kidsZoneDays} days · {user.activity.challenges} challenges</div></td>
                        <td className="px-4 py-3"><div className="max-w-[240px] text-xs leading-5 text-slate-600">{user.recentActions.length ? user.recentActions.join(' · ') : 'No recent actions'}</div></td>
                        <td className="px-4 py-3"><div className={user.contactNumber ? 'font-semibold text-slate-800' : 'font-semibold text-rose-600'}>{user.contactNumber || 'Missing number'}</div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!users.length && <div className="p-10 text-center text-slate-500">No users match this filter.</div>}
            </div>
          </>
        )}
      </div>
    </main>
  );
}