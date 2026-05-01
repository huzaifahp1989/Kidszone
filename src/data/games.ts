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

// ============================================================================
// TRUE OR FALSE POOL - Islamic facts (2 options each, for True/False game)
// ============================================================================
export const trueOrFalsePool: BaseTask[] = [
  {
    id: 'tf-1',
    prompt: 'The Quran was revealed to Prophet Muhammad ﷺ over 23 years.',
    points: 2,
    options: [{ id: 'tf1-t', text: 'True' }, { id: 'tf1-f', text: 'False' }],
    correctOptionId: 'tf1-t',
  },
  {
    id: 'tf-2',
    prompt: 'Prophet Ibrahim ﷺ built the Kaaba together with his son Ismail ﷺ.',
    points: 2,
    options: [{ id: 'tf2-t', text: 'True' }, { id: 'tf2-f', text: 'False' }],
    correctOptionId: 'tf2-t',
  },
  {
    id: 'tf-3',
    prompt: 'There are 6 pillars of Islam.',
    points: 2,
    options: [{ id: 'tf3-t', text: 'True' }, { id: 'tf3-f', text: 'False' }],
    correctOptionId: 'tf3-f',
  },
  {
    id: 'tf-4',
    prompt: 'Laylatul Qadr (Night of Power) is better than a thousand months.',
    points: 2,
    options: [{ id: 'tf4-t', text: 'True' }, { id: 'tf4-f', text: 'False' }],
    correctOptionId: 'tf4-t',
  },
  {
    id: 'tf-5',
    prompt: 'Prophet Isa ﷺ (Jesus) is mentioned more times than Prophet Muhammad ﷺ in the Quran.',
    points: 2,
    options: [{ id: 'tf5-t', text: 'True' }, { id: 'tf5-f', text: 'False' }],
    correctOptionId: 'tf5-t',
  },
  {
    id: 'tf-6',
    prompt: 'The first word revealed in the Quran was "Bismillah".',
    points: 2,
    options: [{ id: 'tf6-t', text: 'True' }, { id: 'tf6-f', text: 'False' }],
    correctOptionId: 'tf6-f',
  },
  {
    id: 'tf-7',
    prompt: 'Prophet Nuh ﷺ preached his people for 950 years.',
    points: 2,
    options: [{ id: 'tf7-t', text: 'True' }, { id: 'tf7-f', text: 'False' }],
    correctOptionId: 'tf7-t',
  },
  {
    id: 'tf-8',
    prompt: 'Masjid Al-Aqsa is located in Makkah.',
    points: 2,
    options: [{ id: 'tf8-t', text: 'True' }, { id: 'tf8-f', text: 'False' }],
    correctOptionId: 'tf8-f',
  },
  {
    id: 'tf-9',
    prompt: 'Hajj is obligatory once in a lifetime for every Muslim who is able.',
    points: 2,
    options: [{ id: 'tf9-t', text: 'True' }, { id: 'tf9-f', text: 'False' }],
    correctOptionId: 'tf9-t',
  },
  {
    id: 'tf-10',
    prompt: 'Surah Al-Baqarah is the shortest surah in the Quran.',
    points: 2,
    options: [{ id: 'tf10-t', text: 'True' }, { id: 'tf10-f', text: 'False' }],
    correctOptionId: 'tf10-f',
  },
];

// ============================================================================
// 99 NAMES OF ALLAH QUIZ - Match name to meaning or vice versa
// ============================================================================
export const namesOfAllahPool: BaseTask[] = [
  {
    id: 'na-1',
    prompt: 'What does "Ar-Rahman" mean?',
    points: 2,
    options: [
      { id: 'na1-a', text: 'The Most Merciful (general mercy)' },
      { id: 'na1-b', text: 'The All-Knowing' },
      { id: 'na1-c', text: 'The Creator' },
      { id: 'na1-d', text: 'The Sustainer' },
    ],
    correctOptionId: 'na1-a',
  },
  {
    id: 'na-2',
    prompt: 'Which name of Allah means "The All-Seeing"?',
    points: 2,
    options: [
      { id: 'na2-a', text: 'Al-Alim' },
      { id: 'na2-b', text: 'Al-Basir' },
      { id: 'na2-c', text: 'As-Sami' },
      { id: 'na2-d', text: 'Al-Khabir' },
    ],
    correctOptionId: 'na2-b',
  },
  {
    id: 'na-3',
    prompt: 'What does "Al-Ghafur" mean?',
    points: 2,
    options: [
      { id: 'na3-a', text: 'The Most Forgiving' },
      { id: 'na3-b', text: 'The Most Powerful' },
      { id: 'na3-c', text: 'The Most Wise' },
      { id: 'na3-d', text: 'The Most Merciful' },
    ],
    correctOptionId: 'na3-a',
  },
  {
    id: 'na-4',
    prompt: 'Which name means "The Provider / Sustainer"?',
    points: 2,
    options: [
      { id: 'na4-a', text: 'Al-Qadir' },
      { id: 'na4-b', text: 'Al-Khaliq' },
      { id: 'na4-c', text: 'Ar-Razzaq' },
      { id: 'na4-d', text: 'Al-Wadud' },
    ],
    correctOptionId: 'na4-c',
  },
  {
    id: 'na-5',
    prompt: 'What does "Al-Hakim" mean?',
    points: 2,
    options: [
      { id: 'na5-a', text: 'The All-Wise' },
      { id: 'na5-b', text: 'The All-Hearing' },
      { id: 'na5-c', text: 'The Protector' },
      { id: 'na5-d', text: 'The Eternal' },
    ],
    correctOptionId: 'na5-a',
  },
  {
    id: 'na-6',
    prompt: 'Which name of Allah means "The Peace / Source of Peace"?',
    points: 2,
    options: [
      { id: 'na6-a', text: 'Al-Mu\'min' },
      { id: 'na6-b', text: 'As-Salam' },
      { id: 'na6-c', text: 'Al-Hafiz' },
      { id: 'na6-d', text: 'Al-Muqit' },
    ],
    correctOptionId: 'na6-b',
  },
  {
    id: 'na-7',
    prompt: 'What does "Al-Khaliq" mean?',
    points: 2,
    options: [
      { id: 'na7-a', text: 'The Creator' },
      { id: 'na7-b', text: 'The King' },
      { id: 'na7-c', text: 'The Just' },
      { id: 'na7-d', text: 'The Guardian' },
    ],
    correctOptionId: 'na7-a',
  },
  {
    id: 'na-8',
    prompt: 'Which name means "The Most Loving"?',
    points: 2,
    options: [
      { id: 'na8-a', text: 'Ar-Rahman' },
      { id: 'na8-b', text: 'Al-Karim' },
      { id: 'na8-c', text: 'Al-Wadud' },
      { id: 'na8-d', text: 'Al-Afuw' },
    ],
    correctOptionId: 'na8-c',
  },
  {
    id: 'na-9',
    prompt: 'What does "Al-Alim" mean?',
    points: 2,
    options: [
      { id: 'na9-a', text: 'The All-Knowing' },
      { id: 'na9-b', text: 'The Everlasting' },
      { id: 'na9-c', text: 'The Gentle' },
      { id: 'na9-d', text: 'The Majestic' },
    ],
    correctOptionId: 'na9-a',
  },
  {
    id: 'na-10',
    prompt: 'Which name of Allah means "The All-Hearing"?',
    points: 2,
    options: [
      { id: 'na10-a', text: 'Al-Basir' },
      { id: 'na10-b', text: 'As-Sami' },
      { id: 'na10-c', text: 'Al-Khabir' },
      { id: 'na10-d', text: 'Al-Alim' },
    ],
    correctOptionId: 'na10-b',
  },
];

// ============================================================================
// CROSSWORD PUZZLES - Pre-designed Islamic crossword grids
// ============================================================================

export interface CrosswordCell {
  letter: string;
  wordIds: string[]; // which word(s) occupy this cell
}

export interface CrosswordWord {
  id: string;
  word: string;
  clue: string;
  direction: 'across' | 'down';
  row: number; // starting row (0-indexed)
  col: number; // starting col (0-indexed)
  number: number; // clue number displayed on grid
}

export interface CrosswordPuzzle {
  id: string;
  title: string;
  rows: number;
  cols: number;
  words: CrosswordWord[];
}

export const crosswordPuzzles: CrosswordPuzzle[] = [
  // ─── Puzzle 1: "Islam Basics" ─────────────────────────────────────────────
  // Grid layout (7 rows × 7 cols):
  //   Col:  0  1  2  3  4  5  6
  //   r=0:  .  I  S  L  A  M  .     ← ISLAM across (r=0,c=1)
  //   r=1:  .  .  A  .  D  .  .     ← SALAH down (r=0,c=2), ADAM down (r=0,c=4)
  //   r=2:  .  .  L  .  A  .  .
  //   r=3:  .  .  A  .  M  .  .
  //   r=4:  .  H  H  .  .  .  .     ← HAJJ across (r=4,c=1), SALAH finishes at r=4
  //   Actually: SALAH = S,A,L,A,H → down from (0,2): (0,2)=S,(1,2)=A,(2,2)=L,(3,2)=A,(4,2)=H
  //             ADAM = A,D,A,M → down from (0,4): (0,4)=A,(1,4)=D,(2,4)=A,(3,4)=M
  //             ISLAM = I,S,L,A,M → across (0,1): (0,1)=I,(0,2)=S,(0,3)=L,(0,4)=A,(0,5)=M
  //             HAJJ = H,A,J,J → across (4,2): (4,2)=H,(4,3)=A,(4,4)=J,(4,5)=J
  //   Intersections:
  //     ISLAM[1] S ∩ SALAH[0] S  at (0,2) ✓
  //     ISLAM[3] A ∩ ADAM[0]  A  at (0,4) ✓
  //     SALAH[4] H ∩ HAJJ[0]  H  at (4,2) ✓
  {
    id: 'crossword-1',
    title: 'Islam Basics',
    rows: 7,
    cols: 7,
    words: [
      { id: 'cw1-islam',  word: 'ISLAM',  clue: 'The religion of Muslims',           direction: 'across', row: 0, col: 1, number: 1 },
      { id: 'cw1-salah',  word: 'SALAH',  clue: 'The five daily prayers',            direction: 'down',   row: 0, col: 2, number: 2 },
      { id: 'cw1-adam',   word: 'ADAM',   clue: 'First man and first prophet',       direction: 'down',   row: 0, col: 4, number: 3 },
      { id: 'cw1-hajj',   word: 'HAJJ',   clue: 'Pilgrimage to Makkah',             direction: 'across', row: 4, col: 2, number: 4 },
    ],
  },

  // ─── Puzzle 2: "Prophets" ─────────────────────────────────────────────────
  // Grid layout (8 rows × 8 cols):
  //   MUSA across (r=2,c=1): (2,1)=M,(2,2)=U,(2,3)=S,(2,4)=A
  //   ISA  down   (r=1,c=3): (1,3)=I,(2,3)=S,(3,3)=A        ← ISA[1] S ∩ MUSA[2] S at (2,3)
  //   ADAM down   (r=1,c=4): (1,4)=A,(2,4)=D,(3,4)=A,(4,4)=M  ← MUSA[3] A ∩ ADAM[1] D? No.
  //   Actually ADAM[0]=A at (1,4), MUSA[3]=A at (2,4)… mismatch.
  //   Let's fix: ADAM down from (r=2,c=4): (2,4)=A,(3,4)=D,(4,4)=A,(5,4)=M
  //              MUSA[3] at (2,4) = A, ADAM[0] at (2,4) = A ✓
  //   NUH across (r=6,c=1): isolated
  //   IBRAHIM down (r=0,c=6): isolated
  {
    id: 'crossword-2',
    title: 'Prophets',
    rows: 8,
    cols: 8,
    words: [
      { id: 'cw2-musa',    word: 'MUSA',    clue: 'Prophet who parted the sea',             direction: 'across', row: 2, col: 1, number: 1 },
      { id: 'cw2-isa',     word: 'ISA',     clue: 'Prophet born without a father',         direction: 'down',   row: 1, col: 3, number: 2 },
      { id: 'cw2-adam',    word: 'ADAM',    clue: 'First man and first prophet',            direction: 'down',   row: 2, col: 4, number: 3 },
      { id: 'cw2-nuh',     word: 'NUH',     clue: 'Prophet who built the Ark',             direction: 'across', row: 6, col: 1, number: 4 },
      { id: 'cw2-ibrahim', word: 'IBRAHIM', clue: 'Built the Kaaba with his son Ismail',   direction: 'down',   row: 0, col: 6, number: 5 },
    ],
  },

  // ─── Puzzle 3: "Islamic Values" ───────────────────────────────────────────
  // Grid layout (7 rows × 7 cols):
  //   IMAN  across (r=2,c=1): (2,1)=I,(2,2)=M,(2,3)=A,(2,4)=N
  //   SABR  down   (r=1,c=3): (1,3)=S,(2,3)=A,(3,3)=B,(4,3)=R   ← IMAN[2] A ∩ SABR[1] A at (2,3) ✓
  //   NOOR  down   (r=2,c=4): (2,4)=N,(3,4)=O,(4,4)=O,(5,4)=R   ← IMAN[3] N ∩ NOOR[0] N at (2,4) ✓
  //   DEEN  across (r=5,c=1): isolated
  {
    id: 'crossword-3',
    title: 'Islamic Values',
    rows: 7,
    cols: 7,
    words: [
      { id: 'cw3-iman', word: 'IMAN', clue: 'Faith in Allah',                    direction: 'across', row: 2, col: 1, number: 1 },
      { id: 'cw3-sabr', word: 'SABR', clue: 'Patience in times of difficulty',  direction: 'down',   row: 1, col: 3, number: 2 },
      { id: 'cw3-noor', word: 'NOOR', clue: 'Spiritual light / divine light',   direction: 'down',   row: 2, col: 4, number: 3 },
      { id: 'cw3-deen', word: 'DEEN', clue: 'Way of life / religion',           direction: 'across', row: 5, col: 1, number: 4 },
    ],
  },
];

// ============================================================================
// WORD SCRAMBLE POOL - Unscramble Islamic terms
// ============================================================================

export interface ScrambleWord {
  id: string;
  word: string;       // correct answer (uppercase)
  scrambled: string;  // pre-scrambled version
  hint: string;
}

export const wordScramblePool: ScrambleWord[] = [
  { id: 'sc-salah',  word: 'SALAH',  scrambled: 'LAHSA',  hint: 'Five daily prayers' },
  { id: 'sc-quran',  word: 'QURAN',  scrambled: 'RUQAN',  hint: 'The holy book of Islam' },
  { id: 'sc-zakat',  word: 'ZAKAT',  scrambled: 'KAZTA',  hint: 'Obligatory charity' },
  { id: 'sc-sawm',   word: 'SAWM',   scrambled: 'WMSA',   hint: 'Fasting in Ramadan' },
  { id: 'sc-hajj',   word: 'HAJJ',   scrambled: 'JJAH',   hint: 'Pilgrimage to Makkah' },
  { id: 'sc-iman',   word: 'IMAN',   scrambled: 'NAMI',   hint: 'Faith / belief' },
  { id: 'sc-taqwa',  word: 'TAQWA',  scrambled: 'AWQTA',  hint: 'Consciousness and fear of Allah' },
  { id: 'sc-sabr',   word: 'SABR',   scrambled: 'BRSA',   hint: 'Patience and perseverance' },
  { id: 'sc-shukr',  word: 'SHUKR',  scrambled: 'KRHUS',  hint: 'Gratitude to Allah' },
  { id: 'sc-masjid', word: 'MASJID', scrambled: 'DIJMAS', hint: 'Place of worship / mosque' },
  { id: 'sc-wudu',   word: 'WUDU',   scrambled: 'UDWU',   hint: 'Ritual purification before prayer' },
  { id: 'sc-kaaba',  word: 'KAABA',  scrambled: 'AABAK',  hint: 'Cube-shaped structure in Makkah' },
  { id: 'sc-adhan',  word: 'ADHAN',  scrambled: 'NHADA',  hint: 'Call to prayer' },
  { id: 'sc-jannah', word: 'JANNAH', scrambled: 'HANJAJ', hint: 'Paradise / Heaven in Islam' },
  { id: 'sc-sunnah', word: 'SUNNAH', scrambled: 'HNANUS', hint: 'Teachings and practices of the Prophet ﷺ' },
];

