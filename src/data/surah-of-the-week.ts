export type SurahOfTheWeekEntry = {
  weekStart: string;
  weekEnd: string;
  surahNumber: number;
  focus: string;
  badge: string;
  hint: string;
};

const ROTATION: Array<{
  surahNumber: number;
  focus: string;
  badge: string;
  hint: string;
}> = [
  {
    surahNumber: 1,
    focus: 'Understand Al-Fatihah as the core of every prayer.',
    badge: 'Fatihah Friend',
    hint: 'Read it in Fajr, Dhuhr, Asr, Maghrib, and Isha today!',
  },
  {
    surahNumber: 112,
    focus: 'Memorize the meaning of pure Tawhid in Surah Al-Ikhlas.',
    badge: 'Ikhlas Star',
    hint: 'Read 10x in the morning and 10x before sleeping.',
  },
  {
    surahNumber: 113,
    focus: 'Learn Surah Al-Falaq for protection from envy and evil.',
    badge: 'Fortress Hero',
    hint: 'Say it three times after every fard prayer.',
  },
  {
    surahNumber: 114,
    focus: 'Learn Surah An-Nas to seek refuge in Allah from whispers.',
    badge: 'Refuge Seeker',
    hint: 'Say it before sleeping to feel safe with Allah.',
  },
  {
    surahNumber: 108,
    focus: 'Learn that Allah gave you abundant good — be grateful.',
    badge: 'Kawthar Lover',
    hint: 'Say Alhamdulillah 100 times this week.',
  },
  {
    surahNumber: 107,
    focus: 'Small kindnesses matter — the story of Al-Ma’un.',
    badge: 'Ma’un Helper',
    hint: 'Give a cup of water, share food, or help your parents.',
  },
  {
    surahNumber: 103,
    focus: 'Time is gold — don’t waste it (Surah Al-Asr).',
    badge: 'Time Keeper',
    hint: 'Make a small daily schedule and stick to it.',
  },
  {
    surahNumber: 97,
    focus: 'Search for Laylatul-Qadr through worship and Quran.',
    badge: 'Qadr Night',
    hint: 'Read Al-Ikhlas 10x with a big smile tonight.',
  },
  {
    surahNumber: 95,
    focus: 'Allah swears by the fig and olive — He made you in the best form.',
    badge: 'Tin Blossom',
    hint: 'Say “SubhanAllah, Alhamdulillah, Allahu Akbar” 33x.',
  },
  {
    surahNumber: 94,
    focus: '"With hardship comes ease" — two promises from Allah.',
    badge: 'Ease Seeker',
    hint: 'When you feel worried, read Surah Ash-Sharh 7x.',
  },
  {
    surahNumber: 93,
    focus: 'Allah never abandons us — a hug for your heart.',
    badge: 'Duha Smile',
    hint: 'Make dua for a friend or your parents right now.',
  },
  {
    surahNumber: 102,
    focus: 'Stop rushing after this world — remember Akhirah.',
    badge: 'Takathur Steady',
    hint: 'Say Bismillah before homework, play, and eating.',
  },
  {
    surahNumber: 110,
    focus: 'Celebrate Allah’s help and say “SubhanAllah!”',
    badge: 'Nasr Victor',
    hint: 'Thank Allah every time you finish a prayer.',
  },
  {
    surahNumber: 67,
    focus: 'Surah Al-Mulk protects you from punishment in the grave.',
    badge: 'Mulk Guardian',
    hint: 'Try one page before bed every night this week.',
  },
  {
    surahNumber: 36,
    focus: 'Heart of the Quran — meet Surah Yaseen.',
    badge: 'Yaseen Friend',
    hint: 'Listen once with your family after Fajr.',
  },
  {
    surahNumber: 18,
    focus: 'The cave story — trust Allah and keep your akhlaq.',
    badge: 'Kahf Explorer',
    hint: 'Read Al-Kahf on Friday or listen to it with snacks.',
  },
];

export function startOfWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const dow = d.getUTCDay(); // 0 = Sunday
  // Week starts Monday
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

export function endOfWeek(date: Date = new Date()): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

export function isoDate(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function getSurahOfTheWeek(date: Date = new Date()): SurahOfTheWeekEntry {
  const start = startOfWeek(date);
  const end = endOfWeek(date);
  const base = new Date(Date.UTC(2026, 0, 5)); // Monday 2026-01-05
  const diffDays = Math.floor((start.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
  const weekIndex = Math.floor(diffDays / 7);
  const safeIndex = ((weekIndex % ROTATION.length) + ROTATION.length) % ROTATION.length;
  const choice = ROTATION[safeIndex];
  return {
    weekStart: isoDate(start),
    weekEnd: isoDate(end),
    surahNumber: choice.surahNumber,
    focus: choice.focus,
    badge: choice.badge,
    hint: choice.hint,
  };
}
