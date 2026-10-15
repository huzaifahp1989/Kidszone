'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Settings, BookOpen, Gamepad2, Sparkles, Mic, Star } from 'lucide-react';

const WEEKLY_ACTIVITIES = [
  { key: 'quiz', label: 'Quiz', icon: BookOpen },
  { key: 'game', label: 'Games', icon: Gamepad2 },
  { key: 'pledge', label: 'Durood & Zikr', icon: Sparkles },
  { key: 'recording', label: 'Stories / Recording', icon: Mic },
];

export default function AdminWeeklyActivitiesPage() {
  const router = useRouter();
  const [threshold, setThreshold] = useState<number | null>(null);
  const [bonus, setBonus] = useState<number | null>(null);

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
      if (res.ok) {
        setThreshold(data.config?.milestone_threshold ?? 3);
        setBonus(data.config?.milestone_bonus ?? 30);
      }
    } catch {
      setThreshold(3);
      setBonus(30);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white p-6 rounded-2xl mb-6 flex items-center justify-between shadow-xl">
          <div>
            <h1 className="text-3xl font-bold">Weekly Activities</h1>
            <p className="text-white/80 mt-1">
              Weekly activity tracking and the 3-activity milestone bonus.
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
          Weekly activities are tracked automatically (quiz, games, durood/zikr, recordings).
          The milestone threshold and bonus are configurable from the Points Configuration page.
        </div>

        <div className="bg-white rounded-2xl shadow border border-slate-100 mb-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">Tracked weekly activities</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {WEEKLY_ACTIVITIES.map((a) => (
              <div key={a.key} className="px-6 py-4 flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                  <a.icon size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-800">{a.label}</p>
                  <p className="text-xs text-slate-500">Counted automatically when a learner completes this activity.</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  auto
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Star size={18} className="text-amber-500" /> Weekly milestone bonus
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Awarded once per week when a learner completes the required number of activities.
              </p>
            </div>
            <button
              onClick={() => router.push('/admin/points-config')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <Settings size={14} /> Configure
            </button>
          </div>
          <div className="grid grid-cols-2 divide-x divide-slate-100">
            <div className="px-6 py-5 text-center">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Activity threshold</p>
              <p className="text-3xl font-black text-slate-800 mt-1">{threshold ?? 3}</p>
              <p className="text-xs text-slate-400 mt-1">activities this week</p>
            </div>
            <div className="px-6 py-5 text-center">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Bonus points</p>
              <p className="text-3xl font-black text-emerald-600 mt-1">+{bonus ?? 30}</p>
              <p className="text-xs text-slate-400 mt-1">one-time per week</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
