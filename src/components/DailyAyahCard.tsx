'use client';

import React, { useMemo } from 'react';
import { getDailyAyah } from '@/data/daily-ayahs';
import { ReadAloudButton } from '@/components/ReadAloudButton';

export function DailyAyahCard({ compact = false }: { compact?: boolean }) {
  const ayah = useMemo(() => getDailyAyah(), []);
  const readText = `${ayah.arabic}. ${ayah.meaning}. ${ayah.reference}`;

  if (compact) {
    return (
      <section className="surface-card rounded-2xl border border-violet-200/60 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-violet-700">Ayah of the day</p>
          <ReadAloudButton text={readText} label="" size="sm" />
        </div>
        <p className="mt-2 font-arabic text-right text-xl leading-loose text-sand-900">{ayah.arabic}</p>
        <p className="mt-2 kid-text text-sand-700">{ayah.meaning}</p>
        <p className="mt-1 text-xs font-semibold text-violet-600">{ayah.reference}</p>
      </section>
    );
  }

  return (
    <section className="surface-card rounded-3xl border border-violet-200/60 bg-gradient-to-br from-violet-50 via-white to-indigo-50 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-700">Ayah of the day</p>
          <h3 className="mt-1 font-heading text-xl font-bold text-sand-900">Learn one ayah today</h3>
        </div>
        <ReadAloudButton text={readText} size="sm" />
      </div>
      <p className="mt-4 font-arabic text-right text-2xl leading-loose text-sand-900 md:text-3xl">{ayah.arabic}</p>
      <p className="mt-4 kid-text-lg text-sand-700">{ayah.meaning}</p>
      <p className="mt-2 text-sm font-semibold text-violet-600">{ayah.reference}</p>
    </section>
  );
}
