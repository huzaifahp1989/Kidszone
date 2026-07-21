'use client';

import React, { useMemo, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { CreateShell } from '@/components/CreateShell';
import { getDuaOfTheDay } from '@/data/kids-create-activities';

export default function DuaOfTheDayPage() {
  const dua = useMemo(() => getDuaOfTheDay(), []);
  const [said, setSaid] = useState(false);

  const speak = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(`${dua.transliteration}. ${dua.meaning}`);
    utter.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  return (
    <CreateShell title="Dua of the Day">
      <div className="surface-card space-y-4 rounded-3xl p-5 text-center sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">{dua.title}</p>
        <p className="font-arabic text-3xl leading-relaxed text-teal-950 sm:text-4xl" dir="rtl">
          {dua.arabic}
        </p>
        <p className="text-lg font-bold text-sand-800">{dua.transliteration}</p>
        <p className="text-sand-600">{dua.meaning}</p>
        <button
          type="button"
          onClick={speak}
          className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-white px-4 py-2 font-bold text-teal-800"
        >
          <Volume2 size={18} /> Hear it
        </button>
      </div>
      <button
        type="button"
        onClick={() => setSaid(true)}
        className="w-full rounded-2xl bg-gradient-to-r from-teal-600 to-teal-800 px-5 py-3.5 font-bold text-white sm:w-auto"
      >
        {said ? 'MashaAllah — keep saying it!' : 'I said this dua'}
      </button>
    </CreateShell>
  );
}
