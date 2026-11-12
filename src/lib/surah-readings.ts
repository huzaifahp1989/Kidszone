import {
  getSurahCourseByNumber,
  type SurahCourseDifficulty,
  type SurahCourseQuizQuestion,
} from '@/lib/surah-courses';

/**
 * "Learn Surah with translation" — a reading-first section: the learner reads the
 * whole surah (Arabic + English) and only then unlocks the quiz. Surah metadata and
 * quiz questions are reused from the existing surah courses where they already exist,
 * so the two sections stay in sync and no content is duplicated.
 */
export type SurahReading = {
  slug: string;
  number: number;
  arabicName: string;
  englishName: string;
  emoji: string;
  ayahCount: number;
  revelation: 'Makki' | 'Madani';
  difficulty: SurahCourseDifficulty;
  theme: string;
  summary: string;
  quizQuestions: SurahCourseQuizQuestion[];
};

/** Surahs shown in this section, in display order. */
const READING_SURAH_NUMBERS = [36, 67, 18, 55, 56, 32, 31, 62];

/** Surahs that have no existing course, authored here. */
const EXTRA_READINGS: SurahReading[] = [
  {
    slug: 'as-sajdah',
    number: 32,
    arabicName: 'السجدة',
    englishName: 'As-Sajdah',
    emoji: '🤲',
    ayahCount: 30,
    revelation: 'Makki',
    difficulty: 'beginner',
    theme: 'Prostration, resurrection, and the reward of those who pray at night',
    summary:
      'As-Sajdah reminds us that the Quran is the truth from Allah, that we will be raised again, and that those who humble themselves before Him — praying at night and prostrating — will receive a reward no eye has seen and no ear has heard.',
    quizQuestions: [
      {
        id: 'sajdah-1',
        question: 'Why is this surah called As-Sajdah?',
        options: [
          'Because of the sajdah (prostration) it mentions',
          'Because it was revealed on a mountain',
          'Because it mentions a cave',
          'Because it is about the moon',
        ],
        correctAnswer: 0,
        explanation:
          'Ayah 15 describes the believers who fall down in prostration as soon as they hear the Quran.',
        reference: '32:15',
      },
      {
        id: 'sajdah-2',
        question: 'Which letters does Surah As-Sajdah begin with?',
        options: ['Alif Lam Mim', 'Ya Seen', 'Ha Mim', 'Qaf'],
        correctAnswer: 0,
        explanation: 'Like a few other surahs, As-Sajdah opens with the letters Alif Lam Mim.',
        reference: '32:1',
      },
      {
        id: 'sajdah-3',
        question: 'What has Allah prepared for the believers who pray at night?',
        options: [
          'A reward no eye has seen and no ear has heard',
          'A golden palace in this world',
          'A very long life',
          'A garden full of dates',
        ],
        correctAnswer: 0,
        explanation:
          'Their reward is kept hidden — it is far greater than anything we can imagine.',
        reference: '32:17',
      },
      {
        id: 'sajdah-4',
        question: 'What do the believers in this surah do at night?',
        options: [
          'They leave their beds to call upon their Lord',
          'They sleep the whole night',
          'They travel to the market',
          'They count their money',
        ],
        correctAnswer: 0,
        explanation:
          'They give up their sleep to pray and ask Allah, hoping for His reward and fearing Him.',
        reference: '32:16',
      },
      {
        id: 'sajdah-5',
        question: 'In which prayer did the Prophet ﷺ often recite Surah As-Sajdah on Fridays?',
        options: ['Fajr', 'Asr', 'Isha', 'Maghrib'],
        correctAnswer: 0,
        explanation:
          'The Prophet ﷺ used to recite As-Sajdah and Al-Insan in the Fajr prayer on Fridays.',
        reference: 'Sahih Muslim',
      },
    ],
  },
  {
    slug: 'luqman',
    number: 31,
    arabicName: 'لقمان',
    englishName: 'Luqman',
    emoji: '💡',
    ayahCount: 34,
    revelation: 'Makki',
    difficulty: 'beginner',
    theme: 'Wisdom, Tawhid, and good manners from Luqman the wise',
    summary:
      'Luqman was a wise man — not a prophet — whom Allah blessed with wisdom. The surah records his gentle advice to his son: worship Allah alone, be good to your parents, pray, do good, and be humble in how you walk and speak.',
    quizQuestions: [
      {
        id: 'luqman-1',
        question: 'Surah Luqman is named after…',
        options: ['A wise man blessed by Allah', 'A prophet', 'A king of Egypt', 'An angel'],
        correctAnswer: 0,
        explanation: 'Luqman was famous for his wisdom. The Quran says Allah gave him wisdom.',
        reference: '31:12',
      },
      {
        id: 'luqman-2',
        question: "What was Luqman's first advice to his son?",
        options: [
          'Do not join others with Allah in worship',
          'Do not eat too much',
          'Do not play outside',
          'Do not travel at night',
        ],
        correctAnswer: 0,
        explanation:
          'Ayah 13 says: "O my son, do not associate anything with Allah. Indeed, that is a great injustice."',
        reference: '31:13',
      },
      {
        id: 'luqman-3',
        question: 'Why does the Quran especially remind us of our mother?',
        options: [
          'Because she carried us with difficulty and fed us for two years',
          'Because she is older',
          'Because she owns the house',
          'Because she prays more',
        ],
        correctAnswer: 0,
        explanation: 'Allah reminds us of the hardship of pregnancy and of nursing her child.',
        reference: '31:14',
      },
      {
        id: 'luqman-4',
        question: 'How did Luqman tell his son to walk?',
        options: ['Modestly, without pride', 'Very fast', 'With loud steps', 'Only at night'],
        correctAnswer: 0,
        explanation: 'Allah does not like any proud boaster — so we walk modestly.',
        reference: '31:18',
      },
      {
        id: 'luqman-5',
        question: 'What did Luqman say about the voice?',
        options: [
          'Lower your voice — the ugliest sound is the braying of a donkey',
          'Shout as loud as you can',
          'Sing all day long',
          'Only whisper at night',
        ],
        correctAnswer: 0,
        explanation: 'Ayah 19 teaches us good manners in the way we speak.',
        reference: '31:19',
      },
    ],
  },
  {
    slug: 'al-jumuah',
    number: 62,
    arabicName: 'الجمعة',
    englishName: 'Al-Jumuah',
    emoji: '🕌',
    ayahCount: 11,
    revelation: 'Madani',
    difficulty: 'beginner',
    theme: 'The Friday prayer, prophethood, and acting on knowledge',
    summary:
      'Al-Jumuah is about Friday — the best day of the week. Allah tells the believers to leave their work and hurry to the Friday prayer when the call is made. It also reminds us that knowledge only helps us when we act on it.',
    quizQuestions: [
      {
        id: 'jumuah-1',
        question: 'Al-Jumuah is named after…',
        options: ['Friday', 'A mountain', 'A battle', 'A prophet'],
        correctAnswer: 0,
        explanation: 'Jumuah means Friday — the day Muslims gather for the weekly prayer.',
        reference: '62:9',
      },
      {
        id: 'jumuah-2',
        question: 'What should we do when the call to prayer is made on Friday?',
        options: [
          'Hurry to remember Allah and leave our trade',
          'Finish our shopping first',
          'Sleep until it is over',
          'Carry on working',
        ],
        correctAnswer: 0,
        explanation:
          'Ayah 9: when the call is made, we hasten to the remembrance of Allah and leave business behind.',
        reference: '62:9',
      },
      {
        id: 'jumuah-3',
        question:
          'What did Allah compare people who carry the Torah but do not act on it to?',
        options: [
          'A donkey carrying books',
          'A lion in a cage',
          'A bird with no wings',
          'A fish out of water',
        ],
        correctAnswer: 0,
        explanation: 'Knowledge is a blessing only when we act on it.',
        reference: '62:5',
      },
      {
        id: 'jumuah-4',
        question: 'How many ayahs does Surah Al-Jumuah have?',
        options: ['11', '5', '30', '110'],
        correctAnswer: 0,
        explanation: 'Al-Jumuah is a short Madani surah of 11 ayahs.',
        reference: '62:1-11',
      },
      {
        id: 'jumuah-5',
        question: 'Who did Allah send Prophet Muhammad ﷺ to?',
        options: [
          'The unlettered people, and others who had not yet joined them',
          'Only the rich',
          'Only the Quraysh',
          'Only the angels',
        ],
        correctAnswer: 0,
        explanation: 'Allah sent the Prophet ﷺ to teach the unlettered people and those after them.',
        reference: '62:2-3',
      },
    ],
  },
];

const EXTRA_READING_MAP = new Map(EXTRA_READINGS.map((reading) => [reading.number, reading]));

function readingFromCourse(number: number): SurahReading | null {
  const course = getSurahCourseByNumber(number);
  if (!course) return null;
  return {
    slug: course.slug,
    number: course.number,
    arabicName: course.arabicName,
    englishName: course.englishName,
    emoji: course.emoji,
    ayahCount: course.ayahCount,
    revelation: course.revelation,
    difficulty: course.difficulty,
    theme: course.theme,
    summary: course.summary,
    quizQuestions: course.quizQuestions,
  };
}

export const SURAH_READINGS: SurahReading[] = READING_SURAH_NUMBERS.map((number) => {
  const reading = readingFromCourse(number) ?? EXTRA_READING_MAP.get(number);
  if (!reading) throw new Error(`No reading data for surah ${number}`);
  return reading;
});

export function getSurahReadingBySlug(slug: string): SurahReading | undefined {
  return SURAH_READINGS.find((reading) => reading.slug === slug);
}

export function scoreSurahReadingQuiz(
  reading: SurahReading,
  answers: number[]
): { correct: number; total: number; percent: number; passed: boolean } {
  const total = reading.quizQuestions.length;
  let correct = 0;
  reading.quizQuestions.forEach((question, index) => {
    if (answers[index] === question.correctAnswer) correct += 1;
  });
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  return { correct, total, percent, passed: percent >= 80 };
}

export type SurahReadingProgress = Record<
  string,
  { completed: boolean; score: number; percent: number; completedAt: string }
>;

export function getSurahReadingProgressKey(userId: string) {
  return `surah-reading-progress-${userId}`;
}

export function readSurahReadingProgress(userId: string): SurahReadingProgress {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(getSurahReadingProgressKey(userId));
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writeSurahReadingProgress(userId: string, progress: SurahReadingProgress) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getSurahReadingProgressKey(userId), JSON.stringify(progress));
}
