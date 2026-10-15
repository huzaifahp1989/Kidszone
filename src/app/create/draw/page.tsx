'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CreateShell } from '@/components/CreateShell';
import {
  COLOURING_PALETTE,
  getCreateFinishedToday,
  markCreateFinishedToday,
} from '@/data/kids-create-activities';

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
  const [finishedToday, setFinishedToday] = useState(false);

  useEffect(() => {
    setFinishedToday(getCreateFinishedToday().includes('draw'));
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

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `kids-zone-drawing-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    markCreateFinishedToday('draw');
    setFinishedToday(true);
  };

  return (
    <CreateShell title="Draw & Share">
      {finishedToday && (
        <p className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-bold text-teal-800">
          ✓ Drawing saved sticker for today — download again anytime!
        </p>
      )}
      <p className="rounded-2xl border border-gold-200 bg-gold-50 px-4 py-3 text-sm font-semibold text-sand-900">
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
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={clear} className="rounded-xl border border-sand-200 bg-white px-4 py-2 font-bold text-sand-800">
          Clear
        </button>
        <button
          type="button"
          onClick={download}
          className="rounded-xl bg-teal-700 px-4 py-2 font-bold text-white hover:bg-teal-600"
        >
          Download drawing
        </button>
      </div>
    </CreateShell>
  );
}
