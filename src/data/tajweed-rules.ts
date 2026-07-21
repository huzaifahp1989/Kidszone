export type TajweedRule = {
  id: string;
  name: string;
  kidName: string;
  color: string;
  description: string;
  kidTip: string;
  category: 'silent' | 'madd' | 'qalqalah' | 'ghunnah' | 'ikhfa' | 'idgham' | 'iqlab';
};

/** Tajweed colour rules from alquran.cloud quran-tajweed edition */
export const TAJWEED_RULES: Record<string, TajweedRule> = {
  h: {
    id: 'h',
    name: 'Hamzat ul Wasl',
    kidName: 'Connecting hamzah',
    color: '#9CA3AF',
    description: 'Hamzat ul Wasl — connect smoothly when joining words.',
    kidTip: 'This letter is only pronounced when you start reading from it.',
    category: 'silent',
  },
  s: {
    id: 's',
    name: 'Silent letter',
    kidName: 'Silent',
    color: '#9CA3AF',
    description: 'Silent — not pronounced.',
    kidTip: 'You skip this letter when reciting.',
    category: 'silent',
  },
  l: {
    id: 'l',
    name: 'Lam Shamsiyyah',
    kidName: 'Sun lam',
    color: '#9CA3AF',
    description: 'Lam Shamsiyyah — the lam is not pronounced.',
    kidTip: 'After this lam, say the next letter with emphasis (like Ash-Shams).',
    category: 'silent',
  },
  n: {
    id: 'n',
    name: 'Normal Madd',
    kidName: 'Stretch (2 counts)',
    color: '#537FFF',
    description: 'Normal prolongation — hold for 2 counts.',
    kidTip: 'Stretch the sound a little — count 1… 2.',
    category: 'madd',
  },
  p: {
    id: 'p',
    name: 'Permissible Madd',
    kidName: 'Stretch (2, 4, or 6)',
    color: '#4050FF',
    description: 'Permissible prolongation — 2, 4, or 6 counts.',
    kidTip: 'You can stretch longer when stopping on this word.',
    category: 'madd',
  },
  m: {
    id: 'm',
    name: 'Necessary Madd',
    kidName: 'Long stretch (6)',
    color: '#000EBC',
    description: 'Necessary prolongation — must hold for 6 counts.',
    kidTip: 'Always stretch this for a long time — 6 counts!',
    category: 'madd',
  },
  o: {
    id: 'o',
    name: 'Obligatory Madd',
    kidName: 'Must stretch (4–5)',
    color: '#2144C1',
    description: 'Obligatory prolongation — 4 or 5 counts.',
    kidTip: 'Hold this stretch in the middle of an ayah.',
    category: 'madd',
  },
  q: {
    id: 'q',
    name: 'Qalqalah',
    kidName: 'Echo bounce',
    color: '#DD0008',
    description: 'Qalqalah — a bouncing echo on the letter.',
    kidTip: 'Make a tiny bounce in your voice on this letter!',
    category: 'qalqalah',
  },
  g: {
    id: 'g',
    name: 'Ghunnah',
    kidName: 'Nasal hum',
    color: '#FF7E1E',
    description: 'Ghunnah — nasal sound for 2 counts.',
    kidTip: 'Hum through your nose for 2 counts (like nnng).',
    category: 'ghunnah',
  },
  f: {
    id: 'f',
    name: "Ikhfa'",
    kidName: 'Hidden noon',
    color: '#9400A8',
    description: "Ikhfa' — hide the noon or tanween sound.",
    kidTip: 'Hide the n sound in your nose without a full hum.',
    category: 'ikhfa',
  },
  c: {
    id: 'c',
    name: "Ikhfa' Shafawi",
    kidName: 'Hidden meem',
    color: '#D500B7',
    description: "Ikhfa' Shafawi — hide the meem sound.",
    kidTip: 'Hide the m sound before another letter.',
    category: 'ikhfa',
  },
  a: {
    id: 'a',
    name: 'Idgham with Ghunnah',
    kidName: 'Merge + hum',
    color: '#169777',
    description: 'Idgham with ghunnah — merge and hum for 2 counts.',
    kidTip: 'Blend into the next letter and hum for 2 counts.',
    category: 'idgham',
  },
  u: {
    id: 'u',
    name: 'Idgham without Ghunnah',
    kidName: 'Merge quickly',
    color: '#169200',
    description: 'Idgham without ghunnah — merge without humming.',
    kidTip: 'Jump straight into the next letter — no hum.',
    category: 'idgham',
  },
  w: {
    id: 'w',
    name: 'Idgham Shafawi',
    kidName: 'Merge meem',
    color: '#58B800',
    description: 'Idgham Shafawi — merge two meems together.',
    kidTip: 'Two meems become one smooth sound.',
    category: 'idgham',
  },
  i: {
    id: 'i',
    name: 'Iqlab',
    kidName: 'Change to meem',
    color: '#26BFFD',
    description: "Iqlab — change noon to a hidden meem sound.",
    kidTip: 'Turn the n into a hidden m in your nose.',
    category: 'iqlab',
  },
  d: {
    id: 'd',
    name: 'Idgham Mutajanisayn',
    kidName: 'Similar letters merge',
    color: '#A1A1A1',
    description: 'Idgham Mutajanisayn — letters that sound alike merge.',
    kidTip: 'Similar sounding letters join together.',
    category: 'idgham',
  },
  b: {
    id: 'b',
    name: 'Idgham Mutaqaribayn',
    kidName: 'Close letters merge',
    color: '#A1A1A1',
    description: 'Idgham Mutaqaribayn — close letters merge.',
    kidTip: 'Letters close in sound join together.',
    category: 'idgham',
  },
};

export const TAJWEED_GUIDE_GROUPS: { title: string; emoji: string; ruleIds: string[] }[] = [
  { title: 'Silent & connecting', emoji: '🤫', ruleIds: ['h', 's', 'l'] },
  { title: 'Stretch (Madd)', emoji: '〰️', ruleIds: ['n', 'p', 'm', 'o'] },
  { title: 'Bounce (Qalqalah)', emoji: '🔴', ruleIds: ['q'] },
  { title: 'Hum (Ghunnah)', emoji: '🟠', ruleIds: ['g'] },
  { title: 'Hide (Ikhfa)', emoji: '🟣', ruleIds: ['f', 'c'] },
  { title: 'Merge (Idgham)', emoji: '🟢', ruleIds: ['a', 'u', 'w', 'd', 'b'] },
  { title: 'Change (Iqlab)', emoji: '🔵', ruleIds: ['i'] },
];

export function getTajweedRule(id: string): TajweedRule | undefined {
  return TAJWEED_RULES[id];
}
