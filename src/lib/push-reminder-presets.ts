/** Ready-made push / schedule reminder messages for Kids Zone admin. */

export type PushReminderPreset = {
  key: string;
  label: string;
  title: string;
  body: string;
  url: string;
  /** Suggested UK time for schedules (HH:MM) */
  suggestedTime?: string;
  /** daily | weekly */
  suggestedFrequency?: 'daily' | 'weekly';
  /** 0=Sun … 6=Sat when weekly */
  suggestedDay?: number;
};

export const PUSH_REMINDER_PRESETS: PushReminderPreset[] = [
  {
    key: 'daily_quiz',
    label: 'Daily quiz',
    title: 'Daily Quiz is ready!',
    body: "Open Kids Zone and earn points with today's Islamic quiz.",
    url: '/quiz',
    suggestedTime: '16:00',
    suggestedFrequency: 'daily',
  },
  {
    key: 'morning_quiz',
    label: 'Morning quiz',
    title: 'Good morning, young learner!',
    body: 'Start your day with a short Islamic quiz and collect points.',
    url: '/quiz',
    suggestedTime: '08:30',
    suggestedFrequency: 'daily',
  },
  {
    key: 'streak',
    label: 'Streak',
    title: 'Keep your streak!',
    body: 'Learn something new today — even one quiz counts!',
    url: '/quiz',
    suggestedTime: '17:30',
    suggestedFrequency: 'daily',
  },
  {
    key: 'salah',
    label: 'Salah tracker',
    title: 'Salah reminder',
    body: "Don't forget to log your prayers in the Salah Tracker!",
    url: '/salah',
    suggestedTime: '18:30',
    suggestedFrequency: 'daily',
  },
  {
    key: 'quran',
    label: 'Quran / Juz Amma',
    title: 'Time for Quran',
    body: 'Open Juz Amma and read a short surah with meaning today.',
    url: '/quran/learn',
    suggestedTime: '19:00',
    suggestedFrequency: 'daily',
  },
  {
    key: 'leaderboard',
    label: 'Leaderboard',
    title: 'Check the leaderboard!',
    body: 'See who is on top this week — keep learning and climb higher!',
    url: '/leaderboard',
    suggestedTime: '19:30',
    suggestedFrequency: 'daily',
  },
  {
    key: 'rewards',
    label: 'Rewards',
    title: 'Rewards are waiting',
    body: 'Open Rewards to spin, claim prizes, and see what you can unlock.',
    url: '/rewards',
    suggestedTime: '16:30',
    suggestedFrequency: 'weekly',
    suggestedDay: 5,
  },
  {
    key: 'friday',
    label: 'Jummah Friday',
    title: 'Jummah Mubarak!',
    body: 'Have a blessed Friday — complete your quiz and log your salah today.',
    url: '/quiz',
    suggestedTime: '11:00',
    suggestedFrequency: 'weekly',
    suggestedDay: 5,
  },
  {
    key: 'weekend',
    label: 'Weekend catch-up',
    title: 'Weekend learning time',
    body: 'Use the weekend to catch up on quizzes, Quran, and earn bonus points!',
    url: '/',
    suggestedTime: '10:00',
    suggestedFrequency: 'weekly',
    suggestedDay: 6,
  },
  {
    key: 'games',
    label: 'Games',
    title: 'Play & learn!',
    body: 'Try an Islamic learning game and earn points while having fun.',
    url: '/games',
    suggestedTime: '15:00',
    suggestedFrequency: 'daily',
  },
  {
    key: 'sadaqah',
    label: 'Sadaqah / kindness',
    title: 'Do one kind deed',
    body: 'Smile, help at home, or log a sadaqah — small deeds for Allah count.',
    url: '/',
    suggestedTime: '17:00',
    suggestedFrequency: 'daily',
  },
  {
    key: 'duaa',
    label: 'Dua reminder',
    title: 'Remember Allah',
    body: "Take a moment for dua — ask Allah to increase you in knowledge.",
    url: '/',
    suggestedTime: '20:00',
    suggestedFrequency: 'daily',
  },
  {
    key: 'points_nudge',
    label: 'Points nudge',
    title: 'Points are waiting!',
    body: "You haven't finished today's learning yet — open Kids Zone and earn points.",
    url: '/quiz',
    suggestedTime: '18:00',
    suggestedFrequency: 'daily',
  },
  {
    key: 'parent_share',
    label: 'Tell a parent',
    title: 'Show a parent your progress',
    body: 'Open your profile or leaderboard and share how much you have learned!',
    url: '/profile',
    suggestedTime: '19:00',
    suggestedFrequency: 'weekly',
    suggestedDay: 0,
  },
];

export const PUSH_REMINDER_PRESET_MAP: Record<
  string,
  { title: string; body: string; url: string }
> = Object.fromEntries(
  PUSH_REMINDER_PRESETS.map((p) => [p.key, { title: p.title, body: p.body, url: p.url }])
);

export function getPushReminderPreset(key: string): PushReminderPreset | undefined {
  return PUSH_REMINDER_PRESETS.find((p) => p.key === key);
}
