/** Kid-friendly English ↔ Arabic everyday word dictionary. */

export type ArabicWordCategory =
  | 'family'
  | 'cars'
  | 'home'
  | 'food'
  | 'school'
  | 'nature'
  | 'greetings'
  | 'body'
  | 'colours'
  | 'numbers';

export type ArabicWord = {
  id: string;
  category: ArabicWordCategory;
  english: string;
  arabic: string;
  transliteration: string;
};

export const ARABIC_WORD_CATEGORIES: Array<{
  id: ArabicWordCategory;
  label: string;
  emoji: string;
  description: string;
}> = [
  { id: 'family', label: 'Family', emoji: '👨‍👩‍👧', description: 'People you love at home' },
  { id: 'cars', label: 'Cars & Travel', emoji: '🚗', description: 'Getting around' },
  { id: 'home', label: 'Home', emoji: '🏠', description: 'Rooms and things at home' },
  { id: 'food', label: 'Food & Drink', emoji: '🍎', description: 'Yummy everyday words' },
  { id: 'school', label: 'School', emoji: '📚', description: 'Learning words' },
  { id: 'nature', label: 'Nature', emoji: '🌳', description: 'World around us' },
  { id: 'greetings', label: 'Greetings', emoji: '👋', description: 'Kind things to say' },
  { id: 'body', label: 'Body', emoji: '🖐️', description: 'Parts of you' },
  { id: 'colours', label: 'Colours', emoji: '🎨', description: 'Colour words' },
  { id: 'numbers', label: 'Numbers', emoji: '🔢', description: 'Counting in Arabic' },
];

export const ARABIC_DICTIONARY: ArabicWord[] = [
  // Family
  { id: 'mother', category: 'family', english: 'Mother', arabic: 'أُمّ', transliteration: 'umm' },
  { id: 'father', category: 'family', english: 'Father', arabic: 'أَب', transliteration: 'ab' },
  { id: 'brother', category: 'family', english: 'Brother', arabic: 'أَخ', transliteration: 'akh' },
  { id: 'sister', category: 'family', english: 'Sister', arabic: 'أُخْت', transliteration: 'ukht' },
  { id: 'grandfather', category: 'family', english: 'Grandfather', arabic: 'جَدّ', transliteration: 'jadd' },
  { id: 'grandmother', category: 'family', english: 'Grandmother', arabic: 'جَدَّة', transliteration: 'jaddah' },
  { id: 'uncle', category: 'family', english: 'Uncle (paternal)', arabic: 'عَمّ', transliteration: 'amm' },
  { id: 'aunt', category: 'family', english: 'Aunt (paternal)', arabic: 'عَمَّة', transliteration: 'ammah' },
  { id: 'son', category: 'family', english: 'Son', arabic: 'اِبْن', transliteration: 'ibn' },
  { id: 'daughter', category: 'family', english: 'Daughter', arabic: 'بِنْت', transliteration: 'bint' },
  { id: 'family', category: 'family', english: 'Family', arabic: 'أُسْرَة', transliteration: 'usrah' },
  { id: 'friend', category: 'family', english: 'Friend', arabic: 'صَدِيق', transliteration: 'sadeeq' },

  // Cars & travel
  { id: 'car', category: 'cars', english: 'Car', arabic: 'سَيَّارَة', transliteration: 'sayyarah' },
  { id: 'bus', category: 'cars', english: 'Bus', arabic: 'حَافِلَة', transliteration: 'haafilah' },
  { id: 'train', category: 'cars', english: 'Train', arabic: 'قِطَار', transliteration: 'qitaar' },
  { id: 'plane', category: 'cars', english: 'Airplane', arabic: 'طَائِرَة', transliteration: 'taa\'irah' },
  { id: 'bicycle', category: 'cars', english: 'Bicycle', arabic: 'دَرَّاجَة', transliteration: 'darraajah' },
  { id: 'boat', category: 'cars', english: 'Boat', arabic: 'قَارِب', transliteration: 'qaarib' },
  { id: 'road', category: 'cars', english: 'Road', arabic: 'طَرِيق', transliteration: 'tareeq' },
  { id: 'traffic', category: 'cars', english: 'Traffic light', arabic: 'إِشَارَة', transliteration: 'ishaarah' },
  { id: 'driver', category: 'cars', english: 'Driver', arabic: 'سَائِق', transliteration: 'saa\'iq' },
  { id: 'journey', category: 'cars', english: 'Journey', arabic: 'رِحْلَة', transliteration: 'rihlah' },

  // Home
  { id: 'house', category: 'home', english: 'House', arabic: 'بَيْت', transliteration: 'bayt' },
  { id: 'door', category: 'home', english: 'Door', arabic: 'بَاب', transliteration: 'baab' },
  { id: 'window', category: 'home', english: 'Window', arabic: 'نَافِذَة', transliteration: 'naafidhah' },
  { id: 'room', category: 'home', english: 'Room', arabic: 'غُرْفَة', transliteration: 'ghurfah' },
  { id: 'kitchen', category: 'home', english: 'Kitchen', arabic: 'مَطْبَخ', transliteration: 'matbakh' },
  { id: 'bed', category: 'home', english: 'Bed', arabic: 'سَرِير', transliteration: 'sareer' },
  { id: 'table', category: 'home', english: 'Table', arabic: 'طَاوِلَة', transliteration: 'taawilah' },
  { id: 'chair', category: 'home', english: 'Chair', arabic: 'كُرْسِيّ', transliteration: 'kursiyy' },
  { id: 'lamp', category: 'home', english: 'Lamp', arabic: 'مِصْبَاح', transliteration: 'misbaah' },
  { id: 'key', category: 'home', english: 'Key', arabic: 'مِفْتَاح', transliteration: 'miftaah' },

  // Food
  { id: 'water', category: 'food', english: 'Water', arabic: 'مَاء', transliteration: 'maa\'' },
  { id: 'milk', category: 'food', english: 'Milk', arabic: 'حَلِيب', transliteration: 'haleeb' },
  { id: 'bread', category: 'food', english: 'Bread', arabic: 'خُبْز', transliteration: 'khubz' },
  { id: 'apple', category: 'food', english: 'Apple', arabic: 'تُفَّاحَة', transliteration: 'tuffaahah' },
  { id: 'banana', category: 'food', english: 'Banana', arabic: 'مَوْزَة', transliteration: 'mawzah' },
  { id: 'rice', category: 'food', english: 'Rice', arabic: 'أَرُزّ', transliteration: 'aruzz' },
  { id: 'meat', category: 'food', english: 'Meat', arabic: 'لَحْم', transliteration: 'lahm' },
  { id: 'chicken', category: 'food', english: 'Chicken', arabic: 'دَجَاج', transliteration: 'dajaaj' },
  { id: 'dates', category: 'food', english: 'Dates', arabic: 'تَمْر', transliteration: 'tamr' },
  { id: 'tea', category: 'food', english: 'Tea', arabic: 'شَاي', transliteration: 'shaay' },

  // School
  { id: 'school', category: 'school', english: 'School', arabic: 'مَدْرَسَة', transliteration: 'madrasah' },
  { id: 'teacher', category: 'school', english: 'Teacher', arabic: 'مُعَلِّم', transliteration: 'mu\'allim' },
  { id: 'book', category: 'school', english: 'Book', arabic: 'كِتَاب', transliteration: 'kitaab' },
  { id: 'pen', category: 'school', english: 'Pen', arabic: 'قَلَم', transliteration: 'qalam' },
  { id: 'bag', category: 'school', english: 'Bag', arabic: 'حَقِيبَة', transliteration: 'haqeebah' },
  { id: 'desk', category: 'school', english: 'Desk', arabic: 'مَكْتَب', transliteration: 'maktab' },
  { id: 'homework', category: 'school', english: 'Homework', arabic: 'وَاجِب', transliteration: 'waajib' },
  { id: 'student', category: 'school', english: 'Student', arabic: 'طَالِب', transliteration: 'taalib' },

  // Nature
  { id: 'sun', category: 'nature', english: 'Sun', arabic: 'شَمْس', transliteration: 'shams' },
  { id: 'moon', category: 'nature', english: 'Moon', arabic: 'قَمَر', transliteration: 'qamar' },
  { id: 'star', category: 'nature', english: 'Star', arabic: 'نَجْمَة', transliteration: 'najmah' },
  { id: 'tree', category: 'nature', english: 'Tree', arabic: 'شَجَرَة', transliteration: 'shajarah' },
  { id: 'flower', category: 'nature', english: 'Flower', arabic: 'زَهْرَة', transliteration: 'zahrah' },
  { id: 'rain', category: 'nature', english: 'Rain', arabic: 'مَطَر', transliteration: 'matar' },
  { id: 'sky', category: 'nature', english: 'Sky', arabic: 'سَمَاء', transliteration: 'samaa\'' },
  { id: 'sea', category: 'nature', english: 'Sea', arabic: 'بَحْر', transliteration: 'bahr' },

  // Greetings
  { id: 'hello', category: 'greetings', english: 'Hello / Peace', arabic: 'السَّلَامُ عَلَيْكُم', transliteration: 'as-salaamu alaykum' },
  { id: 'thanks', category: 'greetings', english: 'Thank you', arabic: 'شُكْرًا', transliteration: 'shukran' },
  { id: 'please', category: 'greetings', english: 'Please', arabic: 'مِنْ فَضْلِك', transliteration: 'min fadlik' },
  { id: 'yes', category: 'greetings', english: 'Yes', arabic: 'نَعَم', transliteration: 'na\'am' },
  { id: 'no', category: 'greetings', english: 'No', arabic: 'لَا', transliteration: 'laa' },
  { id: 'goodbye', category: 'greetings', english: 'Goodbye', arabic: 'مَعَ السَّلَامَة', transliteration: 'ma\'a as-salaamah' },
  { id: 'welcome', category: 'greetings', english: 'Welcome', arabic: 'أَهْلًا', transliteration: 'ahlan' },
  { id: 'sorry', category: 'greetings', english: 'Sorry', arabic: 'آسِف', transliteration: 'aasif' },

  // Body
  { id: 'hand', category: 'body', english: 'Hand', arabic: 'يَد', transliteration: 'yad' },
  { id: 'eye', category: 'body', english: 'Eye', arabic: 'عَيْن', transliteration: 'ayn' },
  { id: 'ear', category: 'body', english: 'Ear', arabic: 'أُذُن', transliteration: 'udhun' },
  { id: 'nose', category: 'body', english: 'Nose', arabic: 'أَنْف', transliteration: 'anf' },
  { id: 'mouth', category: 'body', english: 'Mouth', arabic: 'فَم', transliteration: 'fam' },
  { id: 'head', category: 'body', english: 'Head', arabic: 'رَأْس', transliteration: 'ra\'s' },
  { id: 'foot', category: 'body', english: 'Foot', arabic: 'قَدَم', transliteration: 'qadam' },
  { id: 'heart', category: 'body', english: 'Heart', arabic: 'قَلْب', transliteration: 'qalb' },

  // Colours
  { id: 'red', category: 'colours', english: 'Red', arabic: 'أَحْمَر', transliteration: 'ahmar' },
  { id: 'blue', category: 'colours', english: 'Blue', arabic: 'أَزْرَق', transliteration: 'azraq' },
  { id: 'green', category: 'colours', english: 'Green', arabic: 'أَخْضَر', transliteration: 'akhdar' },
  { id: 'yellow', category: 'colours', english: 'Yellow', arabic: 'أَصْفَر', transliteration: 'asfar' },
  { id: 'white', category: 'colours', english: 'White', arabic: 'أَبْيَض', transliteration: 'abyad' },
  { id: 'black', category: 'colours', english: 'Black', arabic: 'أَسْوَد', transliteration: 'aswad' },

  // Numbers
  { id: 'one', category: 'numbers', english: 'One', arabic: 'وَاحِد', transliteration: 'waahid' },
  { id: 'two', category: 'numbers', english: 'Two', arabic: 'اِثْنَان', transliteration: 'ithnaan' },
  { id: 'three', category: 'numbers', english: 'Three', arabic: 'ثَلَاثَة', transliteration: 'thalaathah' },
  { id: 'four', category: 'numbers', english: 'Four', arabic: 'أَرْبَعَة', transliteration: 'arba\'ah' },
  { id: 'five', category: 'numbers', english: 'Five', arabic: 'خَمْسَة', transliteration: 'khamsah' },
  { id: 'ten', category: 'numbers', english: 'Ten', arabic: 'عَشَرَة', transliteration: 'asharah' },
];

export type DictionaryQuizQuestion = {
  id: string;
  word: ArabicWord;
  prompt: string;
  /** Show Arabic; pick English (or reverse). */
  mode: 'ar-to-en' | 'en-to-ar';
  options: string[];
  correctIndex: number;
};

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function wordsInCategory(category: ArabicWordCategory | 'all'): ArabicWord[] {
  if (category === 'all') return ARABIC_DICTIONARY;
  return ARABIC_DICTIONARY.filter((w) => w.category === category);
}

/** Practice quiz: English meaning OR Arabic form. */
export function buildDictionaryQuiz(
  category: ArabicWordCategory | 'all' = 'all',
  count = 8
): DictionaryQuizQuestion[] {
  const pool = wordsInCategory(category);
  const chosen = shuffle(pool).slice(0, Math.min(count, pool.length));

  return chosen.map((word) => {
    const mode: 'ar-to-en' | 'en-to-ar' = Math.random() > 0.5 ? 'ar-to-en' : 'en-to-ar';
    if (mode === 'ar-to-en') {
      const wrong = shuffle(pool.filter((w) => w.id !== word.id))
        .slice(0, 3)
        .map((w) => w.english);
      const options = shuffle([word.english, ...wrong]);
      return {
        id: `q-${word.id}-ar`,
        word,
        prompt: 'What does this Arabic word mean in English?',
        mode,
        options,
        correctIndex: options.indexOf(word.english),
      };
    }
    const wrong = shuffle(pool.filter((w) => w.id !== word.id))
      .slice(0, 3)
      .map((w) => w.arabic);
    const options = shuffle([word.arabic, ...wrong]);
    return {
      id: `q-${word.id}-en`,
      word,
      prompt: `Which Arabic word means "${word.english}"?`,
      mode,
      options,
      correctIndex: options.indexOf(word.arabic),
    };
  });
}
