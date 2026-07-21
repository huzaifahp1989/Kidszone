'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, Bell, Trophy, UserX } from 'lucide-react';

type InsightsUser = {
  uid: string;
  name: string;
  email: string;
  weeklyPoints: number;
  pointsNeeded?: number;
};

type InsightsPayload = {
  summary: {
    totalUsers: number;
    inactiveCount: number;
    drawEligibleCount: number;
    almostEligibleCount: number;
    pendingRecordings: number;
    inactiveDays: number;
    drawMinPoints: number;
  };
  inactiveUsers: InsightsUser[];
  drawEligible: InsightsUser[];
  almostEligible: InsightsUser[];
};

export default function AdminInsightsPage() {
  const router = useRouter();
  const [data, setData] = useState<InsightsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [reminding, setReminding] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/dashboard-insights', {
        headers: { 'x-admin-auth': 'true' },
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load insights');
      setData(json);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sendReminder = async (userId: string) => {
    setReminding(userId);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/send-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-auth': 'true' },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Reminder failed');
      setMessage(`Reminder sent to ${json?.name || 'learner'}.`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Reminder failed');
    } finally {
      setReminding(null);
    }
  };

  const remindAllInactive = async () => {
    if (!data?.inactiveUsers.length) return;
    if (!window.confirm(`Send reminders to ${data.inactiveUsers.length} inactive learners?`)) return;

    setReminding('bulk');
    setMessage(null);
    try {
      let sent = 0;
      for (const user of data.inactiveUsers) {
        const res = await fetch('/api/admin/send-reminder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-admin-auth': 'true' },
          body: JSON.stringify({ userId: user.uid }),
        });
        if (res.ok) sent += 1;
      }
      setMessage(`Sent ${sent} reminder email(s).`);
    } catch {
      setMessage('Bulk reminders partially failed.');
    } finally {
      setReminding(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="rounded-full bg-white p-2 shadow-sm hover:bg-gray-100"
          >
            <ArrowLeftIcon size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Insights</h1>
            <p className="text-gray-500">Inactive learners, draw eligibility, and quick reminders</p>
          </div>
        </div>

        {message ? (
          <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900">{message}</div>
        ) : null}

        {loading ? (
          <div className="rounded-xl bg-white p-8 text-center text-gray-500">Loading insights…</div>
        ) : !data ? (
          <div className="rounded-xl bg-white p-8 text-center text-gray-500">No data available.</div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
              <StatCard label="Total learners" value={data.summary.totalUsers} />
              <StatCard label="Inactive" value={data.summary.inactiveCount} tone="amber" />
              <StatCard label="Draw eligible" value={data.summary.drawEligibleCount} tone="green" />
              <StatCard label="Almost eligible" value={data.summary.almostEligibleCount} tone="blue" />
              <StatCard label="Pending recordings" value={data.summary.pendingRecordings} tone="rose" />
            </div>

            <InsightsSection
              title="Inactive learners"
              subtitle={`No quiz or games in the last ${data.summary.inactiveDays} days`}
              icon={<UserX size={18} />}
              users={data.inactiveUsers}
              reminding={reminding}
              onRemind={sendReminder}
              headerAction={
                data.inactiveUsers.length > 0 ? (
                  <button
                    type="button"
                    onClick={remindAllInactive}
                    disabled={reminding === 'bulk'}
                    className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-50"
                  >
                    {reminding === 'bulk' ? 'Sending…' : 'Remind all inactive'}
                  </button>
                ) : null
              }
              emptyText="Everyone has been active recently!"
            />

            <InsightsSection
              title="Draw eligible"
              subtitle={`Above ${data.summary.drawMinPoints} weekly points — entered in random draw`}
              icon={<Trophy size={18} />}
              users={data.drawEligible}
              reminding={reminding}
              onRemind={sendReminder}
              renderExtra={(user) => <span className="text-emerald-700 font-semibold">{user.weeklyPoints} pts</span>}
              emptyText="No one qualifies for the draw yet this week."
            />

            <InsightsSection
              title="Almost eligible"
              subtitle="Close to entering the weekly draw"
              icon={<Bell size={18} />}
              users={data.almostEligible}
              reminding={reminding}
              onRemind={sendReminder}
              renderExtra={(user) => (
                <span className="text-amber-700 font-semibold">
                  {user.weeklyPoints} pts · need {user.pointsNeeded} more
                </span>
              )}
              emptyText="No learners in this range right now."
            />
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, tone = 'gray' }: { label: string; value: number; tone?: string }) {
  const tones: Record<string, string> = {
    gray: 'bg-white border-gray-100',
    amber: 'bg-amber-50 border-amber-200',
    green: 'bg-emerald-50 border-emerald-200',
    blue: 'bg-sky-50 border-sky-200',
    rose: 'bg-rose-50 border-rose-200',
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone] || tones.gray}`}>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
}

function InsightsSection({
  title,
  subtitle,
  icon,
  users,
  reminding,
  onRemind,
  headerAction,
  renderExtra,
  emptyText,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  users: InsightsUser[];
  reminding: string | null;
  onRemind: (uid: string) => void;
  headerAction?: React.ReactNode;
  renderExtra?: (user: InsightsUser) => React.ReactNode;
  emptyText: string;
}) {
  return (
    <section className="mb-6 rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            {icon}
            {title}
          </h2>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
        {headerAction}
      </div>
      {users.length === 0 ? (
        <p className="px-5 py-8 text-center text-gray-500">{emptyText}</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {users.map((user) => (
            <div key={user.uid} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div>
                <p className="font-semibold text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email || user.uid}</p>
              </div>
              <div className="flex items-center gap-3">
                {renderExtra ? renderExtra(user) : null}
                <button
                  type="button"
                  onClick={() => onRemind(user.uid)}
                  disabled={Boolean(reminding)}
                  className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-bold text-violet-800 hover:bg-violet-100 disabled:opacity-50"
                >
                  {reminding === user.uid ? 'Sending…' : 'Remind'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
