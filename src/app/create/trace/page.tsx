'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CreateShell } from '@/components/CreateShell';
import { ClaimCreatePointsButton } from '@/components/ClaimCreatePointsButton';
import { TRACE_WORDS } from '@/data/kids-create-activities';

export default function TraceArabicPage() {
  const [wordIndex, setWordIndex] = useState(0);
  const [strokeCount, setStrokeCount] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const word = TRACE_WORDS[wordIndex];

  useEffect(() => {
    clear();
    setStrokeCount(0);
  }, [wordIndex]);

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = pos(e);
    ctx.strokeStyle = '#0f766e';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  return (
    <CreateShell title="Trace Arabic Words">
      <div className="flex flex-wrap gap-2">
        {TRACE_WORDS.map((w, i) => (
          <button
            key={w.id}
            type="button"
            onClick={() => setWordIndex(i)}
            className={`rounded-full px-3 py-1.5 text-sm font-bold ${
              i === wordIndex ? 'bg-teal-700 text-white' : 'border border-sand-200 bg-white'
            }`}
          >
            {w.english}
          </button>
        ))}
      </div>
      <div className="relative overflow-hidden rounded-3xl border-2 border-sand-200 bg-gradient-to-b from-teal-50 to-white">
        <p
          className="pointer-events-none absolute inset-x-0 top-8 text-center font-arabic text-5xl text-teal-900/25 sm:text-6xl"
          dir="rtl"
        >
          {word.arabic}
        </p>
        <p className="px-4 pt-4 text-center text-sm font-semibold text-teal-800">
          {word.english} — {word.tip}
        </p>
        <canvas
          ref={canvasRef}
          width={640}
          height={280}
          className="relative z-10 w-full touch-none"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={() => {
            if (drawing.current) setStrokeCount((n) => n + 1);
            drawing.current = false;
          }}
          onPointerLeave={() => {
            drawing.current = false;
          }}
        />
      </div>
      <button type="button" onClick={clear} className="rounded-xl border border-sand-200 bg-white px-4 py-2 font-bold">
        Clear trace
      </button>
      <ClaimCreatePointsButton activity="creative" ready={strokeCount >= 2} />
    </CreateShell>
  );
}
