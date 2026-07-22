import { DOT_TO_DOT_POINTS, KINDNESS_TASKS, TRACE_WORDS } from '@/data/kids-create-activities';
import { MANNERS_TASKS } from '@/data/kids-new-activities';

export type OfflineActivityKind = 'colouring' | 'checklist' | 'trace' | 'dot' | 'card' | 'maze';

export type OfflineActivity = {
  id: string;
  kind: OfflineActivityKind;
  emoji: string;
  title: string;
  blurb: string;
  minutes: string;
  ages: string;
};

export const OFFLINE_ACTIVITIES: OfflineActivity[] = [
  {
    id: 'colour-crescent',
    kind: 'colouring',
    emoji: '🌙',
    title: 'Crescent & Star Colouring',
    blurb: 'Print and colour a crescent moon and star',
    minutes: '10–15 min',
    ages: '5–10',
  },
  {
    id: 'colour-lantern',
    kind: 'colouring',
    emoji: '🏮',
    title: 'Ramadan Lantern Colouring',
    blurb: 'Print a lantern outline to colour at home',
    minutes: '10–15 min',
    ages: '5–10',
  },
  {
    id: 'colour-masjid',
    kind: 'colouring',
    emoji: '🕌',
    title: 'Little Masjid Colouring',
    blurb: 'Colour a simple masjid with a dome and minaret',
    minutes: '15 min',
    ages: '5–12',
  },
  {
    id: 'dot-crescent',
    kind: 'dot',
    emoji: '🔢',
    title: 'Crescent Dot-to-Dot',
    blurb: 'Connect the numbers to reveal a crescent',
    minutes: '10 min',
    ages: '5–9',
  },
  {
    id: 'trace-arabic',
    kind: 'trace',
    emoji: '✍️',
    title: 'Arabic Tracing Sheet',
    blurb: 'Trace Bismillah, Allah, and more beautiful words',
    minutes: '10–15 min',
    ages: '6–12',
  },
  {
    id: 'kindness-checklist',
    kind: 'checklist',
    emoji: '💛',
    title: 'Kindness Hunt Checklist',
    blurb: 'Take-home kind deeds to tick with a parent',
    minutes: 'All day',
    ages: '5–14',
  },
  {
    id: 'manners-checklist',
    kind: 'checklist',
    emoji: '✨',
    title: 'Good Manners Checklist',
    blurb: 'Practise salam, Bismillah, and kind words offline',
    minutes: 'All day',
    ages: '5–14',
  },
  {
    id: 'dua-card',
    kind: 'card',
    emoji: '🤲',
    title: 'Dua Practice Card',
    blurb: 'Print a dua card to keep by your bed or table',
    minutes: '5 min',
    ages: '5–14',
  },
  {
    id: 'salah-maze',
    kind: 'maze',
    emoji: '🧭',
    title: 'Path to the Masjid Maze',
    blurb: 'Help the child find the way to the masjid',
    minutes: '10 min',
    ages: '5–10',
  },
];

export function getOfflineActivity(id: string): OfflineActivity | undefined {
  return OFFLINE_ACTIVITIES.find((a) => a.id === id);
}

/** Outline SVGs for colouring printables (white fill, dark stroke). */
export const OFFLINE_COLOURING_SVGS: Record<string, string> = {
  'colour-crescent': `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220" width="320" height="220">
  <rect x="0" y="0" width="320" height="220" rx="16" fill="#ffffff" stroke="#134e4a" stroke-width="2"/>
  <circle cx="130" cy="110" r="55" fill="#ffffff" stroke="#134e4a" stroke-width="2"/>
  <circle cx="155" cy="100" r="42" fill="#ffffff" stroke="#134e4a" stroke-width="2"/>
  <path d="M230 70 L238 92 L262 92 L242 106 L250 128 L230 114 L210 128 L218 106 L198 92 L222 92 Z" fill="#ffffff" stroke="#134e4a" stroke-width="2"/>
  <text x="160" y="210" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#64748b">Kids Zone · Crescent &amp; Star</text>
</svg>`,
  'colour-lantern': `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220" width="320" height="220">
  <rect x="0" y="0" width="320" height="220" rx="16" fill="#ffffff" stroke="#134e4a" stroke-width="2"/>
  <rect x="152" y="18" width="16" height="18" rx="4" fill="#ffffff" stroke="#134e4a" stroke-width="2"/>
  <rect x="120" y="36" width="80" height="22" rx="6" fill="#ffffff" stroke="#134e4a" stroke-width="2"/>
  <rect x="110" y="58" width="100" height="110" rx="14" fill="#ffffff" stroke="#134e4a" stroke-width="2"/>
  <rect x="128" y="78" width="64" height="70" rx="10" fill="#ffffff" stroke="#134e4a" stroke-width="2"/>
  <rect x="118" y="170" width="84" height="18" rx="6" fill="#ffffff" stroke="#134e4a" stroke-width="2"/>
  <text x="160" y="210" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#64748b">Kids Zone · Ramadan Lantern</text>
</svg>`,
  'colour-masjid': `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220" width="320" height="220">
  <rect x="0" y="0" width="320" height="220" rx="16" fill="#ffffff" stroke="#134e4a" stroke-width="2"/>
  <rect x="0" y="175" width="320" height="45" fill="#ffffff" stroke="#134e4a" stroke-width="2"/>
  <ellipse cx="150" cy="95" rx="70" ry="45" fill="#ffffff" stroke="#134e4a" stroke-width="2"/>
  <rect x="80" y="95" width="140" height="80" rx="8" fill="#ffffff" stroke="#134e4a" stroke-width="2"/>
  <rect x="130" y="125" width="40" height="50" rx="8" fill="#ffffff" stroke="#134e4a" stroke-width="2"/>
  <rect x="235" y="55" width="28" height="120" rx="6" fill="#ffffff" stroke="#134e4a" stroke-width="2"/>
  <ellipse cx="249" cy="52" rx="20" ry="14" fill="#ffffff" stroke="#134e4a" stroke-width="2"/>
  <text x="160" y="210" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#64748b">Kids Zone · Little Masjid</text>
</svg>`,
};

export function buildDotToDotSvg(): string {
  const dots = DOT_TO_DOT_POINTS.map(
    (d) =>
      `<g>
  <circle cx="${d.x}" cy="${d.y}" r="8" fill="#ffffff" stroke="#134e4a" stroke-width="1.5"/>
  <text x="${d.x}" y="${d.y + 3.5}" text-anchor="middle" font-family="sans-serif" font-size="8" font-weight="bold" fill="#134e4a">${d.n}</text>
</g>`
  ).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 220" width="520" height="440">
  <rect x="0" y="0" width="260" height="220" fill="#ffffff"/>
  ${dots}
  <text x="130" y="212" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#64748b">Connect 1 → ${DOT_TO_DOT_POINTS.length} · Kids Zone</text>
</svg>`;
}

export function buildMazeSvg(): string {
  // Simple printable maze: start left → masjid right, with walls as thick lines
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 280" width="720" height="560">
  <rect x="0" y="0" width="360" height="280" fill="#ffffff"/>
  <rect x="20" y="20" width="320" height="220" fill="none" stroke="#134e4a" stroke-width="4"/>
  <path d="M20 60 H120 V100 H60 V140 H140 V60 H200 V180 H100 V220
           M200 60 H280 V100 H240 V140 H320
           M180 140 H240 V180 H160 V220 H280 V180
           M60 180 H100" fill="none" stroke="#134e4a" stroke-width="4" stroke-linecap="square"/>
  <circle cx="40" cy="40" r="10" fill="#ffffff" stroke="#0d9488" stroke-width="3"/>
  <text x="40" y="44" text-anchor="middle" font-size="9" font-weight="bold" fill="#0d9488">START</text>
  <rect x="290" y="190" width="40" height="40" rx="6" fill="#ffffff" stroke="#0d9488" stroke-width="3"/>
  <text x="310" y="214" text-anchor="middle" font-size="16">🕌</text>
  <text x="180" y="265" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#64748b">Help find the path to the masjid · Kids Zone</text>
</svg>`;
}

export { KINDNESS_TASKS, MANNERS_TASKS, TRACE_WORDS, DOT_TO_DOT_POINTS };
