'use client';

import React, { useState } from 'react';
import { CreateShell } from '@/components/CreateShell';
import { AYAH_COLOUR_NUMBERS } from '@/data/kids-create-activities';

const REGIONS = [
  { id: 'r1', num: 1, d: 'M40 40 h120 v80 h-120 z' },
  { id: 'r2', num: 2, d: 'M160 40 h120 v80 h-120 z' },
  { id: 'r3', num: 3, d: 'M40 120 h120 v80 h-120 z' },
  { id: 'r4', num: 4, d: 'M160 120 h120 v80 h-120 z' },
];

export default function AyahColourPage() {
  const [activeNum, setActiveNum] = useState(1);
  const [fills, setFills] = useState<Record<string, string>>({});

  const colorFor = (num: number) => AYAH_COLOUR_NUMBERS.find((c) => c.num === num)!.color;

  const paint = (id: string, num: number) => {
    if (num !== activeNum) return;
    setFills((prev) => ({ ...prev, [id]: colorFor(num) }));
  };

  const allDone = REGIONS.every((r) => fills[r.id]);

  return (
    <CreateShell title="Ayah Colour-by-Number">
      <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-center">
        <p className="font-arabic text-2xl text-teal-900" dir="rtl">
          رَبِّ زِدْنِي عِلْمًا
        </p>
        <p className="mt-1 text-sm font-semibold text-teal-800">My Lord, increase me in knowledge (20:114)</p>
      </div>
      <p className="text-sm text-sand-600">Select a number colour, then tap matching sections.</p>
      <div className="flex flex-wrap gap-2">
        {AYAH_COLOUR_NUMBERS.map((c) => (
          <button
            key={c.num}
            type="button"
            onClick={() => setActiveNum(c.num)}
            className={`rounded-full px-3 py-1.5 text-sm font-bold text-white ${
              activeNum === c.num ? 'ring-2 ring-offset-2 ring-sand-900' : ''
            }`}
            style={{ backgroundColor: c.color }}
          >
            {c.num} · {c.label}
          </button>
        ))}
      </div>
      <div className="surface-card rounded-3xl bg-white p-4">
        <svg viewBox="0 0 320 220" className="mx-auto w-full max-w-md">
          {REGIONS.map((r) => (
            <g key={r.id}>
              <path
                d={r.d}
                fill={fills[r.id] || '#f8fafc'}
                stroke="#1e1b4b"
                strokeWidth={2}
                className="cursor-pointer"
                onClick={() => paint(r.id, r.num)}
              />
              <text
                x={r.id === 'r1' || r.id === 'r3' ? 100 : 220}
                y={r.id === 'r1' || r.id === 'r2' ? 85 : 165}
                textAnchor="middle"
                fontSize="22"
                fontWeight="bold"
                fill="#64748b"
                className="pointer-events-none"
              >
                {r.num}
              </text>
            </g>
          ))}
        </svg>
      </div>
      {allDone && <p className="font-bold text-teal-800">MashaAllah — ayah colouring complete!</p>}
    </CreateShell>
  );
}
