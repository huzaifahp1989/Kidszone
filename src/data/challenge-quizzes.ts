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
    id: 'qs-nuh-950',
    prompt: 'Which Prophet called his people to Allah for 950 years before the great flood?',
    answer: 'Nuh',
    acceptedAnswers: ['Nooh', 'Noah', 'Prophet Nuh'],
    explanation:
      'Allah says Prophet Nuh (AS) stayed among his people for a thousand years less fifty — 950 years (Surah Al-Ankabut 29:14).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'qs-ibrahim-birds',
    prompt:
      'Which Prophet asked Allah to show him how He brings the dead back to life, and was told to take four birds?',
    answer: 'Ibrahim',
    acceptedAnswers: ['Ibraheem', 'Abraham', 'Prophet Ibrahim'],
    explanation:
      'Prophet Ibrahim (AS) asked to see how the dead are given life; Allah told him to take four birds (Surah Al-Baqarah 2:260).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'qs-yusuf-dream',
    prompt:
      "Which Prophet explained the king of Egypt's dream of seven fat cows eaten by seven thin cows?",
    answer: 'Yusuf',
    acceptedAnswers: ['Yousuf', 'Yussef', 'Joseph', 'Prophet Yusuf'],
    explanation:
      'Prophet Yusuf (AS) interpreted the dream as seven years of plenty followed by seven years of hardship (Surah Yusuf 12:43-49).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'qs-musa-signs',
    prompt: 'Which Prophet was sent to Firaun (Pharaoh) with nine clear signs from Allah?',
    answer: 'Musa',
    acceptedAnswers: ['Moosa', 'Moses', 'Prophet Musa'],
    explanation:
      'Allah gave Prophet Musa (AS) nine clear signs to take to Firaun (Surah Al-Isra 17:101).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'qs-yunus-city',
    prompt:
      "Prophet Yunus was sent to a city whose people finally believed and were saved from punishment. What was the Prophet's name?",
    answer: 'Yunus',
    acceptedAnswers: ['Yoonus', 'Jonah', 'Dhun-Nun', 'Prophet Yunus'],
    explanation:
      'The people of Yunus (AS) — the people of Nineveh — believed, so Allah removed the punishment from them (Surah Yunus 10:98).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'qs-sulayman-throne',
    prompt: 'Which Prophet had the throne of the Queen of Sheba (Bilqis) brought to him in the blink of an eye?',
    answer: 'Sulayman',
    acceptedAnswers: ['Sulaiman', 'Suleiman', 'Solomon', 'Prophet Sulayman'],
    explanation:
      'By Allah’s power, one who had knowledge of the Book brought the Queen’s throne to Prophet Sulayman (AS) in an instant (Surah An-Naml 27:38-40).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'qs-dawud-iron',
    prompt: 'Which Prophet did Allah teach to make coats of armour by softening iron for him?',
    answer: 'Dawud',
    acceptedAnswers: ['Dawood', 'Daud', 'David', 'Prophet Dawud'],
    explanation:
      'Allah softened iron for Prophet Dawud (AS) and taught him to make armour (Surah Al-Anbiya 21:80; Surah Saba 34:10-11).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'qs-isa-injeel',
    prompt:
      'Which Prophet was given the Injeel (Gospel) and, by Allah’s permission, healed the blind and the lepers?',
    answer: 'Isa',
    acceptedAnswers: ['Eesa', 'Jesus', 'Prophet Isa'],
    explanation:
      'Prophet Isa (AS) was given the Injeel and, by Allah’s leave, healed the blind and lepers and gave life to the dead (Surah Aal-e-Imran 3:49).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'qs-ayyub',
    prompt:
      'Which Prophet is the great example of patience (sabr), who stayed thankful to Allah through years of illness and loss?',
    answer: 'Ayyub',
    acceptedAnswers: ['Ayoub', 'Ayub', 'Job', 'Prophet Ayyub'],
    explanation:
      'Prophet Ayyub (AS) was patient through severe trials, and Allah restored his health and family (Surah Al-Anbiya 21:83-84; Surah Sad 38:41-44).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'qs-hijrah',
    prompt: 'What is the name of Prophet Muhammad ﷺ’s migration from Makkah to Madinah?',
    answer: 'Hijrah',
    acceptedAnswers: ['Hijra', 'Hejira', 'Hijrat', 'The Hijrah'],
    explanation:
      'The Hijrah was the Prophet ﷺ’s migration from Makkah to Madinah; it marks the start of the Islamic calendar.',
    isBonus: false,
    points: 1,
  },
  {
    id: 'qs-bonus-khidr',
    prompt:
      'BONUS: What is the name of the wise servant of Allah whom Prophet Musa travelled with to learn hidden knowledge?',
    answer: 'Khidr',
    acceptedAnswers: ['Al-Khidr', 'Khizr', 'Khadir', 'Khidhr', 'Al Khidr'],
    explanation:
      'Prophet Musa (AS) travelled to learn from Al-Khidr, a servant given special knowledge by Allah (Surah Al-Kahf 18:65-82).',
    isBonus: true,
    points: 2,
  },
];

const FIQH_QUESTIONS: ChallengeQuestion[] = [
  {
    id: 'fq-rakahs-total',
    prompt: 'How many fard (obligatory) rak’ahs are prayed in total across the five daily prayers?',
    answer: '17',
    acceptedAnswers: ['seventeen', '17 rakahs', '17 rakats'],
    explanation:
      'Fajr 2 + Dhuhr 4 + Asr 4 + Maghrib 3 + Isha 4 = 17 fard rak’ahs each day.',
    isBonus: false,
    points: 1,
  },
  {
    id: 'fq-wudu-fard',
    prompt: 'How many obligatory (fard) acts of wudu are mentioned in the Quran (Surah Al-Maidah 5:6)?',
    answer: '4',
    acceptedAnswers: ['four', '4 acts', 'four acts'],
    explanation:
      'The Quran mentions four: washing the face, washing the arms to the elbows, wiping the head, and washing the feet (Surah Al-Maidah 5:6).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'fq-tayammum-earth',
    prompt: 'What clean, natural thing is used to perform Tayammum when there is no water?',
    answer: 'Earth',
    acceptedAnswers: ['Dust', 'Clean earth', 'Sand', 'Soil', 'Dirt', 'Clean dust'],
    explanation:
      'Tayammum is made with clean earth/dust when water is not available or would cause harm (Surah Al-Maidah 5:6).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'fq-nisab',
    prompt: 'What is the minimum amount of wealth a Muslim must own before Zakat becomes obligatory called?',
    answer: 'Nisab',
    acceptedAnswers: ['Nisaab', 'Nisab threshold', 'Niscab'],
    explanation:
      'The Nisab is the minimum threshold of wealth (held for a lunar year) that makes Zakat due.',
    isBonus: false,
    points: 1,
  },
  {
    id: 'fq-niyyah',
    prompt: 'What is the Arabic word for the intention a Muslim makes in the heart before fasting or Salah?',
    answer: 'Niyyah',
    acceptedAnswers: ['Niyah', 'Niyat', 'Niyyat', 'Intention', 'Niyyah intention'],
    explanation:
      'The Prophet ﷺ said, “Actions are but by intentions (niyyah)” (Sahih al-Bukhari 1).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'fq-eid-adha',
    prompt: 'What is the name of the Eid celebrated during Hajj, when Muslims sacrifice an animal?',
    answer: 'Eid al-Adha',
    acceptedAnswers: ['Eid ul Adha', 'Eid ul-Adha', 'Eidul Adha', 'Eid Adha', 'Bakra Eid', 'Qurbani Eid'],
    explanation:
      'Eid al-Adha, the festival of sacrifice, remembers Prophet Ibrahim’s (AS) willingness to obey Allah (Surah As-Saffat 37:102-107).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'fq-ghusl',
    prompt: 'What is the full-body ritual washing (bath) that restores purity after major impurity called?',
    answer: 'Ghusl',
    acceptedAnswers: ['Gusl', 'Ghusul', 'Ghusal', 'Ritual bath'],
    explanation:
      'Ghusl is the complete washing of the body required for full purity (Surah Al-Maidah 5:6).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'fq-iqamah',
    prompt: 'What is the second, shorter call said just before the congregation stands to begin Salah called?',
    answer: 'Iqamah',
    acceptedAnswers: ['Iqama', 'Iqaamah', 'Iqamat', 'Iqaama'],
    explanation:
      'The Iqamah is the second call, announced immediately before the fard prayer begins in congregation.',
    isBonus: false,
    points: 1,
  },
  {
    id: 'fq-qibla',
    prompt: 'What is the name of the direction (towards the Kaaba) that Muslims face during Salah?',
    answer: 'Qibla',
    acceptedAnswers: ['Qiblah', 'Kaaba direction', 'Qiblah direction'],
    explanation:
      'Allah commanded the believers to turn their faces towards the Sacred Mosque (the Kaaba) — the Qibla (Surah Al-Baqarah 2:144).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'fq-akhlaq',
    prompt:
      'What is the Arabic word for good character and manners, which the Prophet ﷺ was sent to perfect?',
    answer: 'Akhlaq',
    acceptedAnswers: ['Akhlaaq', 'Ikhlaq', 'Good manners', 'Good character', 'Akhlaq'],
    explanation:
      'The Prophet ﷺ said, “I was sent to perfect good character (akhlaq)” (Al-Adab Al-Mufrad 273).',
    isBonus: false,
    points: 1,
  },
  {
    id: 'fq-bonus-laylatul-qadr',
    prompt:
      'BONUS: What is the special night in the last ten days of Ramadan that is better than a thousand months called?',
    answer: 'Laylatul Qadr',
    acceptedAnswers: [
      'Laylat al-Qadr',
      'Lailatul Qadr',
      'Laylatul Qadar',
      'Night of Power',
      'Night of Decree',
      'Qadr',
    ],
    explanation:
      'Laylatul Qadr (the Night of Power) is better than a thousand months (Surah Al-Qadr 97:3).',
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
      'Ten challenging questions about the Prophets and their stories in the Quran. Type your answers — earn a certificate for 9/10 or more!',
    passScore: 9,
    awardsBadge: true,
    questions: QURAN_STORIES_QUESTIONS,
  },
  fiqh: {
    key: 'fiqh',
    title: 'Fiqh Quiz',
    emoji: '🕌',
    description:
      'Ten challenging questions about how we practise Islam — Salah, Wudu, Tayammum, Zakat, fasting, Eid, purity, the adhan and good manners.',
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
