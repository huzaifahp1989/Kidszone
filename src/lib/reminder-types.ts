/**
 * User-configurable reminder types.
 * Default prayer times are sensible UK defaults; parents can adjust per family.
 */

export type ReminderKey =
  | 'dailyQuiz'
  | 'salahTracker'
  | 'keepStreak'
  | 'dailyActivities'
  | 'fajr'
  | 'dhuhr'
  | 'asr'
  | 'maghrib'
  | 'isha'
  | 'customAlarm';

export type ReminderEntry = {
  enabled: boolean;
  /** HH:MM (24h) local time */
  time: string;
};

export type UserReminderSettings = Partial<Record<ReminderKey, ReminderEntry>>;

export type UserReminderLastSent = Partial<Record<ReminderKey, string>>;

export const DEFAULT_REMINDER_TIME: Record<ReminderKey, string> = {
  dailyQuiz: '16:00',
  salahTracker: '12:30',
  keepStreak: '19:00',
  dailyActivities: '15:00',
  fajr: '05:30',
  dhuhr: '13:00',
  asr: '16:30',
  maghrib: '18:30',
  isha: '20:30',
  customAlarm: '07:00',
};

export const REMINDER_META: Record<
  ReminderKey,
  {
    label: string;
    emoji: string;
    category: 'activities' | 'prayer' | 'custom';
    body: string;
    url: string;
  }
> = {
  dailyQuiz: {
    label: 'Daily Quiz',
    emoji: '🧠',
    category: 'activities',
    body: 'Time for your daily Islamic quiz — earn points!',
    url: '/quiz',
  },
  salahTracker: {
    label: 'Salah Tracker',
    emoji: '🕌',
    category: 'activities',
    body: "Don't forget to log your prayers today.",
    url: '/salah',
  },
  keepStreak: {
    label: 'Keep Streak',
    emoji: '🔥',
    category: 'activities',
    body: 'Learn something new today to keep your streak going!',
    url: '/',
  },
  dailyActivities: {
    label: 'Daily Activities',
    emoji: '⭐',
    category: 'activities',
    body: "Check out today's activities and earn points.",
    url: '/activities-menu',
  },
  fajr: {
    label: 'Fajr Adhan',
    emoji: '🌅',
    category: 'prayer',
    body: 'Fajr time — start the day with prayer.',
    url: '/salah',
  },
  dhuhr: {
    label: 'Dhuhr Adhan',
    emoji: '☀️',
    category: 'prayer',
    body: 'Dhuhr time — take a break for prayer.',
    url: '/salah',
  },
  asr: {
    label: 'Asr Adhan',
    emoji: '🌤️',
    category: 'prayer',
    body: 'Asr time — pause and pray.',
    url: '/salah',
  },
  maghrib: {
    label: 'Maghrib Adhan',
    emoji: '🌇',
    category: 'prayer',
    body: 'Maghrib time — pray as the day ends.',
    url: '/salah',
  },
  isha: {
    label: 'Isha Adhan',
    emoji: '🌙',
    category: 'prayer',
    body: 'Isha time — end the day with prayer.',
    url: '/salah',
  },
  customAlarm: {
    label: 'My Alarm',
    emoji: '⏰',
    category: 'custom',
    body: 'Your custom reminder from Kids Zone.',
    url: '/',
  },
};

export const ACTIVITY_REMINDERS: ReminderKey[] = [
  'dailyQuiz',
  'salahTracker',
  'keepStreak',
  'dailyActivities',
];

export const PRAYER_REMINDERS: ReminderKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export const ALL_REMINDER_KEYS: ReminderKey[] = [
  ...ACTIVITY_REMINDERS,
  ...PRAYER_REMINDERS,
  'customAlarm',
];

export function normalizeReminderTime(value: string): string {
  const m = String(value || '').trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!m) return '08:00';
  const hh = m[1].padStart(2, '0');
  const mm = m[2].padStart(2, '0');
  return `${hh}:${mm}`;
}

export function buildDefaultReminderSettings(): UserReminderSettings {
  const settings: UserReminderSettings = {};
  for (const key of ALL_REMINDER_KEYS) {
    settings[key] = {
      enabled: ['dailyQuiz', 'salahTracker'].includes(key),
      time: DEFAULT_REMINDER_TIME[key],
    };
  }
  return settings;
}

export function mergeReminderSettings(saved?: UserReminderSettings | null): UserReminderSettings {
  const defaults = buildDefaultReminderSettings();
  const merged: UserReminderSettings = {};
  for (const key of ALL_REMINDER_KEYS) {
    const savedEntry = saved?.[key];
    merged[key] = {
      enabled: savedEntry?.enabled ?? defaults[key]!.enabled,
      time: normalizeReminderTime(savedEntry?.time ?? defaults[key]!.time),
    };
  }
  return merged;
}

export function isValidTime(value: string): boolean {
  return /^([01]?\d|2[0-3]):([0-5]\d)$/.test(String(value || '').trim());
}
