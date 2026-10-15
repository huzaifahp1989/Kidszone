'use client';

import React, { useEffect, useState } from 'react';
import { CreateShell } from '@/components/CreateShell';
import {
  DOT_SHAPES,
  markCreateFinishedToday,
  getCreateFinishedToday,
} from '@/data/kids-create-activities';

export default function DotToDotPage() {
  const [shapeId, setShapeId] = useState(DOT_SHAPES[0].id);
  const shape = DOT_SHAPES.find((s) => s.id === shapeId) || DOT_SHAPES[0];
  const points = shape.points;
  const [nextDot, setNextDot] = useState(1);
  const [lines, setLines] = useState<Array<{ x1: number; y1: number; x2: number; y2: number }>>([]);
  const [finishedToday, setFinishedToday] = useState<string[]>([]);
  const complete = nextDot > points.length;

  useEffect(() => {
    setFinishedToday(getCreateFinishedToday());
  }, []);

  useEffect(() => {
    setNextDot(1);
    setLines([]);
  }, [shapeId]);

  useEffect(() => {
    if (complete) {
      markCreateFinishedToday(`dot-${shapeId}`);
      setFinishedToday(getCreateFinishedToday());
    }
  }, [complete, shapeId]);

  const clickDot = (n: number) => {
    if (n !== nextDot) return;
    const current = points.find((d) => d.n === n)!;
    const prev = points.find((d) => d.n === n - 1);
    if (prev) {
      setLines((L) => [...L, { x1: prev.x, y1: prev.y, x2: current.x, y2: current.y }]);
    }
    setNextDot(n + 1);
  };

  return (
    <CreateShell title="Islamic Dot-to-Dot">
      <div className="flex flex-wrap gap-2">
        {DOT_SHAPES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setShapeId(s.id)}
            className={`rounded-xl px-3 py-2 text-sm font-bold ${
              shapeId === s.id ? 'bg-teal-700 text-white' : 'border border-teal-200 bg-white text-teal-800'
            }`}
          >
            {s.label}
            {finishedToday.includes(`dot-${s.id}`) ? ' ✓' : ''}
          </button>
        ))}
      </div>
      <p className="text-sm text-sand-600">
        Tap the dots in order (1 → {points.length}) to reveal a {shape.label.toLowerCase()}.
        {!complete && <span className="ml-1 font-bold text-teal-700">Next: {nextDot}</span>}
      </p>
      <div className="surface-card rounded-3xl bg-white p-3">
        <svg viewBox="0 0 260 220" className="mx-auto h-auto w-full max-w-md">
          {lines.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#2563eb" strokeWidth={3} />
          ))}
          {points.map((d) => (
            <g key={d.n} onClick={() => clickDot(d.n)} className="cursor-pointer">
              <circle
                cx={d.x}
                cy={d.y}
                r={10}
                fill={d.n < nextDot ? '#2563eb' : d.n === nextDot ? '#f59e0b' : '#e7dfd2'}
                stroke="#1e3a8a"
                strokeWidth={1.5}
              />
              <text x={d.x} y={d.y + 4} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#1e3a8a">
                {d.n}
              </text>
            </g>
          ))}
        </svg>
      </div>
      {complete && (
        <p className="font-bold text-teal-800">MashaAllah — {shape.label.toLowerCase()} complete! Sticker saved for today.</p>
      )}
    </CreateShell>
  );
}
