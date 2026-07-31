'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components';
import {
  ACTIVITY_BONUS_POINTS,
  AUDIO_COMPETITION_APPROVED_POINTS,
  DAILY_EARNING_PLAN,
  POINTS_DAILY_CAP,
  RECORDING_APPROVED_POINTS,
} from '@/lib/points-policy';

type TemplateId = 'makkah' | 'madinah' | 'aqsa';

type Template = {
  id: TemplateId;
  name: string;
  emoji: string;
  regionIds: string[];
};

const templates: Template[] = [
  { id: 'makkah', name: 'Makkah', emoji: '🕋', regionIds: ['sky', 'ground', 'kaaba', 'band', 'door', 'tower', 'arches'] },
  { id: 'madinah', name: 'Madinah', emoji: '🕌', regionIds: ['sky', 'ground', 'dome', 'minaret', 'walls', 'arches'] },
  { id: 'aqsa', name: 'Masjid Al-Aqsa', emoji: '🕌', regionIds: ['sky', 'ground', 'dome', 'walls', 'columns', 'arches'] },
];

const palette = [
  '#ef4444',
  '#f97316',
  '#facc15',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#a855f7',
  '#ec4899',
  '#111827',
  '#ffffff',
];

const EXTRA_POINT_ACTIVITIES: Array<{
  title: string;
  href: string;
  pointsLabel: string;
  limitLabel: string;
  note: string;
  external?: boolean;
}> = [
  {
    title: 'August 2026 Manual Quiz',
    href: '/quiz-challenge/aug-2026-mixed',
    pointsLabel: 'Up to +200 points',
    limitLabel: 'One submission',
    note: '40 questions — Seerah, Hadith, Quran, Sahabah, Prophets, Akhlaq, Fiqh. Admins read each answer and award points.',
  },
  {
    title: 'Quran Listening Club',
    href: '/quran/listen',
    pointsLabel: `+${ACTIVITY_BONUS_POINTS} points`,
    limitLabel: '1 time/day',
    note: 'Listen for at least 3 minutes before claiming daily points.',
  },
  {
    title: 'Audio Quiz',
    href: '/audio-quiz',
    pointsLabel: `+${AUDIO_COMPETITION_APPROVED_POINTS} points`,
    limitLabel: 'When approved',
    note: 'Submit your voice answer and points are added after approval.',
  },
  {
    title: 'Recording Studio',
    href: '/studio',
    pointsLabel: `+${RECORDING_APPROVED_POINTS} points`,
    limitLabel: 'When approved',
    note: "Record Qur'an, nasheed, hadith, or story audio to earn points.",
  },
  {
    title: 'Kids Survey Reward',
    href: 'https://docs.google.com/forms/d/e/1FAIpQLScPwSgQimR0x2Qk8mxvQ1q_LDdAXZGqX14ZxgVLz7Y2AmA5GQ/viewform',
    pointsLabel: '+50 points',
    limitLabel: 'As announced',
    note: 'Open the survey form and submit it to claim the reward.',
    external: true,
  },
];

function downloadTextFile(filename: string, text: string, mimeType: string) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ActivitiesPage() {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<TemplateId>('makkah');
  const [selectedColor, setSelectedColor] = useState('#facc15');

  const initialFills = useMemo(() => {
    const base: Record<TemplateId, Record<string, string>> = {
      makkah: { sky: '#e0f2fe', ground: '#fef3c7', kaaba: '#111827', band: '#facc15', door: '#b45309', tower: '#e5e7eb', arches: '#f3f4f6' },
      madinah: { sky: '#e0f2fe', ground: '#fef3c7', dome: '#16a34a', minaret: '#e5e7eb', walls: '#f3f4f6', arches: '#d1d5db' },
      aqsa: { sky: '#e0f2fe', ground: '#fef3c7', dome: '#f59e0b', walls: '#f3f4f6', columns: '#e5e7eb', arches: '#d1d5db' },
    };
    return base;
  }, []);

  const [fills, setFills] = useState<Record<TemplateId, Record<string, string>>>(initialFills);

  const setRegionFill = (regionId: string) => {
    setFills((prev) => ({
      ...prev,
      [activeTemplate]: {
        ...prev[activeTemplate],
        [regionId]: selectedColor,
      },
    }));
  };

  const reset = () => {
    setFills((prev) => ({
      ...prev,
      [activeTemplate]: { ...initialFills[activeTemplate] },
    }));
  };

  const downloadSvg = () => {
    const el = svgRef.current;
    if (!el) return;
    const xml = new XMLSerializer().serializeToString(el);
    const safeName = activeTemplate === 'aqsa' ? 'masjid-al-aqsa' : activeTemplate;
    downloadTextFile(`${safeName}-colouring.svg`, `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`, 'image/svg+xml');
  };

  const current = fills[activeTemplate];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-sky-50 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between gap-4">
          <Button variant="outline" onClick={() => router.push('/')}>
            ← Home
          </Button>
          <h1 className="text-3xl sm:text-4xl font-black text-islamic-dark islamic-shadow text-center flex-1">
            🎨 Kids Activities
          </h1>
          <div className="w-[92px] hidden sm:block" />
        </div>

        <div className="bg-white rounded-3xl shadow-kids border-2 border-slate-100 p-6 md:p-8">
          <div className="mb-8 rounded-2xl border-2 border-violet-200 bg-violet-50 p-4 sm:p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">Activities</p>
            <h2 className="mt-1 text-2xl font-black text-violet-950">All activities that can earn points</h2>
            <p className="mt-1 text-sm text-violet-800">
              You can earn up to <span className="font-black">{POINTS_DAILY_CAP} points per day</span>. Pick any mix of activities below.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {DAILY_EARNING_PLAN.map((item) => {
                const maxPoints = item.limit * item.pointsEach;
                return (
                  <Link
                    key={item.activity}
                    href={item.href}
                    className="rounded-xl border border-violet-200 bg-white p-4 transition hover:border-violet-300 hover:bg-violet-100/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-black text-slate-900">{item.title}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-violet-700">
                          {item.limit}x daily · +{item.pointsEach} each
                        </p>
                      </div>
                      <span className="rounded-lg bg-violet-700 px-2.5 py-1 text-xs font-black text-white">
                        +{maxPoints} max
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-violet-700">More point activities</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {EXTRA_POINT_ACTIVITIES.map((item) => (
                <div key={item.title} className="rounded-xl border border-violet-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-base font-black text-slate-900">{item.title}</p>
                    <span className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-black text-white">{item.pointsLabel}</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-violet-700">{item.limitLabel}</p>
                  <p className="mt-1 text-sm text-slate-700">{item.note}</p>
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex text-sm font-bold text-violet-700 hover:underline"
                    >
                      Open activity →
                    </a>
                  ) : (
                    <Link href={item.href} className="mt-3 inline-flex text-sm font-bold text-violet-700 hover:underline">
                      Open activity →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-cyan-50 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Activity to do</p>
                <h2 className="mt-1 text-xl font-black text-emerald-950">Listen to Quran Daily</h2>
                <p className="mt-1 text-sm text-emerald-900/80">Choose short surahs or longer ones like Ya-Sin and Al-Mulk, then claim daily points.</p>
              </div>
              <Button variant="primary" onClick={() => router.push('/quran/listen')}>
                Open Quran Listen
              </Button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-72 space-y-5">
              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-700">Choose a masjid</p>
                <div className="grid grid-cols-3 md:grid-cols-1 gap-2">
                  {templates.map((t) => {
                    const isActive = t.id === activeTemplate;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setActiveTemplate(t.id)}
                        className={`rounded-2xl border px-3 py-3 text-left transition ${
                          isActive ? 'border-islamic-blue bg-blue-50' : 'border-slate-200 bg-slate-50 hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{t.emoji}</span>
                          <span className="font-bold text-slate-800">{t.name}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-bold text-slate-700">Pick a colour</p>
                <div className="flex flex-wrap gap-2">
                  {palette.map((c) => {
                    const isActive = selectedColor.toLowerCase() === c.toLowerCase();
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSelectedColor(c)}
                        className={`h-10 w-10 rounded-full border-2 transition ${isActive ? 'border-slate-900 scale-105' : 'border-slate-200'}`}
                        style={{ backgroundColor: c }}
                        aria-label={`Select colour ${c}`}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="h-10 w-14 rounded-lg border border-slate-200 bg-white"
                    aria-label="Custom colour"
                  />
                  <div className="text-sm font-semibold text-slate-700">
                    Selected: <span className="font-mono">{selectedColor.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button variant="outline" onClick={reset}>
                  Reset colours
                </Button>
                <Button variant="primary" onClick={downloadSvg}>
                  Download SVG
                </Button>
              </div>

              <div className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-2xl p-4">
                Tap any part of the picture to colour it.
              </div>
            </div>

            <div className="flex-1">
              <div className="rounded-3xl border-2 border-slate-100 bg-slate-50 p-4 overflow-auto">
                {activeTemplate === 'makkah' && (
                  <MakkahSvg ref={svgRef} fills={current} onFill={setRegionFill} />
                )}
                {activeTemplate === 'madinah' && (
                  <MadinahSvg ref={svgRef} fills={current} onFill={setRegionFill} />
                )}
                {activeTemplate === 'aqsa' && (
                  <AqsaSvg ref={svgRef} fills={current} onFill={setRegionFill} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type SvgProps = {
  fills: Record<string, string>;
  onFill: (regionId: string) => void;
};

const MakkahSvg = React.forwardRef<SVGSVGElement, SvgProps>(function MakkahSvg({ fills, onFill }, ref) {
  return (
    <svg ref={ref} viewBox="0 0 900 600" className="w-full h-auto select-none">
      <rect x="0" y="0" width="900" height="600" fill={fills.sky} onClick={() => onFill('sky')} className="cursor-pointer" />
      <rect x="0" y="410" width="900" height="190" fill={fills.ground} onClick={() => onFill('ground')} className="cursor-pointer" />

      <rect x="140" y="220" width="140" height="220" rx="14" fill={fills.tower} onClick={() => onFill('tower')} className="cursor-pointer" />
      <rect x="620" y="220" width="140" height="220" rx="14" fill={fills.tower} onClick={() => onFill('tower')} className="cursor-pointer" />
      <rect x="150" y="250" width="120" height="40" rx="12" fill={fills.arches} onClick={() => onFill('arches')} className="cursor-pointer" />
      <rect x="630" y="250" width="120" height="40" rx="12" fill={fills.arches} onClick={() => onFill('arches')} className="cursor-pointer" />

      <rect x="330" y="200" width="240" height="280" rx="18" fill={fills.kaaba} onClick={() => onFill('kaaba')} className="cursor-pointer" />
      <rect x="330" y="240" width="240" height="36" fill={fills.band} onClick={() => onFill('band')} className="cursor-pointer" />
      <rect x="430" y="320" width="40" height="80" rx="8" fill={fills.door} onClick={() => onFill('door')} className="cursor-pointer" />

      <path
        d="M120 455 C 220 405, 300 405, 360 455 C 420 505, 500 505, 560 455 C 620 405, 700 405, 800 455"
        fill="none"
        stroke="#111827"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M170 470 C 250 430, 320 430, 360 470 C 400 510, 480 510, 520 470 C 560 430, 650 430, 730 470"
        fill="none"
        stroke="#111827"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.35"
      />

      <rect x="0" y="0" width="900" height="600" fill="none" stroke="#0f172a" strokeWidth="10" rx="24" />
    </svg>
  );
});

const MadinahSvg = React.forwardRef<SVGSVGElement, SvgProps>(function MadinahSvg({ fills, onFill }, ref) {
  return (
    <svg ref={ref} viewBox="0 0 900 600" className="w-full h-auto select-none">
      <rect x="0" y="0" width="900" height="600" fill={fills.sky} onClick={() => onFill('sky')} className="cursor-pointer" />
      <rect x="0" y="420" width="900" height="180" fill={fills.ground} onClick={() => onFill('ground')} className="cursor-pointer" />

      <rect x="110" y="170" width="120" height="310" rx="18" fill={fills.minaret} onClick={() => onFill('minaret')} className="cursor-pointer" />
      <rect x="670" y="170" width="120" height="310" rx="18" fill={fills.minaret} onClick={() => onFill('minaret')} className="cursor-pointer" />
      <rect x="120" y="210" width="100" height="46" rx="14" fill={fills.arches} onClick={() => onFill('arches')} className="cursor-pointer" />
      <rect x="680" y="210" width="100" height="46" rx="14" fill={fills.arches} onClick={() => onFill('arches')} className="cursor-pointer" />

      <rect x="210" y="260" width="480" height="220" rx="28" fill={fills.walls} onClick={() => onFill('walls')} className="cursor-pointer" />
      <path
        d="M450 160 C 510 160, 560 210, 560 270 L 340 270 C 340 210, 390 160, 450 160 Z"
        fill={fills.dome}
        onClick={() => onFill('dome')}
        className="cursor-pointer"
      />
      <rect x="330" y="260" width="240" height="62" rx="22" fill={fills.arches} onClick={() => onFill('arches')} className="cursor-pointer" />
      <rect x="250" y="320" width="90" height="70" rx="18" fill={fills.arches} onClick={() => onFill('arches')} className="cursor-pointer" />
      <rect x="560" y="320" width="90" height="70" rx="18" fill={fills.arches} onClick={() => onFill('arches')} className="cursor-pointer" />

      <circle cx="450" cy="150" r="10" fill="#0f172a" />
      <rect x="0" y="0" width="900" height="600" fill="none" stroke="#0f172a" strokeWidth="10" rx="24" />
    </svg>
  );
});

const AqsaSvg = React.forwardRef<SVGSVGElement, SvgProps>(function AqsaSvg({ fills, onFill }, ref) {
  return (
    <svg ref={ref} viewBox="0 0 900 600" className="w-full h-auto select-none">
      <rect x="0" y="0" width="900" height="600" fill={fills.sky} onClick={() => onFill('sky')} className="cursor-pointer" />
      <rect x="0" y="430" width="900" height="170" fill={fills.ground} onClick={() => onFill('ground')} className="cursor-pointer" />

      <rect x="180" y="280" width="540" height="210" rx="26" fill={fills.walls} onClick={() => onFill('walls')} className="cursor-pointer" />

      <path
        d="M450 165 C 520 165, 585 225, 585 300 L 315 300 C 315 225, 380 165, 450 165 Z"
        fill={fills.dome}
        onClick={() => onFill('dome')}
        className="cursor-pointer"
      />
      <rect x="410" y="148" width="80" height="18" rx="9" fill="#0f172a" opacity="0.25" />

      <g fill={fills.columns} onClick={() => onFill('columns')} className="cursor-pointer">
        <rect x="240" y="330" width="40" height="140" rx="10" />
        <rect x="320" y="330" width="40" height="140" rx="10" />
        <rect x="400" y="330" width="40" height="140" rx="10" />
        <rect x="480" y="330" width="40" height="140" rx="10" />
        <rect x="560" y="330" width="40" height="140" rx="10" />
        <rect x="640" y="330" width="40" height="140" rx="10" />
      </g>

      <g fill={fills.arches} onClick={() => onFill('arches')} className="cursor-pointer">
        <rect x="225" y="300" width="470" height="50" rx="20" />
        <rect x="260" y="350" width="90" height="55" rx="18" />
        <rect x="375" y="350" width="90" height="55" rx="18" />
        <rect x="490" y="350" width="90" height="55" rx="18" />
        <rect x="605" y="350" width="90" height="55" rx="18" />
      </g>

      <rect x="0" y="0" width="900" height="600" fill="none" stroke="#0f172a" strokeWidth="10" rx="24" />
    </svg>
  );
});

