'use client';

import React, { useState } from 'react';
import { CreateShell } from '@/components/CreateShell';
import { ClaimCreatePointsButton } from '@/components/ClaimCreatePointsButton';
import { DOT_TO_DOT_POINTS } from '@/data/kids-create-activities';

export default function DotToDotPage() {
  const [nextDot, setNextDot] = useState(1);
  const [lines, setLines] = useState<Array<{ x1: number; y1: number; x2: number; y2: number }>>([]);
  const complete = nextDot > DOT_TO_DOT_POINTS.length;

  const clickDot = (n: number) => {
    if (n !== nextDot) return;
    const current = DOT_TO_DOT_POINTS.find((d) => d.n === n)!;
    const prev = DOT_TO_DOT_POINTS.find((d) => d.n === n - 1);
    if (prev) {
      setLines((L) => [...L, { x1: prev.x, y1: prev.y, x2: current.x, y2: current.y }]);
    }
    setNextDot(n + 1);
  };

  return (
    <CreateShell title="Islamic Dot-to-Dot">
      <p className="text-sm text-sand-600">
        Tap the dots in order (1 → {DOT_TO_DOT_POINTS.length}) to reveal a crescent shape.
        {!complete && <span className="ml-1 font-bold text-teal-700">Next: {nextDot}</span>}
      </p>
      <div className="surface-card rounded-3xl bg-white p-3">
        <svg viewBox="0 0 260 220" className="mx-auto h-auto w-full max-w-md">
          {lines.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#0d9488" strokeWidth={3} />
          ))}
          {DOT_TO_DOT_POINTS.map((d) => (
            <g key={d.n} onClick={() => clickDot(d.n)} className="cursor-pointer">
              <circle
                cx={d.x}
                cy={d.y}
                r={10}
                fill={d.n < nextDot ? '#0d9488' : d.n === nextDot ? '#f59e0b' : '#e2e8f0'}
                stroke="#1e1b4b"
                strokeWidth={1.5}
              />
              <text x={d.x} y={d.y + 4} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#1e1b4b">
                {d.n}
              </text>
            </g>
          ))}
        </svg>
      </div>
      {complete && <p className="font-bold text-teal-800">MashaAllah — crescent complete!</p>}
      <ClaimCreatePointsButton activity="creative" ready={complete} />
    </CreateShell>
  );
}
