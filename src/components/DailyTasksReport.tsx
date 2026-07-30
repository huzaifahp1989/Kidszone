'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

type WeekRow = {
  weekLabel: string;
  startDate: string;
  endDate: string;
  activeDays: number;
  totalTasks: number;
  totalPoints: number;
  goodDeeds: number;
  salahDays: number;
  quranDays: number;
};

type MonthRow = {
  monthKey: string;
  monthLabel: string;
  activeDays: number;
  totalTasks: number;
  totalPoints: number;
  goodDeeds: number;
  salahDays: number;
  quranDays: number;
  allSalahDaysPct: number;
};

type ReportData = {
  weeks: WeekRow[];
  months: MonthRow[];
  totals: { activeDays: number; totalTasks: number; totalPoints: number; goodDeeds: number };
};

interface Props {
  userId: string;
  compact?: boolean; // narrower style for admin modal
}

export function DailyTasksReport({ userId, compact = false }: Props) {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly'>('weekly');

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`/api/daily-checklist/report?userId=${encodeURIComponent(userId)}&weeks=4&months=3`)
      .then(r => r.json())
      .then(d => { if (d.success) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const cellCls = compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm';
  const headCls = compact ? 'px-2 py-1.5 text-[10px] font-black uppercase tracking-wide' : 'px-3 py-2 text-xs font-black uppercase tracking-wide';

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-emerald-700">
        <Loader2 size={16} className="animate-spin" />
        Loading daily tasks report…
      </div>
    );
  }

  if (!data) {
    return <p className={`text-slate-500 ${compact ? 'text-xs' : 'text-sm'}`}>No daily tasks data yet.</p>;
  }

  const { weeks, months, totals } = data;

  return (
    <div className={compact ? 'space-y-3' : 'space-y-5'}>
      {/* Totals strip */}
      <div className={`grid grid-cols-4 gap-2`}>
        {[
          { label: 'Active Days', value: totals.activeDays, color: 'emerald' },
          { label: 'Total Tasks', value: totals.totalTasks, color: 'indigo' },
          { label: 'Points', value: totals.totalPoints, color: 'violet' },
          { label: 'Good Deeds', value: totals.goodDeeds, color: 'amber' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border bg-white p-2 text-center border-${s.color}-100`}>
            <p className={`text-${s.color}-700 font-black ${compact ? 'text-base' : 'text-xl'}`}>{s.value}</p>
            <p className={`text-${s.color}-500 ${compact ? 'text-[9px]' : 'text-xs'} uppercase font-semibold tracking-wide mt-0.5`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tab selector */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {(['weekly', 'monthly'] as const).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 rounded-lg px-3 py-1.5 ${compact ? 'text-xs' : 'text-sm'} font-bold transition ${
              activeTab === t ? 'bg-emerald-500 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t === 'weekly' ? 'Weekly (last 4)' : 'Monthly (last 3)'}
          </button>
        ))}
      </div>

      {activeTab === 'weekly' && (
        <div className="overflow-auto rounded-xl border border-emerald-100">
          <table className="w-full">
            <thead className="bg-emerald-50">
              <tr>
                {['Week', 'Active Days', 'Tasks ✅', 'Pts ⭐', 'All Salah 🕌', 'Quran 📖', 'Good Deeds 💚'].map(h => (
                  <th key={h} className={`${headCls} text-left text-emerald-700 whitespace-nowrap`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map(w => (
                <tr key={w.startDate} className="border-t border-emerald-50 hover:bg-emerald-50/40">
                  <td className={`${cellCls} font-semibold text-slate-800 whitespace-nowrap`}>{w.weekLabel}</td>
                  <td className={`${cellCls} font-bold ${w.activeDays >= 5 ? 'text-emerald-700' : w.activeDays >= 3 ? 'text-amber-600' : 'text-slate-500'}`}>
                    {w.activeDays}/7
                  </td>
                  <td className={`${cellCls} text-indigo-700 font-semibold`}>{w.totalTasks}</td>
                  <td className={`${cellCls} text-violet-700 font-semibold`}>{w.totalPoints}</td>
                  <td className={`${cellCls}`}>
                    <span className={`font-semibold ${w.salahDays >= 5 ? 'text-emerald-700' : 'text-slate-500'}`}>{w.salahDays}d</span>
                  </td>
                  <td className={`${cellCls}`}>
                    <span className={`font-semibold ${w.quranDays >= 3 ? 'text-indigo-700' : 'text-slate-500'}`}>{w.quranDays}d</span>
                  </td>
                  <td className={`${cellCls}`}>
                    <span className={`font-semibold ${w.goodDeeds > 0 ? 'text-amber-700' : 'text-slate-400'}`}>{w.goodDeeds}d</span>
                  </td>
                </tr>
              ))}
              {weeks.length === 0 && (
                <tr><td colSpan={7} className={`${cellCls} text-slate-400 text-center`}>No data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'monthly' && (
        <div className="overflow-auto rounded-xl border border-violet-100">
          <table className="w-full">
            <thead className="bg-violet-50">
              <tr>
                {['Month', 'Active Days', 'Tasks ✅', 'Pts ⭐', 'All Salah 🕌', 'Quran 📖', 'Salah % 📊'].map(h => (
                  <th key={h} className={`${headCls} text-left text-violet-700 whitespace-nowrap`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {months.map(m => (
                <tr key={m.monthKey} className="border-t border-violet-50 hover:bg-violet-50/40">
                  <td className={`${cellCls} font-semibold text-slate-800 whitespace-nowrap`}>{m.monthLabel}</td>
                  <td className={`${cellCls} font-bold ${m.activeDays >= 20 ? 'text-emerald-700' : m.activeDays >= 10 ? 'text-amber-600' : 'text-slate-500'}`}>
                    {m.activeDays}
                  </td>
                  <td className={`${cellCls} text-indigo-700 font-semibold`}>{m.totalTasks}</td>
                  <td className={`${cellCls} text-violet-700 font-semibold`}>{m.totalPoints}</td>
                  <td className={`${cellCls}`}>
                    <span className={`font-semibold ${m.salahDays >= 20 ? 'text-emerald-700' : 'text-slate-500'}`}>{m.salahDays}d</span>
                  </td>
                  <td className={`${cellCls}`}>
                    <span className={`font-semibold ${m.quranDays >= 10 ? 'text-indigo-700' : 'text-slate-500'}`}>{m.quranDays}d</span>
                  </td>
                  <td className={`${cellCls}`}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${m.allSalahDaysPct >= 80 ? 'bg-emerald-500' : m.allSalahDaysPct >= 50 ? 'bg-amber-400' : 'bg-rose-400'}`}
                          style={{ width: `${m.allSalahDaysPct}%` }}
                        />
                      </div>
                      <span className={`font-semibold text-slate-700 ${compact ? 'text-[10px]' : 'text-xs'}`}>{m.allSalahDaysPct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {months.length === 0 && (
                <tr><td colSpan={7} className={`${cellCls} text-slate-400 text-center`}>No data yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className={`text-slate-400 ${compact ? 'text-[10px]' : 'text-xs'} flex items-center gap-1`}>
        <CheckCircle2 size={compact ? 10 : 12} />
        Green = great · Amber = okay · Grey = needs improvement
      </p>
    </div>
  );
}
