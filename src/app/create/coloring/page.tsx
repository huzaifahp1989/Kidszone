'use client';

import React, { useState } from 'react';
import { CreateShell } from '@/components/CreateShell';
import { ClaimCreatePointsButton } from '@/components/ClaimCreatePointsButton';
import { COLOURING_PALETTE } from '@/data/kids-create-activities';
import { SaveToGalleryButton } from '@/components/SaveToGalleryButton';

type Shape = {
  id: string;
  label: string;
  type: 'rect' | 'circle' | 'ellipse' | 'path';
  props: Record<string, string | number>;
};

type ColourPage = { id: string; title: string; shapes: Shape[] };

const PAGES: ColourPage[] = [
  {
    id: 'crescent',
    title: 'Crescent & Star',
    shapes: [
      { id: 'sky', label: 'Sky', type: 'rect', props: { x: 0, y: 0, width: 320, height: 220, rx: 16 } },
      { id: 'moon', label: 'Moon', type: 'circle', props: { cx: 130, cy: 110, r: 55 } },
      { id: 'cutout', label: 'Cutout', type: 'circle', props: { cx: 155, cy: 100, r: 42 } },
      {
        id: 'star',
        label: 'Star',
        type: 'path',
        props: {
          d: 'M230 70 L238 92 L262 92 L242 106 L250 128 L230 114 L210 128 L218 106 L198 92 L222 92 Z',
        },
      },
    ],
  },
  {
    id: 'lantern',
    title: 'Ramadan Lantern',
    shapes: [
      { id: 'bg', label: 'Background', type: 'rect', props: { x: 0, y: 0, width: 320, height: 220, rx: 16 } },
      { id: 'hook', label: 'Hook', type: 'rect', props: { x: 152, y: 18, width: 16, height: 18, rx: 4 } },
      { id: 'top', label: 'Top', type: 'rect', props: { x: 120, y: 36, width: 80, height: 22, rx: 6 } },
      { id: 'body', label: 'Body', type: 'rect', props: { x: 110, y: 58, width: 100, height: 110, rx: 14 } },
      { id: 'glass', label: 'Glass', type: 'rect', props: { x: 128, y: 78, width: 64, height: 70, rx: 10 } },
      { id: 'base', label: 'Base', type: 'rect', props: { x: 118, y: 170, width: 84, height: 18, rx: 6 } },
    ],
  },
  {
    id: 'masjid',
    title: 'Little Masjid',
    shapes: [
      { id: 'sky', label: 'Sky', type: 'rect', props: { x: 0, y: 0, width: 320, height: 220, rx: 16 } },
      { id: 'ground', label: 'Ground', type: 'rect', props: { x: 0, y: 175, width: 320, height: 45 } },
      { id: 'dome', label: 'Dome', type: 'ellipse', props: { cx: 150, cy: 95, rx: 70, ry: 45 } },
      { id: 'wall', label: 'Wall', type: 'rect', props: { x: 80, y: 95, width: 140, height: 80, rx: 8 } },
      { id: 'door', label: 'Door', type: 'rect', props: { x: 130, y: 125, width: 40, height: 50, rx: 8 } },
      { id: 'minaret', label: 'Minaret', type: 'rect', props: { x: 235, y: 55, width: 28, height: 120, rx: 6 } },
      { id: 'minaret-top', label: 'Minaret top', type: 'ellipse', props: { cx: 249, cy: 52, rx: 20, ry: 14 } },
    ],
  },
];

function ShapeEl({
  shape,
  fill,
  onPaint,
}: {
  shape: Shape;
  fill: string;
  onPaint: () => void;
}) {
  const style = {
    fill,
    stroke: '#134e4a',
    strokeWidth: 2,
    className: 'cursor-pointer transition hover:opacity-90',
    onClick: onPaint,
  };
  const p = shape.props;

  if (shape.type === 'rect') {
    return (
      <rect
        x={p.x}
        y={p.y}
        width={p.width}
        height={p.height}
        rx={p.rx}
        {...style}
      />
    );
  }
  if (shape.type === 'circle') {
    return <circle cx={p.cx} cy={p.cy} r={p.r} {...style} />;
  }
  if (shape.type === 'ellipse') {
    return <ellipse cx={p.cx} cy={p.cy} rx={p.rx} ry={p.ry} {...style} />;
  }
  return <path d={String(p.d)} {...style} />;
}

export default function ColouringPage() {
  const [pageIndex, setPageIndex] = useState(0);
  const [color, setColor] = useState(COLOURING_PALETTE[0]);
  const [fills, setFills] = useState<Record<string, string>>({});
  const page = PAGES[pageIndex] ?? PAGES[0];
  const paintedCount = page.shapes.filter((s) => fills[`${page.id}-${s.id}`]).length;
  const ready = paintedCount >= Math.min(3, page.shapes.length);

  const paint = (shapeId: string) => {
    setFills((prev) => ({ ...prev, [`${page.id}-${shapeId}`]: color }));
  };

  const captureSvg = () => {
    const svg = document.getElementById('colouring-svg');
    if (!svg) return null;
    const xml = new XMLSerializer().serializeToString(svg);
    const svg64 = btoa(unescape(encodeURIComponent(xml)));
    return `data:image/svg+xml;base64,${svg64}`;
  };

  return (
    <CreateShell title="Islamic Colouring">
      <p className="text-sm text-sand-600">
        Pick a colour and tap a part of the picture. Colour a few parts, then claim today&apos;s Create points.
      </p>

      <div className="flex flex-wrap gap-2">
        {PAGES.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPageIndex(i)}
            className={`rounded-full px-3 py-1.5 text-sm font-bold ${
              i === pageIndex ? 'bg-teal-700 text-white' : 'border border-sand-200 bg-white'
            }`}
          >
            {p.title}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {COLOURING_PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Colour ${c}`}
            onClick={() => setColor(c)}
            className={`h-9 w-9 rounded-full border-2 ${color === c ? 'border-sand-900 scale-110' : 'border-white shadow'}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <div className="overflow-hidden rounded-3xl border border-sand-200 bg-white p-4 shadow-sm">
        <svg
          id="colouring-svg"
          viewBox="0 0 320 220"
          className="mx-auto h-auto w-full max-w-md"
          role="img"
          aria-label={page.title}
        >
          {page.shapes.map((shape) => (
            <ShapeEl
              key={shape.id}
              shape={shape}
              fill={fills[`${page.id}-${shape.id}`] || (shape.id === 'cutout' ? '#ffffff' : '#e2e8f0')}
              onPaint={() => paint(shape.id)}
            />
          ))}
        </svg>
      </div>

      <ClaimCreatePointsButton activity="creative" ready={ready} />
      <SaveToGalleryButton
        kind="coloring"
        title={page.title}
        getDataUrl={captureSvg}
        disabled={!ready}
      />
    </CreateShell>
  );
}
