'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ACHIEVEMENTS, type AchievementDefinition } from '@/lib/achievements';

const CATEGORY_LABELS: Record<string, string> = {
  quiz: 'Quiz',
  habits: 'Habits',
  sadaqah: 'Sadaqah',
  general: 'General',
  quran: 'Quran',
  arabic: 'Arabic',
  hadith: 'Hadith',
};

const CATEGORY_COLORS: Record<string, string> = {
  quiz: 'bg-indigo-100 text-indigo-700',
  habits: 'bg-emerald-100 text-emerald-700',
  sadaqah: 'bg-amber-100 text-amber-700',
  general: 'bg-slate-100 text-slate-700',
  quran: 'bg-teal-100 text-teal-700',
  arabic: 'bg-rose-100 text-rose-700',
  hadith: 'bg-violet-100 text-violet-700',
};

export default function AdminBadgesPage() {
  const router = useRouter();
  const [badges] = useState<AchievementDefinition[]>(ACHIEVEMENTS);

  useEffect(() => {
    if (localStorage.getItem('admin_auth') !== 'true') {
      router.push('/admin/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white p-6 rounded-2xl mb-6 flex items-center justify-between shadow-xl">
          <div>
            <h1 className="text-3xl font-bold">Achievement Badges</h1>
            <p className="text-white/80 mt-1">
              {badges.length} badges defined across {Object.keys(CATEGORY_LABELS).length} categories.
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
          Badges are defined in <code className="bg-amber-100 px-1 rounded">src/lib/achievements.ts</code>. They unlock
          automatically when a learner meets the threshold. To edit a badge&apos;s name, description, or threshold,
          update that file and redeploy.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className="bg-white rounded-2xl shadow border border-slate-100 p-5 flex gap-4"
            >
              <div className="text-4xl leading-none">{badge.emoji}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-800">{badge.label}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${CATEGORY_COLORS[badge.category] || CATEGORY_COLORS.general}`}>
                    {CATEGORY_LABELS[badge.category] || badge.category}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-1">{badge.description}</p>
                <p className="text-[11px] text-slate-400 mt-2 font-mono">id: {badge.id}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
