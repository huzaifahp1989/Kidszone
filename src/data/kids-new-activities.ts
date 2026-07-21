/** Shared content for new kids activities (Wudu, 99 Names, Seerah facts, manners). */

export type OrderStep = {
  id: number;
  icon: string;
  title: string;
  subtitle: string;
};

export const WUDU_STEPS: OrderStep[] = [
  { id: 1, icon: '💭', title: 'Niyyah', subtitle: 'Make intention in your heart' },
  { id: 2, icon: '✋', title: 'Wash hands', subtitle: 'Wash both hands up to the wrists' },
  { id: 3, icon: '👄', title: 'Mouth', subtitle: 'Rinse the mouth' },
  { id: 4, icon: '👃', title: 'Nose', subtitle: 'Clean the nose' },
  { id: 5, icon: '😊', title: 'Face', subtitle: 'Wash the face' },
  { id: 6, icon: '💪', title: 'Arms', subtitle: 'Wash arms to the elbows' },
  { id: 7, icon: '🖐', title: 'Wipe head', subtitle: 'Wipe over the head' },
  { id: 8, icon: '👂', title: 'Ears', subtitle: 'Wipe the ears' },
  { id: 9, icon: '🦶', title: 'Feet', subtitle: 'Wash both feet to the ankles' },
];

export type AllahName = {
  id: string;
  arabic: string;
  transliteration: string;
  meaning: string;
};

/** Kid-friendly subset of the Beautiful Names for flashcards & match. */
export const ALLAH_NAMES_KIDS: AllahName[] = [
  { id: 'ar-rahman', arabic: 'الرَّحْمَٰن', transliteration: 'Ar-Rahman', meaning: 'The Most Merciful' },
  { id: 'ar-raheem', arabic: 'الرَّحِيم', transliteration: 'Ar-Raheem', meaning: 'The Especially Merciful' },
  { id: 'al-malik', arabic: 'الْمَلِك', transliteration: 'Al-Malik', meaning: 'The King' },
  { id: 'al-quddus', arabic: 'الْقُدُّوس', transliteration: 'Al-Quddus', meaning: 'The Pure' },
  { id: 'as-salam', arabic: 'السَّلَام', transliteration: 'As-Salam', meaning: 'The Source of Peace' },
  { id: 'al-ghaffar', arabic: 'الْغَفَّار', transliteration: 'Al-Ghaffar', meaning: 'The Oft-Forgiving' },
  { id: 'al-aleem', arabic: 'الْعَلِيم', transliteration: 'Al-Aleem', meaning: 'The All-Knowing' },
  { id: 'al-samee', arabic: 'السَّمِيع', transliteration: 'As-Samee', meaning: 'The All-Hearing' },
  { id: 'al-baseer', arabic: 'الْبَصِير', transliteration: 'Al-Baseer', meaning: 'The All-Seeing' },
  { id: 'al-lateef', arabic: 'اللَّطِيف', transliteration: 'Al-Lateef', meaning: 'The Subtle & Kind' },
  { id: 'al-haleem', arabic: 'الْحَلِيم', transliteration: 'Al-Haleem', meaning: 'The Forbearing' },
  { id: 'al-kareem', arabic: 'الْكَرِيم', transliteration: 'Al-Kareem', meaning: 'The Generous' },
];

export type ProphetFact = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  tip: string;
};

export const PROPHET_FACTS: ProphetFact[] = [
  {
    id: 'birth',
    question: 'In which city was Prophet Muhammad ﷺ born?',
    options: ['Makkah', 'Madinah', 'Jerusalem', 'Cairo'],
    correctIndex: 0,
    tip: 'He ﷺ was born in Makkah.',
  },
  {
    id: 'father',
    question: 'What was the name of the Prophet ﷺ’s father?',
    options: ['Abu Bakr', 'Abdullah', 'Umar', 'Hamza'],
    correctIndex: 1,
    tip: 'His father’s name was Abdullah.',
  },
  {
    id: 'mother',
    question: 'What was the name of the Prophet ﷺ’s mother?',
    options: ['Aisha', 'Khadijah', 'Aminah', 'Fatimah'],
    correctIndex: 2,
    tip: 'His mother’s name was Aminah.',
  },
  {
    id: 'title',
    question: 'What nickname did people give the Prophet ﷺ before prophethood?',
    options: ['Al-Amin (the Trustworthy)', 'Al-Farooq', 'As-Siddeeq', 'Saifullah'],
    correctIndex: 0,
    tip: 'He was known as Al-Amin — the Trustworthy.',
  },
  {
    id: 'first-wife',
    question: 'Who was the first wife of the Prophet ﷺ?',
    options: ['Aisha', 'Khadijah', 'Hafsa', 'Sawda'],
    correctIndex: 1,
    tip: 'Khadijah (RA) was his first wife and supporter.',
  },
  {
    id: 'hijrah',
    question: 'Where did the Prophet ﷺ migrate to in the Hijrah?',
    options: ['Taif', 'Yemen', 'Madinah', 'Egypt'],
    correctIndex: 2,
    tip: 'He migrated from Makkah to Madinah.',
  },
  {
    id: 'first-revelation',
    question: 'In which cave did the first revelation come?',
    options: ['Cave Hira', 'Cave Thawr', 'Cave Uhud', 'Cave Quba'],
    correctIndex: 0,
    tip: 'The first revelation came in Cave Hira.',
  },
  {
    id: 'uncle',
    question: 'Which uncle cared for the Prophet ﷺ after his grandfather?',
    options: ['Abu Lahab', 'Abu Talib', 'Abbas', 'Hamza'],
    correctIndex: 1,
    tip: 'Abu Talib looked after him with great love.',
  },
];

export const MANNERS_TASKS = [
  { id: 'salam', label: 'Say Assalamu Alaikum to someone', emoji: '👋' },
  { id: 'bismillah', label: 'Say Bismillah before eating', emoji: '🍽️' },
  { id: 'alhamdulillah', label: 'Say Alhamdulillah after finishing food', emoji: '😋' },
  { id: 'listen', label: 'Listen politely when someone speaks', emoji: '👂' },
  { id: 'shoes', label: 'Enter with the right foot / leave with left (or try carefully)', emoji: '👟' },
  { id: 'please-thanks', label: 'Use kind words: please / thank you / jazakAllah', emoji: '💬' },
];
