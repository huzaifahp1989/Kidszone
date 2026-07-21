'use client';

import React, { useMemo, useState } from 'react';
import { CreateShell } from '@/components/CreateShell';
import { KINDNESS_TASKS } from '@/data/kids-create-activities';

export default function KindnessHuntPage() {
  const storageKey = useMemo(() => {
    const day = new Date().toISOString().slice(0, 10);
    return `kz_kindness_${day}`;
  }, []);
  const [done, setDone] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch {
      return {};
    }
  });

  const toggle = (id: string) => {
    setDone((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const completedCount = KINDNESS_TASKS.filter((t) => done[t.id]).length;
  const allDone = completedCount === KINDNESS_TASKS.length;

  return (
    <CreateShell title="Kindness Hunt">
      <p className="text-sm text-sand-600">
        Tick off kind deeds today ({completedCount}/{KINDNESS_TASKS.length}). Practice for barakah — no points claim.
      </p>
      <div className="space-y-2">
        {KINDNESS_TASKS.map((task) => (
          <button
            key={task.id}
            type="button"
            onClick={() => toggle(task.id)}
            className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition ${
              done[task.id]
                ? 'border-emerald-400 bg-emerald-50'
                : 'border-sand-200 bg-white hover:border-teal-200'
            }`}
          >
            <span className="text-2xl" aria-hidden>
              {task.emoji}
            </span>
            <span className="flex-1 font-bold text-sand-900">{task.label}</span>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-md border-2 text-xs font-black ${
                done[task.id] ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-sand-300'
              }`}
            >
              {done[task.id] ? '✓' : ''}
            </span>
          </button>
        ))}
      </div>
      {allDone && <p className="font-bold text-emerald-800">MashaAllah — keep being kind every day!</p>}
    </CreateShell>
  );
}
