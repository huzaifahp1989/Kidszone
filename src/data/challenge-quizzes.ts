export type ChallengeQuizKey = 'quran-stories' | 'fiqh';

export interface ChallengeQuestion {
  /** Stable id used for storage and scoring. */
  id: string;
  /** The question shown to the child. */
  prompt: string;
  /** The canonical correct answer (shown after completion). */
  answer: string;
  /**
   * Extra accepted spellings / variations. The canonical `answer` is always
   * accepted too. Minor typing mistakes are tolerated by the fuzzy matcher.
   */
  acceptedAnswers: string[];
  /** Short kid-friendly explanation + source shown after completion. */
  explanation: string;
  /** Bonus questions are worth extra points and do not count toward the main score. */
  isBonus: boolean;
  /** Points this question is worth (bonus questions are usually worth more). */
  points: number;
}

export interface ChallengeQuizConfig {
  key: ChallengeQuizKey;
  title: string;
  emoji: string;
  description: string;
  /** Number of correct main answers needed to earn the badge/certificate. */
  passScore: number;
  /** Whether a badge/certificate is offered for this quiz. */
  awardsBadge: boolean;
  questions: ChallengeQuestion[];
}

/** Total time allowed for a quiz, in seconds (20 minutes). */
export const CHALLENGE_TIMER_SECONDS = 20 * 60;

const QURAN_STORIES_QUESTIONS: ChallengeQuestion[] = [
  {
    id: 'qs-adam',
    prompt: 'Which Prophet was the very first human being that Allah created?',
    answer: 'Adam',
    acceptedAnswers: ['Aadam', 'Prophet Adam', 'Adam alayhis salam'],
    explanation:
      'Prophet Adam (AS) was the first human and the first Prophet. Allah created him and taught him the names of all things (Surah Al-Baqarah 2:31).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'qs-nuh',
    prompt: 'Which Prophet built a large ship (ark) so the believers would be safe from the great flood?',
    answer: 'Nuh',
    acceptedAnswers: ['Nooh', 'Noah', 'Prophet Nuh'],
    explanation:
      'Prophet Nuh (AS) built the ark by Allah’s command and called his people for many years (Surah Hud 11:36-48).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'qs-ibrahim',
    prompt: 'Which Prophet was thrown into a huge fire, but Allah made the fire cool and safe for him?',
    answer: 'Ibrahim',
    acceptedAnswers: ['Ibraheem', 'Abraham', 'Prophet Ibrahim'],
    explanation:
      'Allah commanded the fire, “Be cool and safe for Ibrahim,” and it did not harm him (Surah Al-Anbiya 21:69).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'qs-yusuf',
    prompt: 'Which Prophet was put into a well by his brothers and later became a trusted minister in Egypt?',
    answer: 'Yusuf',
    acceptedAnswers: ['Yousuf', 'Yussef', 'Joseph', 'Prophet Yusuf'],
    explanation:
      'Prophet Yusuf (AS) was patient through hardship and Allah raised him to a position of honour in Egypt (Surah Yusuf 12).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'qs-musa',
    prompt: 'Which Prophet did Allah speak to directly, and was given a staff that turned into a snake?',
    answer: 'Musa',
    acceptedAnswers: ['Moosa', 'Moses', 'Prophet Musa'],
    explanation:
      'Prophet Musa (AS) spoke with Allah and was given clear miracles to show Firaun (Surah Ta-Ha 20:17-22).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'qs-yunus',
    prompt: 'Which Prophet was swallowed by a big fish and made dua to Allah from inside it?',
    answer: 'Yunus',
    acceptedAnswers: ['Yoonus', 'Jonah', 'Dhun-Nun', 'Prophet Yunus'],
    explanation:
      'Prophet Yunus (AS) called out, “There is no god but You, glory be to You, I have been of the wrongdoers,” and Allah saved him (Surah Al-Anbiya 21:87).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'qs-sulayman',
    prompt: 'Which Prophet could understand the speech of birds and animals and ruled a mighty kingdom?',
    answer: 'Sulayman',
    acceptedAnswers: ['Sulaiman', 'Suleiman', 'Solomon', 'Prophet Sulayman'],
    explanation:
      'Prophet Sulayman (AS) was taught the language of the birds and given a great kingdom (Surah An-Naml 27:16).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'qs-dawud',
    prompt: 'Which Prophet was given the Zabur (Psalms) and defeated the giant Jalut (Goliath)?',
    answer: 'Dawud',
    acceptedAnswers: ['Dawood', 'Daud', 'David', 'Prophet Dawud'],
    explanation:
      'Prophet Dawud (AS) was given the Zabur and, by Allah’s help, defeated Jalut (Surah Al-Baqarah 2:251).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'qs-isa',
    prompt: 'Which Prophet was born miraculously to Maryam and spoke as a baby in the cradle?',
    answer: 'Isa',
    acceptedAnswers: ['Eesa', 'Jesus', 'Prophet Isa'],
    explanation:
      'Prophet Isa (AS) spoke as an infant to defend his mother Maryam (Surah Maryam 19:30).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'qs-muhammad',
    prompt: 'Who is the last and final Messenger of Allah, to whom the Quran was revealed?',
    answer: 'Muhammad',
    acceptedAnswers: ['Muhammed', 'Mohammed', 'Mohammad', 'Prophet Muhammad'],
    explanation:
      'Prophet Muhammad ﷺ is the final Messenger (the Seal of the Prophets) and the Quran was revealed to him (Surah Al-Ahzab 33:40).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'qs-bonus-hira',
    prompt: 'BONUS: In which cave did Angel Jibreel first bring revelation to Prophet Muhammad ﷺ?',
    answer: 'Hira',
    acceptedAnswers: ['Cave of Hira', 'Ghar Hira', 'Hiraa', 'Mount Hira'],
    explanation:
      'The first revelation came in the Cave of Hira, where the Prophet ﷺ used to worship Allah (Sahih al-Bukhari 3).',
    isBonus: true,
    points: 2,
  },
];

const FIQH_QUESTIONS: ChallengeQuestion[] = [
  {
    id: 'fq-salah-count',
    prompt: 'How many fard (obligatory) Salah does a Muslim pray every day?',
    answer: '5',
    acceptedAnswers: ['five', '5 times', 'five times'],
    explanation:
      'Muslims pray five obligatory prayers each day and night: Fajr, Dhuhr, Asr, Maghrib and Isha (Sahih al-Bukhari 8).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'fq-wudu',
    prompt: 'What is the washing we do with water to become pure before Salah called?',
    answer: 'Wudu',
    acceptedAnswers: ['Wudhu', 'Wuzu', 'Ablution', 'Wudoo'],
    explanation:
      'Wudu is washing the face, arms, wiping the head and washing the feet before Salah (Surah Al-Maidah 5:6).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'fq-tayammum',
    prompt: 'When there is no water, what dry purification using clean earth can a Muslim make instead of wudu?',
    answer: 'Tayammum',
    acceptedAnswers: ['Tayammom', 'Tayamum', 'Tayammm', 'Dry ablution'],
    explanation:
      'Tayammum uses clean earth/dust when water is unavailable or harmful (Surah Al-Maidah 5:6).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'fq-zakat',
    prompt: 'What is the yearly charity Muslims give from their wealth to help the poor called?',
    answer: 'Zakat',
    acceptedAnswers: ['Zakah', 'Zakaat', 'Zakât'],
    explanation:
      'Zakat is one of the five pillars of Islam — a set share of wealth given to those in need (Surah Al-Baqarah 2:43).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'fq-ramadan',
    prompt: 'In which month do Muslims fast from dawn (Fajr) until sunset (Maghrib)?',
    answer: 'Ramadan',
    acceptedAnswers: ['Ramadhan', 'Ramzan', 'Ramadaan', 'Ramadhaan'],
    explanation:
      'Fasting the month of Ramadan is obligatory and the Quran was first revealed in it (Surah Al-Baqarah 2:185).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'fq-suhoor',
    prompt: 'What is the blessed meal eaten before dawn to begin the fast called?',
    answer: 'Suhoor',
    acceptedAnswers: ['Sehri', 'Sahur', 'Suhur', 'Sehree'],
    explanation:
      'The Prophet ﷺ said, “Eat Suhoor, for there is a blessing in it” (Sahih al-Bukhari 1923).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'fq-eid',
    prompt: 'What is the name of the festival Muslims celebrate at the end of Ramadan?',
    answer: 'Eid al-Fitr',
    acceptedAnswers: ['Eid ul Fitr', 'Eid ul-Fitr', 'Eidul Fitr', 'Eid Fitr', 'Eid'],
    explanation:
      'Eid al-Fitr is the celebration of thankfulness after completing the fasts of Ramadan.',
    isBonus: false,
    points: 1,
  },
  {
    id: 'fq-taharah',
    prompt: 'What is the Islamic word for purity and cleanliness (staying clean in body, clothes and place)?',
    answer: 'Taharah',
    acceptedAnswers: ['Tahara', 'Tahaarah', 'Purity', 'Purification', 'Cleanliness'],
    explanation:
      'The Prophet ﷺ said, “Purity is half of faith” (Sahih Muslim 223). Taharah includes wudu, ghusl and keeping clean.',
    isBonus: false,
    points: 1,
  },
  {
    id: 'fq-adhan',
    prompt: 'What is the beautiful call that tells Muslims it is time for Salah called?',
    answer: 'Adhan',
    acceptedAnswers: ['Azan', 'Adhaan', 'Athan', 'Azaan'],
    explanation:
      'The Adhan is the call to prayer, called out before each of the five daily prayers.',
    isBonus: false,
    points: 1,
  },
  {
    id: 'fq-right-hand',
    prompt: 'Following the Sunnah, which hand should we use to eat and drink?',
    answer: 'Right',
    acceptedAnswers: ['Right hand', 'the right', 'right hand side', 'righthand'],
    explanation:
      'The Prophet ﷺ said, “When one of you eats, let him eat with his right hand” (Sahih Muslim 2020).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'fq-bonus-wudu-times',
    prompt: 'BONUS: How many times do we usually wash each part (like the face and arms) in wudu?',
    answer: '3',
    acceptedAnswers: ['three', 'thrice', '3 times', 'three times'],
    explanation:
      'The Sunnah is to wash the parts of wudu three times each (Sahih al-Bukhari 159).',
    isBonus: true,
    points: 2,
  },
];

export const CHALLENGE_QUIZZES: Record<ChallengeQuizKey, ChallengeQuizConfig> = {
  'quran-stories': {
    key: 'quran-stories',
    title: 'Quran Stories Quiz',
    emoji: '📖',
    description:
      'Ten questions about the beautiful stories of the Prophets in the Quran. Type your answers — earn a certificate for 9/10 or more!',
    passScore: 9,
    awardsBadge: true,
    questions: QURAN_STORIES_QUESTIONS,
  },
  fiqh: {
    key: 'fiqh',
    title: 'Fiqh Quiz',
    emoji: '🕌',
    description:
      'Ten questions about how we practise Islam — Salah, Wudu, Zakat, fasting, Eid, cleanliness and good manners.',
    passScore: 9,
    awardsBadge: false,
    questions: FIQH_QUESTIONS,
  },
};

export const CHALLENGE_QUIZ_KEYS: ChallengeQuizKey[] = ['quran-stories', 'fiqh'];

export function isChallengeQuizKey(value: unknown): value is ChallengeQuizKey {
  return value === 'quran-stories' || value === 'fiqh';
}

export function getChallengeQuizConfig(key: string): ChallengeQuizConfig | null {
  return isChallengeQuizKey(key) ? CHALLENGE_QUIZZES[key] : null;
}
