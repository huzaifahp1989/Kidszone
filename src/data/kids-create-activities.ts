export type CreateActivityCard = {
  href: string;
  emoji: string;
  title: string;
  blurb: string;
  pointsNote: string;
  badge?: string;
};

/** Hub activities — claimable once per day (shared creative cap for art tools). */
export const CREATE_HUB_ACTIVITIES: CreateActivityCard[] = [
  {
    href: '/create/coloring',
    emoji: '🎨',
    title: 'Islamic Colouring',
    blurb: 'Colour a masjid, lantern, crescent and more',
    pointsNote: '+25 pts · once per day (Create)',
    badge: 'NEW',
  },
  {
    href: '/create/draw',
    emoji: '✏️',
    title: 'Draw & Share',
    blurb: 'Draw a kind Islamic scene',
    pointsNote: '+25 pts · once per day (Create)',
    badge: 'NEW',
  },
  {
    href: '/create/dot-to-dot',
    emoji: '🔢',
    title: 'Dot-to-Dot',
    blurb: 'Connect the dots to reveal an Islamic picture',
    pointsNote: '+25 pts · once per day (Create)',
    badge: 'NEW',
  },
  {
    href: '/create/trace',
    emoji: '✍️',
    title: 'Trace Arabic',
    blurb: 'Trace beautiful words like Bismillah',
    pointsNote: '+25 pts · once per day (Create)',
    badge: 'NEW',
  },
  {
    href: '/create/ayah-colour',
    emoji: '🌈',
    title: 'Ayah Colour-by-Number',
    blurb: 'Colour sections as you learn a short ayah',
    pointsNote: '+25 pts · once per day (Create)',
    badge: 'NEW',
  },
  {
    href: '/create/story',
    emoji: '📖',
    title: 'Story Adventure',
    blurb: 'Choose what happens next in a manners story',
    pointsNote: '+25 pts · once per day',
    badge: 'NEW',
  },
  {
    href: '/create/dua',
    emoji: '🤲',
    title: 'Dua of the Day',
    blurb: "Learn today's dua and say it",
    pointsNote: '+25 pts · once per day',
    badge: 'NEW',
  },
  {
    href: '/create/kindness',
    emoji: '💛',
    title: 'Kindness Hunt',
    blurb: 'Complete 5 kind deeds at home today',
    pointsNote: '+25 pts · once per day',
    badge: 'NEW',
  },
  {
    href: '/create/manners',
    emoji: '✨',
    title: 'Good Manners',
    blurb: 'Practise salam, Bismillah, listening and kind words',
    pointsNote: '+25 pts · once per day',
    badge: 'NEW',
  },
  {
    href: '/create/gallery',
    emoji: '🖼️',
    title: 'My Gallery',
    blurb: 'See artworks you saved from colouring and drawing',
    pointsNote: 'Save & show your creations',
  },
];

export const COLOURING_PALETTE = [
  '#7c3aed',
  '#0d9488',
  '#f59e0b',
  '#ef4444',
  '#3b82f6',
  '#10b981',
  '#ec4899',
  '#f8fafc',
  '#1e1b4b',
  '#f97316',
];

export const TRACE_WORDS = [
  { id: 'bismillah', arabic: 'بِسْمِ اللَّهِ', english: 'Bismillah', tip: 'In the name of Allah' },
  { id: 'allah', arabic: 'اللَّه', english: 'Allah', tip: 'The name of God' },
  { id: 'alhamdulillah', arabic: 'الْحَمْدُ لِلَّهِ', english: 'Alhamdulillah', tip: 'All praise is for Allah' },
  { id: 'subhanallah', arabic: 'سُبْحَانَ اللَّهِ', english: 'SubhanAllah', tip: 'Glory be to Allah' },
];

export const AYAH_COLOUR_NUMBERS = [
  { num: 1, color: '#7c3aed', label: 'Violet' },
  { num: 2, color: '#0d9488', label: 'Teal' },
  { num: 3, color: '#f59e0b', label: 'Gold' },
  { num: 4, color: '#3b82f6', label: 'Blue' },
];

export const STORY_ADVENTURE = {
  title: 'The Shared Apple',
  startId: 'start',
  nodes: {
    start: {
      text: 'You have one apple and your friend looks hungry. What do you do?',
      choices: [
        { label: 'Eat it all myself', next: 'selfish' },
        { label: 'Share half', next: 'share' },
        { label: 'Give them the whole apple', next: 'give' },
      ],
    },
    selfish: {
      text: 'Your friend looks sad. The Prophet ﷺ taught us to love for others what we love for ourselves. What next?',
      choices: [
        { label: 'Say sorry and share next time', next: 'end_kind' },
        { label: 'Ignore them', next: 'end_learn' },
      ],
    },
    share: {
      text: 'Your friend smiles! Sharing is a beautiful sunnah. How do you feel?',
      choices: [
        { label: 'Happy and grateful', next: 'end_kind' },
        { label: 'Make dua together', next: 'end_best' },
      ],
    },
    give: {
      text: 'You gave your apple away for Allah. That is great generosity! Your friend thanks you.',
      choices: [{ label: 'Alhamdulillah — end story', next: 'end_best' }],
    },
    end_kind: {
      text: 'MashaAllah! Kindness and sharing make hearts soft. You finished the adventure.',
      choices: [],
      ending: true,
    },
    end_learn: {
      text: 'Today is a chance to try again tomorrow with more kindness. You finished the adventure.',
      choices: [],
      ending: true,
    },
    end_best: {
      text: 'Beautiful manners! The Prophet ﷺ loved generosity. You finished the adventure.',
      choices: [],
      ending: true,
    },
  } as Record<
    string,
    {
      text: string;
      choices: Array<{ label: string; next: string }>;
      ending?: boolean;
    }
  >,
};

export const DAILY_DUAS = [
  {
    id: 'eating',
    title: 'Before eating',
    arabic: 'بِسْمِ اللَّهِ',
    transliteration: 'Bismillah',
    meaning: 'In the name of Allah',
  },
  {
    id: 'sleep',
    title: 'Before sleep',
    arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    transliteration: "Bismika Allahumma amutu wa ahya",
    meaning: 'In Your name, O Allah, I die and I live',
  },
  {
    id: 'leave-home',
    title: 'Leaving home',
    arabic: 'بِسْمِ اللَّهِ تَوَكَّلْتُ عَلَى اللَّهِ',
    transliteration: "Bismillahi tawakkaltu 'ala Allah",
    meaning: 'In the name of Allah, I place my trust in Allah',
  },
  {
    id: 'angry',
    title: 'When angry',
    arabic: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ',
    transliteration: "A'udhu billahi min ash-shaytan ir-rajeem",
    meaning: 'I seek refuge in Allah from the rejected Shaytan',
  },
  {
    id: 'parents',
    title: 'For parents',
    arabic: 'رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا',
    transliteration: "Rabbi irhamhuma kama rabbayani sagheera",
    meaning: 'My Lord, have mercy on them as they raised me when I was small',
  },
  {
    id: 'knowledge',
    title: 'For knowledge',
    arabic: 'رَبِّ زِدْنِي عِلْمًا',
    transliteration: "Rabbi zidni 'ilma",
    meaning: 'My Lord, increase me in knowledge',
  },
  {
    id: 'enter-home',
    title: 'Entering home',
    arabic: 'بِسْمِ اللَّهِ وَلَجْنَا',
    transliteration: 'Bismillahi walajna',
    meaning: 'In the name of Allah we enter',
  },
];

export function getDuaOfTheDay(date = new Date()) {
  const dayIndex = Math.floor(date.getTime() / 86_400_000);
  return DAILY_DUAS[((dayIndex % DAILY_DUAS.length) + DAILY_DUAS.length) % DAILY_DUAS.length];
}

export const KINDNESS_TASKS = [
  { id: 'help-home', label: 'Help with one chore at home', emoji: '🧹' },
  { id: 'smile', label: 'Smile at someone today', emoji: '😊' },
  { id: 'thank', label: 'Say jazakAllahu khairan to someone', emoji: '🤝' },
  { id: 'dua-parent', label: 'Make dua for your parents', emoji: '🤲' },
  { id: 'share', label: 'Share food, a toy, or kind words', emoji: '🍎' },
];

/** Dot path roughly shapes a crescent */
export const DOT_TO_DOT_POINTS: Array<{ n: number; x: number; y: number }> = [
  { n: 1, x: 80, y: 40 },
  { n: 2, x: 140, y: 30 },
  { n: 3, x: 190, y: 55 },
  { n: 4, x: 210, y: 110 },
  { n: 5, x: 190, y: 165 },
  { n: 6, x: 140, y: 190 },
  { n: 7, x: 80, y: 175 },
  { n: 8, x: 55, y: 120 },
  { n: 9, x: 70, y: 70 },
  { n: 10, x: 100, y: 55 },
  { n: 11, x: 130, y: 70 },
  { n: 12, x: 145, y: 110 },
  { n: 13, x: 130, y: 150 },
  { n: 14, x: 95, y: 155 },
  { n: 15, x: 75, y: 120 },
];
