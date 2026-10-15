import {
  ACTIVITY_BONUS_POINTS,
  AUDIO_COMPETITION_APPROVED_POINTS,
  RECORDING_APPROVED_POINTS,
} from '@/lib/points-policy';

export type WhatsNewItem = {
  href: string;
  emoji: string;
  title: string;
  blurb: string;
  badge?: string;
  pointsHint?: string;
};

/** Featured activities — keep this list short and accurate. */
export const WHATS_NEW_ITEMS: WhatsNewItem[] = [
  {
    href: '/story-writer',
    emoji: '✍️',
    title: 'Islamic Story Writer',
    blurb: 'Write an Islamic story, submit it for review, and earn Kids Zone points',
    badge: 'NEW',
  },
  {
    href: '/quran-duel',
    emoji: '⚔️',
    title: 'Quran Duel',
    blurb: 'Challenge a friend to a Quran knowledge duel',
    badge: 'NEW',
  },
  {
    href: '/kids-channel',
    emoji: '📺',
    title: 'Kids Channel',
    blurb: 'Watch Quran, nasheeds and Islamic stories — earn points when you finish',
    badge: 'NEW',
  },
  {
    href: '/points-calendar',
    emoji: '📅',
    title: 'Points Calendar',
    blurb: 'Check points by day, month, and year',
    badge: 'NEW',
  },
  {
    href: '/quran/daily',
    emoji: '📿',
    title: 'Daily Duas',
    blurb: 'Learn a daily dua and dhikr',
    badge: 'NEW',
  },
  {
    href: '/stars',
    emoji: '⭐',
    title: 'Collect Stars',
    blurb: 'Earn 150+ monthly points for a star — 2+ stars enter the quarterly draw',
    badge: 'FEATURED',
  },
  {
    href: '/create',
    emoji: '🎨',
    title: 'Create & Play',
    blurb: 'New stories, lantern & star dot-to-dots, download your drawings',
    badge: 'UPDATED',
  },
  {
    href: '/competitions/written',
    emoji: '✍️',
    title: 'Written Competitions',
    blurb: 'Browse open written quizzes and prize draws in one hub',
    badge: 'FEATURED',
  },
  {
    href: '/reminders',
    emoji: '🔔',
    title: 'Daily Reminders',
    blurb: 'Adhan, quiz, and activity alarms — even when the app is closed',
    badge: 'HELPFUL',
  },
  {
    href: '/quran/listen',
    emoji: '🎧',
    title: 'Quran Listening',
    blurb: 'Listen to short and long surahs with top reciters',
    pointsHint: `+${ACTIVITY_BONUS_POINTS}`,
  },
  {
    href: '/audio-quiz',
    emoji: '🎙️',
    title: 'Audio Quiz',
    blurb: 'Listen, record your voice answer, earn points when approved',
    pointsHint: `+${AUDIO_COMPETITION_APPROVED_POINTS}`,
  },
];

/** Extra earn / explore links shown on Quiz / Games / Pledge. */
export const EARN_MORE_LINKS: WhatsNewItem[] = [
  {
    href: '/kids-channel',
    emoji: '📺',
    title: 'Kids Channel',
    blurb: 'Quran, nasheeds & stories on YouTube',
    badge: 'NEW',
  },
  {
    href: '/points-calendar',
    emoji: '📅',
    title: 'Points calendar',
    blurb: 'Daily, monthly & yearly totals',
    badge: 'NEW',
  },
  {
    href: '/stars',
    emoji: '⭐',
    title: 'Stars',
    blurb: 'Monthly stars → quarterly prize draw',
    badge: 'FEATURED',
  },
  {
    href: '/competitions/written',
    emoji: '✍️',
    title: 'Written competitions',
    blurb: 'All open written quizzes',
    badge: 'FEATURED',
  },
  {
    href: '/competitions/rabi-ul-awwal',
    emoji: '🌙',
    title: 'Seerah Quiz',
    blurb: 'Write answers for Rabi ul Awwal',
  },
  {
    href: '/quran/listen',
    emoji: '🎧',
    title: 'Quran Listen',
    blurb: 'Short + long surahs with reciters',
    pointsHint: `+${ACTIVITY_BONUS_POINTS}`,
  },
  {
    href: '/audio-quiz',
    emoji: '🎙️',
    title: 'Audio Quiz',
    blurb: 'Voice answers to audio questions',
    pointsHint: `+${AUDIO_COMPETITION_APPROVED_POINTS}`,
  },
  {
    href: '/studio',
    emoji: '🎙️',
    title: 'Record & Earn',
    blurb: "Qur'an, Nasheed, Hadith, Stories",
    pointsHint: `+${RECORDING_APPROVED_POINTS}`,
  },
  {
    href: '/create',
    emoji: '🎨',
    title: 'Create & Play',
    blurb: 'Colour, draw, stories & more',
    badge: 'UPDATED',
  },
  {
    href: '/hadith',
    emoji: '📜',
    title: 'Daily Hadith',
    blurb: "Write about one of today's 5",
    pointsHint: `+${ACTIVITY_BONUS_POINTS}`,
  },
  {
    href: '/quiz',
    emoji: '🧠',
    title: 'Daily Quiz',
    blurb: 'Up to 2 quizzes a day',
    pointsHint: `+${ACTIVITY_BONUS_POINTS}`,
  },
  {
    href: '/games',
    emoji: '🎮',
    title: 'Games',
    blurb: 'Play and learn',
    pointsHint: `+${ACTIVITY_BONUS_POINTS}`,
  },
  {
    href: '/pledge',
    emoji: '📿',
    title: 'Pledge',
    blurb: 'Durood & Zikr',
    pointsHint: `+${ACTIVITY_BONUS_POINTS}`,
  },
  {
    href: '/salah',
    emoji: '🕌',
    title: 'Salah',
    blurb: 'Log all 5 prayers',
    pointsHint: `+${ACTIVITY_BONUS_POINTS}`,
  },
];
