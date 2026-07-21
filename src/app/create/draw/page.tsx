'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CreateShell } from '@/components/CreateShell';
import { COLOURING_PALETTE } from '@/data/kids-create-activities';

const PROMPTS = [
  'Draw something kind you did today',
  'Draw a masjid under the moon',
  'Draw your family saying Assalamu Alaikum',
  'Draw a gift of charity (sadaqah)',
];

export default function DrawPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [color, setColor] = useState(COLOURING_PALETTE[1]);
  const [prompt] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

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
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => {
    drawing.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <CreateShell title="Draw & Share">
      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
        Prompt: {prompt}
      </p>
      <div className="flex flex-wrap gap-2">
        {COLOURING_PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={`h-9 w-9 rounded-full border-2 ${color === c ? 'border-sand-900' : 'border-white'}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <canvas
        ref={canvasRef}
        width={640}
        height={420}
        className="w-full touch-none rounded-3xl border-2 border-sand-200 bg-white shadow-sm"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <button type="button" onClick={clear} className="rounded-xl border border-sand-200 bg-white px-4 py-2 font-bold">
        Clear
      </button>
    </CreateShell>
  );
}
