// Centralized data pools and helpers for Islamic educational games.
// All content is randomized at runtime by the games page.

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Option {
  id: string;
  text: string;
  correct?: boolean;
}

export interface BaseTask {
  id: string;
  prompt: string;
  options: Option[];
  correctOptionId: string;
  points: number;
  meta?: Record<string, any>;
}

export interface WordSearchConfig {
  wordPool: string[];
  count: number;
  minSize: number;
  maxSize: number;
  followUp?: BaseTask[];
  conceptual?: {
    choices: BaseTask[];
  };
}

type WordPlacement = {
  word: string;
  start: [number, number];
  end: [number, number];
  reversed: boolean;
  diagonal: boolean;
};

export type WordSearchData = {
  grid: string[][];
  placements: WordPlacement[];
  targets: string[];
};

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const shuffle = <T,>(arr: T[]) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const orientations: Array<[number, number]> = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

export const placeWordsOnGrid = (
  config: WordSearchConfig,
  difficulty: Difficulty,
): WordSearchData => {
  const settings = {
    easy: { size: 8, directions: [[0, 1], [1, 0]], allowReverse: false, count: 5 },
    medium: { size: 10, directions: [[0, 1], [1, 0], [1, 1], [-1, 1]], allowReverse: false, count: 8 },
    hard: { size: 12, directions: orientations, allowReverse: true, count: 12 },
  };

  const { size, directions, allowReverse, count } = settings[difficulty];
  const gridSize = size;
  const grid = Array.from({ length: gridSize }, () => Array.from({ length: gridSize }, () => ''));
  const placements: WordPlacement[] = [];

  const tryPlace = (word: string) => {
    const reversed = allowReverse && Math.random() > 0.5;
    const letters = reversed ? [...word].reverse() : [...word];
    const availableDirs = shuffle(directions);
    for (const dir of availableDirs) {
      for (let attempt = 0; attempt < 50; attempt += 1) {
        const row = randomInt(0, gridSize - 1);
        const col = randomInt(0, gridSize - 1);
        const endRow = row + dir[0] * (letters.length - 1);
        const endCol = col + dir[1] * (letters.length - 1);
        if (endRow < 0 || endRow >= gridSize || endCol < 0 || endCol >= gridSize) continue;
        let collision = false;
        for (let i = 0; i < letters.length; i += 1) {
          const r = row + dir[0] * i;
          const c = col + dir[1] * i;
          const cell = grid[r][c];
          if (cell && cell !== letters[i]) {
            collision = true;
            break;
          }
        }
        if (!collision) {
          for (let i = 0; i < letters.length; i += 1) {
            const r = row + dir[0] * i;
            const c = col + dir[1] * i;
            grid[r][c] = letters[i];
          }
          placements.push({
            word,
            start: [row, col],
            end: [endRow, endCol],
            reversed,
            diagonal: dir[0] !== 0 && dir[1] !== 0,
          });
          return true;
        }
      }
    }
    return false;
  };

  const targets = shuffle(config.wordPool).slice(0, count);
  targets.forEach(w => tryPlace(w));
  for (let r = 0; r < gridSize; r += 1) {
    for (let c = 0; c < gridSize; c += 1) {
      if (!grid[r][c]) {
        grid[r][c] = String.fromCharCode(65 + randomInt(0, 25));
      }
    }
  }
  return { grid, placements, targets };
};

export interface HangmanWord {
  word: string;
  hint: string;
}

export interface HangmanConfig {
  topics: {
    [key: string]: HangmanWord[];
  };
}

export const hangmanTopics: HangmanConfig = {
  topics: {
    'Prophets': [
      { word: 'ADAM', hint: 'The first man and prophet.' },
      { word: 'NUH', hint: 'Built the Ark to save believers.' },
      { word: 'IBRAHIM', hint: 'Built the Kaaba with his son.' },
      { word: 'ISMAIL', hint: 'Son of Ibrahim, associated with Zamzam.' },
      { word: 'YUSUF', hint: 'Prophet known for his beauty and dream interpretation.' },
      { word: 'MUSA', hint: 'Spoke to Allah and parted the sea.' },
      { word: 'DAWOOD', hint: 'Given the Zabur and defeated Jalut.' },
      { word: 'SULAYMAN', hint: 'Could speak to animals and control jinn.' },
      { word: 'YUNUS', hint: 'Swallowed by a giant whale.' },
      { word: 'ISA', hint: 'Miraculously born without a father.' },
      { word: 'MUHAMMAD', hint: 'The Seal of Prophets and Messenger of Mercy.' },
    ],
    'Pillars of Islam': [
      { word: 'SHAHADA', hint: 'The declaration of faith.' },
      { word: 'SALAH', hint: 'The five daily prayers.' },
      { word: 'ZAKAT', hint: 'Giving charity to the poor.' },
      { word: 'SAWM', hint: 'Fasting during the month of Ramadan.' },
    ],
    'Quran': [
      { word: 'FATIHA', hint: 'The opening chapter of the Quran.' },
      { word: 'BAQARAH', hint: 'The longest surah in the Quran.' },
      { word: 'IKHLAS', hint: 'Surah describing the Oneness of Allah.' },
      { word: 'YASEEN', hint: 'Often called the heart of the Quran.' },
      { word: 'REHMAN', hint: 'Surah known as the Bride of the Quran.' },
      { word: 'AYATULKURSI', hint: 'The Verse of the Throne.' },
    ],
    'Places': [
      { word: 'MAKKAH', hint: 'Birthplace of the Prophet (PBUH).' },
      { word: 'MADINAH', hint: 'City where the Prophet (PBUH) migrated to.' },
      { word: 'JERUSALEM', hint: 'Location of Masjid Al-Aqsa.' },
      { word: 'CAVEHIRA', hint: 'Where the first revelation was received.' },
    ],
    'Values': [
      { word: 'SABR', hint: 'Patience and perseverance.' },
      { word: 'SHUKR', hint: 'Gratitude to Allah.' },
      { word: 'TAQWA', hint: 'Consciousness and fear of Allah.' },
      { word: 'IKHLAS', hint: 'Sincerity in actions.' },
      { word: 'ADAB', hint: 'Good manners and etiquette.' },
      { word: 'AMANAH', hint: 'Trustworthiness and honesty.' },
    ],
    'Ramadan': [
      { word: 'SUHOOR', hint: 'Pre-dawn meal.' },
      { word: 'IFTAR', hint: 'Meal to break the fast.' },
      { word: 'TARAWEEH', hint: 'Special night prayers.' },
      { word: 'ITIKAF', hint: 'Seclusion in the mosque.' },
      { word: 'RAYYAN', hint: 'Gate of Jannah for those who fast.' },
      { word: 'QADR', hint: 'The Night of Power.' },
      { word: 'ZAKAT', hint: 'Charity given to the poor.' },
      { word: 'EID', hint: 'Celebration after Ramadan.' },
    ],
  }
};

export const ramadanWordSearch: WordSearchConfig = {
  wordPool: [
    'RAMADAN',
    'FASTING',
    'SUHOOR',
    'IFTAR',
    'TARAWEEH',
    'QURAN',
    'LAYLATULQADR',
    'ZAKAT',
    'EID',
    'MASJID',
    'DUA',
    'DHIKR',
    'TAQWA',
    'SADAQAH',
    'DATES',
    'WATER',
  ],
  count: 8,
  minSize: 10,
  maxSize: 14,
  conceptual: {
    choices: [
      {
        id: 'r-concept-1',
        prompt: 'What is the purpose of fasting in Ramadan?',
        points: 4,
        options: [
          { id: 'rc1', text: 'To attain Taqwa (God-consciousness)' },
          { id: 'rc2', text: 'To lose weight' },
          { id: 'rc3', text: 'To save money on food' },
          { id: 'rc4', text: 'To suffer hunger' },
        ],
        correctOptionId: 'rc1',
      },
      {
        id: 'r-concept-2',
        prompt: 'Which night is better than 1000 months?',
        points: 4,
        options: [
          { id: 'rd1', text: 'Laylatul Qadr' },
          { id: 'rd2', text: 'Laylatul Baraat' },
          { id: 'rd3', text: 'Eid Night' },
          { id: 'rd4', text: 'Friday Night' },
        ],
        correctOptionId: 'rd1',
      },
    ],
  },
};

export const seerahWordSearch: WordSearchConfig = {
  wordPool: [
    'MAKKAH',
    'MADINAH',
    'HIJRAH',
    'ABUBAKR',
    'KHADIJAH',
    'QURAISH',
    'CAVETHAWR',
    'RASOOL',
    'SUFFAH',
    'BOYCOTT',
    'TAAIF',
    'HUDAYBIYAH',
    'BATTLEBADR',
    'UHAD',
    'AHZAB',
    'ANSAR',
    'MUHAJIROON',
    'ISRA',
    'MIRAJ',
    'AQABAH',
    'TRENCH',
    'FATAH',
  ],
  count: 8,
  minSize: 10,
  maxSize: 14,
  followUp: [
    {
      id: 'seerah-follow-1',
      prompt: 'Which event happened after the Hijrah?',
      points: 4,
      options: [
        { id: 'h1', text: 'Building Masjid Nabawi' },
        { id: 'h2', text: 'First Revelation in Cave Hira' },
        { id: 'h3', text: 'Year of Sorrow' },
        { id: 'h4', text: 'Battle of Badr' },
      ],
      correctOptionId: 'h1',
    },
    {
      id: 'seerah-follow-2',
      prompt: 'Which pact allowed Muslims to return the next year?',
      points: 4,
      options: [
        { id: 'f1', text: 'Treaty of Hudaybiyah' },
        { id: 'f2', text: 'Battle of Uhud' },
        { id: 'f3', text: 'Battle of Badr' },
        { id: 'f4', text: 'Boycott in Makkah' },
      ],
      correctOptionId: 'f1',
    },
    {
      id: 'seerah-follow-3',
      prompt: 'Who were the Ansar?',
      points: 4,
      options: [
        { id: 'a1', text: 'The Muslims of Madinah who helped' },
        { id: 'a2', text: 'The people of Makkah' },
        { id: 'a3', text: 'The travelers' },
        { id: 'a4', text: 'The enemies in Badr' },
      ],
      correctOptionId: 'a1',
    },
    {
      id: 'seerah-follow-4',
      prompt: 'What was the trench dug for?',
      points: 4,
      options: [
        { id: 't1', text: 'Battle of Ahzab (Trench)' },
        { id: 't2', text: 'Battle of Badr' },
        { id: 't3', text: 'Building a Masjid' },
        { id: 't4', text: 'Planting trees' },
      ],
      correctOptionId: 't1',
    },
  ],
};

export const quranWordSearch: WordSearchConfig = {
  wordPool: [
    'QURAN',
    'SURAH',
    'AYAH',
    'TAFSIR',
    'TAJWID',
    'MAKKI',
    'MADANI',
    'HIFZ',
    'WAHY',
    'JUZ',
    'MANZIL',
    'QIRAAT',
    'RUKU',
    'SAJDAH',
    'BASMALAH',
    'FATIHAH',
  ],
  count: 8,
  minSize: 10,
  maxSize: 14,
  conceptual: {
    choices: [
      {
        id: 'q-concept-1',
        prompt: 'You found "Makki". What does it relate to?',
        points: 3,
        options: [
          { id: 'qc1', text: 'Surahs revealed before Hijrah' },
          { id: 'qc2', text: 'Surahs revealed after Hijrah' },
          { id: 'qc3', text: 'Rules of Tajwid' },
          { id: 'qc4', text: 'Number of ayat in a surah' },
        ],
        correctOptionId: 'qc1',
      },
      {
        id: 'q-concept-2',
        prompt: 'You found "Tajwid". What does it relate to?',
        points: 3,
        options: [
          { id: 'qd1', text: 'Rules of Quranic recitation' },
          { id: 'qd2', text: 'Counting ayat' },
          { id: 'qd3', text: 'Memorizing surahs' },
          { id: 'qd4', text: 'Translation methods' },
        ],
        correctOptionId: 'qd1',
      },
      {
        id: 'q-concept-3',
        prompt: 'What is a "Juz"?',
        points: 3,
        options: [
          { id: 'qe1', text: 'One of the 30 parts of the Quran' },
          { id: 'qe2', text: 'A small surah' },
          { id: 'qe3', text: 'A type of prayer' },
          { id: 'qe4', text: 'A prophet name' },
        ],
        correctOptionId: 'qe1',
      },
      {
        id: 'q-concept-4',
        prompt: 'What does "Hifz" mean?',
        points: 3,
        options: [
          { id: 'qf1', text: 'Memorization of the Quran' },
          { id: 'qf2', text: 'Reading from a book' },
          { id: 'qf3', text: 'Writing the Quran' },
          { id: 'qf4', text: 'Understanding Arabic' },
        ],
        correctOptionId: 'qf1',
      },
    ],
  },
};

export const hadithMeaningPool = [
  {
    id: 'h-actions-intentions',
    text: 'Actions are by intentions',
    correctActions: ['making-intention'],
  },
  {
    id: 'h-smile',
    text: 'Smiling is charity',
    correctActions: ['helping-sibling', 'showing-kindness'],
  },
  {
    id: 'h-remove-harm',
    text: 'Remove harm from the path',
    correctActions: ['cleaning-masjid', 'clearing-path'],
  },
  {
    id: 'h-consistent',
    text: 'Best deeds are those done consistently',
    correctActions: ['regular-small-deeds', 'daily-quran'],
  },
  {
    id: 'h-gentleness',
    text: 'Allah loves gentleness',
    correctActions: ['be-gentle', 'soft-speech'],
  },
  {
    id: 'h-honesty',
    text: 'Truthfulness leads to piety',
    correctActions: ['telling-truth', 'admitting-mistake'],
  },
  {
    id: 'h-parents',
    text: 'Paradise lies at the feet of mothers',
    correctActions: ['serving-mom', 'respecting-parents'],
  },
  {
    id: 'h-cleanliness',
    text: 'Cleanliness is half of faith',
    correctActions: ['washing-hands', 'wudu-properly'],
  },
];

export const hadithActionsPool = [
  { id: 'helping-sibling', text: 'Helping a sibling with homework' },
  { id: 'showing-kindness', text: 'Smiling and greeting kindly' },
  { id: 'cleaning-masjid', text: 'Cleaning the masjid entrance' },
  { id: 'clearing-path', text: 'Removing a rock from the walkway' },
  { id: 'making-intention', text: 'Making intention before doing an action' },
  { id: 'being-rough', text: 'Speaking harshly to others' },
  { id: 'regular-small-deeds', text: 'Doing a small good deed daily' },
  { id: 'daily-quran', text: 'Reading a page of Quran every day' },
  { id: 'ignoring-others', text: 'Ignoring someone who needs help' },
  { id: 'being-patient', text: 'Showing patience when annoyed' },
  { id: 'rushing-prayer', text: 'Rushing prayer to finish quickly' },
  { id: 'rough-play', text: 'Being rough during play' },
  { id: 'be-gentle', text: 'Responding with gentleness' },
  { id: 'soft-speech', text: 'Lowering your voice kindly' },
  { id: 'telling-truth', text: 'Telling the truth even if scared' },
  { id: 'admitting-mistake', text: 'Admitting a mistake honestly' },
  { id: 'serving-mom', text: 'Helping mother with chores' },
  { id: 'respecting-parents', text: 'Speaking politely to parents' },
  { id: 'washing-hands', text: 'Washing hands before eating' },
  { id: 'wudu-properly', text: 'Performing wudu with care' },
];

export const hadithScenarioPool = [
  {
    id: 'anger-control',
    scenario: 'You are angry but choose to stay quiet and breathe.',
    correct: 'Control of anger',
    options: [
      'Strength is anger',
      'Control of anger',
      'Loud speech',
      'Winning arguments',
    ],
  },
  {
    id: 'honesty',
    scenario: 'You forgot to return a book and decide to be honest.',
    correct: 'Truthfulness',
    options: ['Hiding the truth', 'Truthfulness', 'Blaming others', 'Delaying honesty'],
  },
  {
    id: 'mercy',
    scenario: 'You forgive someone who bumped into you.',
    correct: 'Mercy',
    options: ['Revenge', 'Mercy', 'Shouting back', 'Ignoring kindly'],
  },
  {
    id: 'patience',
    scenario: 'You wait calmly in a long line.',
    correct: 'Patience',
    options: ['Complaining', 'Patience', 'Pushing ahead', 'Leaving angry'],
  },
  {
    id: 'intention',
    scenario: 'You start homework by saying Bismillah and set a good intention.',
    correct: 'Actions by intentions',
    options: [
      'Do it for praise',
      'No intention needed',
      'Actions by intentions',
      'Do it fast only',
    ],
  },
  {
    id: 'sharing',
    scenario: 'You share your toys with a friend who has none.',
    correct: 'Generosity',
    options: ['Generosity', 'Showing off', 'Keeping everything', 'Wastefulness'],
  },
  {
    id: 'neighbor',
    scenario: 'You send some food to your neighbor.',
    correct: 'Rights of neighbors',
    options: ['Rights of neighbors', 'Wasting food', 'Asking for favor', 'Ignoring them'],
  },
];

export const wuduFixerPool = [
  {
    id: 'order-head-feet',
    prompt: 'Ahmad washed his feet before wiping his head.',
    correct: 'Incorrect (Fix order)',
    options: ['Correct', 'Incorrect (Fix order)', 'Skip wiping head'],
  },
  {
    id: 'missing-intention',
    prompt: 'Sara made wudu quickly without intention.',
    correct: 'Incorrect (Missing intention)',
    options: ['Correct', 'Incorrect (Missing intention)', 'Add extra washes'],
  },
  {
    id: 'skipped-arm',
    prompt: 'Ali washed face and feet but skipped his arms.',
    correct: 'Incorrect (Skipped arm)',
    options: ['Correct', 'Incorrect (Skipped arm)', 'Order is wrong'],
  },
  {
    id: 'extra-steps',
    prompt: 'Fatimah washed each part five times.',
    correct: 'Makrooh (Too many times)',
    options: ['Correct', 'Makrooh (Too many times)', 'Nullifies wudu'],
  },
  {
    id: 'conserve-water',
    prompt: 'Hamza left the tap running the whole time.',
    correct: 'Makrooh (Waste of water)',
    options: ['Correct', 'Makrooh (Waste of water)', 'Farḍ to waste less'],
  },
  {
    id: 'missed-heel',
    prompt: 'Zaid washed his feet but left his heels dry.',
    correct: 'Incorrect (Invalid wudu)',
    options: ['Correct', 'Incorrect (Invalid wudu)', 'Makrooh'],
  },
];

export const halalHaramPool = [
  {
    id: 'delay-salah',
    prompt: 'Delaying salah until the last minute without reason.',
    correct: 'Makrooh',
    options: ['Halal', 'Haram', 'Makrooh'],
  },
  {
    id: 'doubtful-food',
    prompt: 'Eating doubtful food when halal is available.',
    correct: 'Makrooh',
    options: ['Halal', 'Haram', 'Makrooh'],
  },
  {
    id: 'helping-parents',
    prompt: 'Helping parents late at night even if tired.',
    correct: 'Halal',
    options: ['Halal', 'Haram', 'Makrooh'],
  },
  {
    id: 'lying-joke',
    prompt: 'Lying as a joke.',
    correct: 'Haram',
    options: ['Halal', 'Haram', 'Makrooh'],
  },
  {
    id: 'water-waste',
    prompt: 'Using water excessively in wudu.',
    correct: 'Makrooh',
    options: ['Halal', 'Haram', 'Makrooh'],
  },
  {
    id: 'backbiting',
    prompt: 'Talking bad about someone behind their back.',
    correct: 'Haram',
    options: ['Halal', 'Haram', 'Makrooh'],
  },
  {
    id: 'siwak',
    prompt: 'Using Siwak (Miswak) to clean teeth.',
    correct: 'Halal',
    options: ['Halal', 'Haram', 'Makrooh'],
  },
];

export const sahabahTimeline = [
  {
    id: 'abu-bakr',
    name: 'Abu Bakr (RA)',
    events: [
      'Accepted Islam early',
      'Faced persecution in Makkah',
      'Migrated to Madinah with the Prophet ﷺ',
      'Supported the Prophet ﷺ in battles',
    ],
  },
  {
    id: 'umar',
    name: 'Umar (RA)',
    events: [
      'Accepted Islam boldly',
      'Protected Muslims in public prayer',
      'Migrated to Madinah openly',
      'Served as a just leader',
    ],
  },
  {
    id: 'uthman',
    name: 'Uthman (RA)',
    events: [
      'Married two daughters of the Prophet ﷺ',
      'Migrated to Abyssinia',
      'Compiled the Quran',
      'Was known for modesty (Haya)',
    ],
  },
  {
    id: 'ali',
    name: 'Ali (RA)',
    events: [
      'Accepted Islam as a child',
      'Slept in Prophet’s ﷺ bed during Hijrah',
      'Hero of Khaybar',
      'Married Fatimah (RA)',
    ],
  },
  {
    id: 'bilal',
    name: 'Bilal (RA)',
    events: [
      'Accepted Islam as a slave',
      'Endured torture for saying “Ahad”',
      'Freed by Abu Bakr (RA)',
      'Called the Adhan in Madinah',
    ],
  },
  {
    id: 'musab',
    name: 'Mus’ab ibn Umair (RA)',
    events: [
      'Accepted Islam in Makkah',
      'Faced family opposition',
      'Became teacher in Madinah',
      'Carried the banner at Uhud',
    ],
  },
];

export const sahabahDecisionScenarios = [
  {
    id: 'bilal-firm',
    prompt: "You are Bilal (RA) being tortured for saying 'Ahad'.",
    correct: 'Stay firm saying “Ahad”',
    options: [
      'Give up to stop pain',
      'Stay firm saying “Ahad”',
      'Argue loudly',
      'Run away',
    ],
  },
  {
    id: 'umar-justice',
    prompt: 'You are Umar (RA) and someone needs fairness.',
    correct: 'Judge with justice and courage',
    options: [
      'Ignore the issue',
      'Judge with justice and courage',
      'Favor friends',
      'Delay the case forever',
    ],
  },
  {
    id: 'abu-bakr-charity',
    prompt: 'You are Abu Bakr (RA) asked to spend for the needy.',
    correct: 'Give generously for Allah',
    options: [
      'Save every coin',
      'Give generously for Allah',
      'Only help close friends',
      'Wait for others to help first',
    ],
  },
  {
    id: 'uthman-well',
    prompt: 'You are Uthman (RA). The Muslims need water but the well is expensive.',
    correct: 'Buy the well for the Muslims',
    options: [
      'Buy the well for the Muslims',
      'Ignore the need',
      'Ask others to pay',
      'Keep money for yourself',
    ],
  },
  {
    id: 'ali-courage',
    prompt: 'You are Ali (RA). The Prophet ﷺ needs someone to sleep in his bed as a decoy.',
    correct: 'Sleep in the bed bravely',
    options: [
      'Sleep in the bed bravely',
      'Refuse out of fear',
      'Run away with him',
      'Hide somewhere else',
    ],
  },
  {
    id: 'musab-teacher',
    prompt: 'You are Mus’ab ibn Umair (RA) teaching new Muslims.',
    correct: 'Teach with patience and kindness',
    options: [
      'Give up teaching',
      'Teach with patience and kindness',
      'Be harsh when correcting',
      'Only teach wealthy people',
    ],
  },
];

export const hiddenChallenges: BaseTask[] = [
  {
    id: 'hidden-1',
    prompt: 'Hidden Challenge: Name two lessons from Hudaybiyah.',
    points: 6,
    options: [
      { id: 'hc1', text: 'Patience and strategic peace' },
      { id: 'hc2', text: 'Rush and fight quickly' },
      { id: 'hc3', text: 'Avoid treaties always' },
      { id: 'hc4', text: 'Delay decisions' },
    ],
    correctOptionId: 'hc1',
  },
  {
    id: 'hidden-2',
    prompt: 'Hidden Challenge: What makes a deed most beloved?',
    points: 6,
    options: [
      { id: 'hb1', text: 'Consistency and sincerity' },
      { id: 'hb2', text: 'Speed and showing off' },
      { id: 'hb3', text: 'Doing it rarely but a lot' },
      { id: 'hb4', text: 'Doing it only when seen' },
    ],
    correctOptionId: 'hb1',
  },
];

// ============================================================================
// PROPHET TIMELINE GAME - Match events to prophets
// ============================================================================
export const prophetTimelinePool = [
  { id: 'adam-creation', prompt: 'First human and prophet created', correct: 'Prophet Adam', options: ['Prophet Nuh', 'Prophet Adam', 'Prophet Ibrahim', 'Prophet Musa'] },
  { id: 'nuh-flood', prompt: 'Preached for 950 years; flood was sent', correct: 'Prophet Nuh', options: ['Prophet Nuh', 'Prophet Lut', 'Prophet Hud', 'Prophet Musa'] },
  { id: 'ibrahim-kaaba', prompt: 'Built the Kaaba with his son Ismail', correct: 'Prophet Ibrahim', options: ['Prophet Ibrahim', 'Prophet Sulayman', 'Prophet Dawood', 'Prophet Musa'] },
  { id: 'yusuf-egypt', prompt: 'Sold into slavery, became ruler in Egypt', correct: 'Prophet Yusuf', options: ['Prophet Yusuf', 'Prophet Musa', 'Prophet Yunus', 'Prophet Harun'] },
  { id: 'musa-sea', prompt: 'Parted the Red Sea for his people', correct: 'Prophet Musa', options: ['Prophet Musa', 'Prophet Dawood', 'Prophet Nuh', 'Prophet Ibrahim'] },
  { id: 'dawood-stone', prompt: 'Defeated Jalut with a stone and sling', correct: 'Prophet Dawood', options: ['Prophet Dawood', 'Prophet Sulayman', 'Prophet Yusuf', 'Prophet Musa'] },
  { id: 'sulayman-wind', prompt: 'Given dominion over wind and could speak to animals', correct: 'Prophet Sulayman', options: ['Prophet Sulayman', 'Prophet Dawood', 'Prophet Yunus', 'Prophet Hud'] },
  { id: 'yunus-whale', prompt: 'Swallowed by a great whale and lived in its belly', correct: 'Prophet Yunus', options: ['Prophet Yunus', 'Prophet Nuh', 'Prophet Lut', 'Prophet Hud'] },
];

// ============================================================================
// QURAN VERSES MATCHING - Match surahs to their main themes
// ============================================================================
export const quranVersesPool = [
  { id: 'fatiha', prompt: 'Opening chapter of Quran; contains the essential duas', correct: 'Surah Al-Fatiha', options: ['Surah Al-Fatiha', 'Surah Al-Ikhlas', 'Surah Ar-Rahman', 'Surah Al-Baqarah'] },
  { id: 'ikhlas', prompt: 'Describes the Oneness of Allah; equals one-third of the Quran', correct: 'Surah Al-Ikhlas', options: ['Surah Al-Ikhlas', 'Surah As-Samad', 'Surah Al-Kauthar', 'Surah Ad-Duha'] },
  { id: 'rahman', prompt: 'Known as "The Bride of the Quran"; emphasizes mercy', correct: 'Surah Ar-Rahman', options: ['Surah Ar-Rahman', 'Surah Al-Waqiah', 'Surah Al-Mulk', 'Surah As-Sajdah'] },
  { id: 'yaseen', prompt: 'Called "The Heart of the Quran"; story of believers in a town', correct: 'Surah Yaseen', options: ['Surah Yaseen', 'Surah Taha', 'Surah Ha-Meem', 'Surah Al-Anfal'] },
  { id: 'kahf', prompt: 'Contains the story of Dhul-Qarnayn and companions in cave', correct: 'Surah Al-Kahf', options: ['Surah Al-Kahf', 'Surah Al-Baqarah', 'Surah Maryam', 'Surah Taha'] },
  { id: 'ayatulkursi', prompt: 'The Throne Verse; greatest verse of Quran', correct: 'Ayat-ul-Kursi (Surah Al-Baqarah)', options: ['Ayat-ul-Kursi', 'Ayat-us-Sabiq', 'Ayat-ul-Qadr', 'Ayat-ul-Nur'] },
];

// ============================================================================
// SUNNAH PRACTICES MEMORY - Identify authentic sunnah actions
// ============================================================================
export const sunnahPracticesPool = [
  { id: 'miswak', prompt: 'Using a stick to clean teeth before prayer', correct: 'Authentic Sunnah', options: ['Authentic Sunnah', 'Not mentioned', 'Bidah (Innovation)', 'Forbidden'] },
  { id: 'siesta', prompt: 'Taking a short afternoon nap (Qailulah)', correct: 'Authentic Sunnah', options: ['Authentic Sunnah', 'Not recommended', 'Bidah', 'Discouraged'] },
  { id: 'walking', prompt: 'Walking to the masjid for prayer', correct: 'Authentic Sunnah', options: ['Authentic Sunnah', 'Optional', 'Not mentioned', 'Makrooh'] },
  { id: 'greeting', prompt: 'Saying Assalamu Alaikum when meeting someone', correct: 'Authentic Sunnah', options: ['Authentic Sunnah', 'Modern custom', 'Not required', 'Optional only'] },
  { id: 'eating-dates', prompt: 'Breaking fast with dates and water', correct: 'Authentic Sunnah', options: ['Authentic Sunnah', 'Not mentioned', 'Cultural only', 'Not recommended'] },
  { id: 'right-hand', prompt: 'Eating and giving with right hand', correct: 'Authentic Sunnah', options: ['Authentic Sunnah', 'Not important', 'Only for nobles', 'Left hand is fine too'] },
];

// ============================================================================
// DUA COMPLETION - Complete famous Islamic duas
// ============================================================================
export const duaCompletionPool = [
  { id: 'dua-fatiha', prompt: 'Alhamdulillahi Rabbil ___', correct: 'Alamin', options: ['Alamin', 'Noor', 'Ghafoor', 'Salaam'] },
  { id: 'dua-basmala', prompt: 'Bismillah ___ ar-Rahman ar-Rahim', correct: 'Al-Rahman', options: ['Al-Rahman', 'Ar-Rahim', 'Al-Alim', 'Al-Qadir'] },
  { id: 'dua-tahiyyah', prompt: 'At-tahiyyatu lillahi wa as-salawatu wa ___', correct: 'at-tayyibat', options: ['at-tayyibat', 'ar-rahmat', 'al-barkah', 'as-salaam'] },
  { id: 'dua-morning', prompt: 'Allahumma inni asaluka al-afiyah fi ___', correct: 'ad-dunya wal-akhirah', options: ['ad-dunya wal-akhirah', 'al-qalb', 'ash-shifa', 'an-nasr'] },
  { id: 'dua-protection', prompt: 'Bismillah alladhee la yadurru ma\'a ismihi shay\'un fi ___', correct: 'al-ardi wa la as-sama', options: ['al-ardi wa la as-sama', 'ad-dunya', 'al-jahannam', 'al-jism'] },
  { id: 'dua-sleep', prompt: 'Allahumma bismika amutu wa ___', correct: 'ahya', options: ['ahya', 'namu', 'aqumu', 'adumu'] },
];

// ============================================================================
// ISLAMIC LEADERS & SCHOLARS - Match leaders to their achievements
// ============================================================================
export const islamicLeadersPool = [
  { id: 'abu-bakr', prompt: 'First Caliph; known for extreme kindness and wealth spent for Islam', correct: 'Abu Bakr As-Siddiq', options: ['Abu Bakr As-Siddiq', 'Umar ibn Al-Khattab', 'Uthman ibn Affan', 'Ali ibn Abi Talib'] },
  { id: 'umar', prompt: 'Second Caliph; known as "Faruq" (Distinguisher); conquered many lands', correct: 'Umar ibn Al-Khattab', options: ['Umar ibn Al-Khattab', 'Abu Bakr', 'Ali ibn Abi Talib', 'Uthman'] },
  { id: 'uthman', prompt: 'Third Caliph; compiled the Quran into one standard copy', correct: 'Uthman ibn Affan', options: ['Uthman ibn Affan', 'Umar ibn Al-Khattab', 'Ali ibn Abi Talib', 'Hassan'] },
  { id: 'ali', prompt: 'Fourth Caliph; cousin and son-in-law of Prophet; known as "Asadullah" (Lion of Allah)', correct: 'Ali ibn Abi Talib', options: ['Ali ibn Abi Talib', 'Hassan ibn Ali', 'Hussain ibn Ali', 'Abu Talib'] },
  { id: 'khadijah', prompt: 'First believer; wife of Prophet; wealthy businesswoman', correct: 'Khadijah bint Khuwaylid', options: ['Khadijah bint Khuwaylid', 'Aishah', 'Hafsa', 'Zainab'] },
  { id: 'aishah', prompt: 'Wife of Prophet; known as "Mother of Believers"; great hadith scholar', correct: 'Aishah bint Abi Bakr', options: ['Aishah bint Abi Bakr', 'Hafsa bint Umar', 'Umm Salamah', 'Aishah bint Talha'] },
];

// ============================================================================
// ISLAMIC MONTHS & CALENDAR - Knowledge of Islamic calendar
// ============================================================================
export const islamicCalendarPool = [
  { id: 'hijrah', prompt: 'The Islamic calendar begins with Prophet Muhammad\'s ___', correct: 'Migration to Madinah (Hijrah)', options: ['Migration to Madinah (Hijrah)', 'Birth', 'First revelation', 'Death'] },
  { id: 'hijri-year', prompt: 'How many months are in the Islamic (Hijri) year?', correct: '12 months', options: ['12 months', '13 months', '10 months', '11 months'] },
  { id: 'ramadan-month', prompt: 'Ramadan is the ___ month of the Islamic calendar', correct: '9th month', options: ['9th month', '3rd month', '7th month', '12th month'] },
  { id: 'rajab', prompt: 'Rajab is one of the sacred months in which fighting is ___', correct: 'Forbidden', options: ['Forbidden', 'Encouraged', 'Allowed', 'Delayed'] },
  { id: 'lunar-days', prompt: 'The Islamic year is shorter than solar year by approximately ___ days', correct: '11 days', options: ['11 days', '5 days', '15 days', '20 days'] },
];

