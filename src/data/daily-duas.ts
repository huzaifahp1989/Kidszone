export type DailyDua = {
  key: string;
  title: string;
  arabic: string;
  transliteration: string;
  translation: string;
  reference: string;
  points: number;
};

export type DailyDhikrCounter = {
  key: string;
  label: string;
  arabic: string;
  translation: string;
  goal: number;
  pointsPerGoal: number;
  emoji: string;
};

const MORNING_DUAS: DailyDua[] = [
  {
    key: 'morning-1-bismillah-waking',
    title: 'Dua when waking up',
    arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
    transliteration: 'Alhamdu lillahil-ladhi ahyana ba’da ma amatana wa ilayhin-nushur',
    translation:
      'All praise is for Allah who gave us life after having taken it from us, and to Him is the resurrection.',
    reference: 'Sahih al-Bukhari 6312',
    points: 3,
  },
  {
    key: 'morning-2-intention-day',
    title: 'Intention for the day',
    arabic: 'اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ الْمَصِيرُ',
    transliteration: 'Allahumma bika asbahna wa bika amsayna wa bika nahya wa bika namutu wa ilaykal-masir',
    translation:
      'O Allah, by You we enter the morning, by You we enter the evening, by You we live, by You we die, and to You is the final return.',
    reference: 'Tirmidhi',
    points: 2,
  },
  {
    key: 'morning-3-ayatul-kursi',
    title: 'Ayat al-Kursi (protection)',
    arabic:
      'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ',
    transliteration: 'Allahu la ilaha illa Huwal-Hayyul-Qayyum…',
    translation:
      'Allah — there is no god except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep…',
    reference: "Qur'an 2:255",
    points: 5,
  },
  {
    key: 'morning-4-salat-ala-nabi',
    title: 'Salat & Salam upon the Prophet ﷺ',
    arabic:
      'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، وَبَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ فِي الْعَالَمِينَ',
    transliteration: 'Allahumma salli ala Muhammad…',
    translation: 'O Allah, send blessings and peace upon Prophet Muhammad ﷺ and his family.',
    reference: 'Sahih Muslim',
    points: 2,
  },
];

const EVENING_DUAS: DailyDua[] = [
  {
    key: 'evening-1-entering-evening',
    title: 'Dua entering the evening',
    arabic:
      'اللَّهُمَّ بِكَ أَمْسَيْنَا وَبِكَ أَصْبَحْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ الْمَصِيرُ',
    transliteration: 'Allahumma bika amsayna wa bika asbahna wa bika nahya wa bika namutu wa ilaykal-masir',
    translation:
      'O Allah, by You we enter the evening, by You we enter the morning, by You we live, by You we die, and to You is the final return.',
    reference: 'Tirmidhi',
    points: 2,
  },
  {
    key: 'evening-2-astaghfirullah',
    title: 'Asking forgiveness (x3)',
    arabic: 'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيَّ الْقَيُّومَ وَأَتُوبُ إِلَيْهِ',
    transliteration: 'Astaghfirullahal-’Azeem alladhi la ilaha illa Huwal-Hayyul-Qayyum wa atubu ilayh',
    translation: 'I seek forgiveness from Allah Almighty, there is no god but Him, the Ever-Living, and I repent to Him.',
    reference: 'Abu Dawud, Tirmidhi',
    points: 3,
  },
  {
    key: 'evening-3-surah-ikhlas-muawwidhat',
    title: 'Qul: Surah Al-Ikhlas, Al-Falaq, An-Nas',
    arabic:
      'قُلْ هُوَ اللَّهُ أَحَدٌ — قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ — قُلْ أَعُوذُ بِرَبِّ النَّاسِ',
    transliteration: 'Qul Huwallahu Ahad… Qul a’udhu bi Rabbil-Falaq… Qul a’udhu bi Rabbin-Nas…',
    translation:
      'Say: “He is Allah, the One…” and seek refuge in Allah from evil: the three Quls.',
    reference: "Qur'an 112, 113, 114",
    points: 5,
  },
  {
    key: 'evening-4-sleep-sunnah',
    title: 'Dua before sleeping',
    arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    transliteration: 'Bismika Allahumma amutu wa ahya',
    translation: 'In Your name, O Allah, I die and I live.',
    reference: 'Sahih al-Bukhari 6319',
    points: 2,
  },
];

export const DAILY_DHIKR_COUNTERS: DailyDhikrCounter[] = [
  {
    key: 'subhanallah-33',
    label: 'SubhanAllah',
    arabic: 'سُبْحَانَ اللَّهِ',
    translation: 'Glory be to Allah',
    goal: 33,
    pointsPerGoal: 2,
    emoji: '✨',
  },
  {
    key: 'alhamdulillah-33',
    label: 'Alhamdulillah',
    arabic: 'الْحَمْدُ لِلَّهِ',
    translation: 'All praise is for Allah',
    goal: 33,
    pointsPerGoal: 2,
    emoji: '🌸',
  },
  {
    key: 'allahu-akbar-34',
    label: 'Allahu Akbar',
    arabic: 'اللَّهُ أَكْبَرُ',
    translation: 'Allah is the Greatest',
    goal: 34,
    pointsPerGoal: 2,
    emoji: '💙',
  },
  {
    key: 'la-ilaha-illallah-100',
    label: 'La ilaha illa Allah',
    arabic: 'لَا إِلَٰهَ إِلَّا اللَّهُ',
    translation: 'There is no god except Allah',
    goal: 100,
    pointsPerGoal: 5,
    emoji: '🤍',
  },
];

/** Morning or evening based on the current local hour. */
export function getDefaultDuaSlot(date: Date = new Date()): 'morning' | 'evening' {
  const hour = date.getHours();
  return hour < 16 ? 'morning' : 'evening';
}

export function getDuasForSlot(slot: 'morning' | 'evening'): DailyDua[] {
  return slot === 'morning' ? MORNING_DUAS : EVENING_DUAS;
}

/** Pick a single "daily feature" dua per (date, slot) deterministically, so the page doesn't shuffle every render. */
export function pickDailyDuaFor(slot: 'morning' | 'evening', date: Date = new Date()): DailyDua {
  const pool = getDuasForSlot(slot);
  const seed = `${date.toISOString().slice(0, 10)}-${slot}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const index = ((hash >>> 0) % pool.length) >>> 0;
  return pool[index];
}
