'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Settings } from 'lucide-react';
import { MISSION_DEFINITIONS, MISSION_BONUS_POINTS } from '@/lib/kids-zone-missions';

export default function AdminDailyChallengesPage() {
  const router = useRouter();
  const [dailyBonus, setDailyBonus] = useState<number | null>(null);

  useEffect(() => {
    if (localStorage.getItem('admin_auth') !== 'true') {
      router.push('/admin/login');
      return;
    }
    loadConfig();
  }, [router]);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/admin/points-config', {
        headers: { 'x-admin-auth': 'true' },
        cache: 'no-store',
      });
      const data = await res.json();
      if (res.ok) setDailyBonus(data.config?.daily_bonus ?? MISSION_BONUS_POINTS);
    } catch {
      setDailyBonus(MISSION_BONUS_POINTS);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white p-6 rounded-2xl mb-6 flex items-center justify-between shadow-xl">
          <div>
            <h1 className="text-3xl font-bold">Daily Challenges</h1>
            <p className="text-white/80 mt-1">
              {MISSION_DEFINITIONS.length} missions make up today&apos;s challenge.
            </p>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20"
          >
            <ArrowLeft size={16} /> Back
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800">
          Daily missions are defined in <code className="bg-amber-100 px-1 rounded">src/lib/kids-zone-missions.ts</code>.
          The completion bonus points can be adjusted from the Points Configuration page.
        </div>

        <div className="bg-white rounded-2xl shadow border border-slate-100 mb-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">Today&apos;s missions</h2>
            <button
              onClick={() => router.push('/admin/points-config')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <Settings size={14} /> Edit bonus points
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {MISSION_DEFINITIONS.map((m) => (
              <div key={m.key} className="px-6 py-4 flex items-start gap-4">
                <div className="text-3xl leading-none">{m.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800">{m.title}</p>
                  <p className="text-sm text-slate-600">{m.description}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Target: {m.target} {m.unit} · route: {m.href}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  m.accent === 'teal' ? 'bg-teal-100 text-teal-700' :
                  m.accent === 'amber' ? 'bg-amber-100 text-amber-700' :
                  m.accent === 'rose' ? 'bg-rose-100 text-rose-700' :
                  'bg-violet-100 text-violet-700'
                }`}>
                  {m.accent}
                </span>
              </div>
            ))}
          </div>
          <div className="px-6 py-4 bg-slate-50 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-700">Completion bonus</span>
            <span className="text-lg font-black text-emerald-600">
              +{dailyBonus ?? MISSION_BONUS_POINTS} pts
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
