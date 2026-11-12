/**
 * "Duas & Names" learning library.
 *
 * Contains the 99 beautiful names of Allah plus a curated set of well-known duas
 * from the Quran and the authentic Hadith, each with Arabic, transliteration,
 * English translation and its reference. Categories end with a short quiz so kids
 * can learn (and earn points) the same way as the Learn Surah section.
 */

export type AllahNameEntry = {
  number: number;
  arabic: string;
  transliteration: string;
  meaning: string;
};

export type DuaEntry = {
  key: string;
  title: string;
  arabic: string;
  transliteration: string;
  translation: string;
  /** Where the dua comes from — a Quran ayah or a hadith collection. */
  reference: string;
};

export type DuaQuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
};

export type DuaCategory = {
  slug: string;
  title: string;
  emoji: string;
  description: string;
  source: 'Quran' | 'Hadith' | 'Quran & Hadith';
  duas: DuaEntry[];
  quizQuestions: DuaQuizQuestion[];
};

/** The 99 beautiful names of Allah, in the well-known order. */
export const ALLAH_99_NAMES: AllahNameEntry[] = [
  { number: 1, arabic: 'الرَّحْمَٰنُ', transliteration: 'Ar-Rahman', meaning: 'The Most Compassionate' },
  { number: 2, arabic: 'الرَّحِيمُ', transliteration: 'Ar-Raheem', meaning: 'The Most Merciful' },
  { number: 3, arabic: 'الْمَلِكُ', transliteration: 'Al-Malik', meaning: 'The King, The Sovereign' },
  { number: 4, arabic: 'الْقُدُّوسُ', transliteration: 'Al-Quddus', meaning: 'The Most Holy, The Pure' },
  { number: 5, arabic: 'السَّلَامُ', transliteration: 'As-Salam', meaning: 'The Source of Peace' },
  { number: 6, arabic: 'الْمُؤْمِنُ', transliteration: "Al-Mu'min", meaning: 'The Giver of Faith and Security' },
  { number: 7, arabic: 'الْمُهَيْمِنُ', transliteration: 'Al-Muhaymin', meaning: 'The Guardian, The Protector' },
  { number: 8, arabic: 'الْعَزِيزُ', transliteration: "Al-'Azeez", meaning: 'The Almighty, The Mighty' },
  { number: 9, arabic: 'الْجَبَّارُ', transliteration: 'Al-Jabbar', meaning: 'The Compeller, The Restorer' },
  { number: 10, arabic: 'الْمُتَكَبِّرُ', transliteration: 'Al-Mutakabbir', meaning: 'The Supreme, The Majestic' },
  { number: 11, arabic: 'الْخَالِقُ', transliteration: 'Al-Khaliq', meaning: 'The Creator' },
  { number: 12, arabic: 'الْبَارِئُ', transliteration: 'Al-Bari', meaning: 'The Originator, The Evolver' },
  { number: 13, arabic: 'الْمُصَوِّرُ', transliteration: 'Al-Musawwir', meaning: 'The Fashioner, The Shaper' },
  { number: 14, arabic: 'الْغَفَّارُ', transliteration: 'Al-Ghaffar', meaning: 'The Oft-Forgiving' },
  { number: 15, arabic: 'الْقَهَّارُ', transliteration: 'Al-Qahhar', meaning: 'The Subduer, The All-Prevailing' },
  { number: 16, arabic: 'الْوَهَّابُ', transliteration: 'Al-Wahhab', meaning: 'The Bestower of Gifts' },
  { number: 17, arabic: 'الرَّزَّاقُ', transliteration: 'Ar-Razzaq', meaning: 'The Provider' },
  { number: 18, arabic: 'الْفَتَّاحُ', transliteration: 'Al-Fattah', meaning: 'The Opener, The Granter of Victory' },
  { number: 19, arabic: 'الْعَلِيمُ', transliteration: 'Al-Aleem', meaning: 'The All-Knowing' },
  { number: 20, arabic: 'الْقَابِضُ', transliteration: 'Al-Qabid', meaning: 'The Withholder, The Restrainer' },
  { number: 21, arabic: 'الْبَاسِطُ', transliteration: 'Al-Basit', meaning: 'The Extender, The Expander' },
  { number: 22, arabic: 'الْخَافِضُ', transliteration: 'Al-Khafid', meaning: 'The Abaser, The Humbler' },
  { number: 23, arabic: 'الرَّافِعُ', transliteration: "Ar-Rafi'", meaning: 'The Exalter, The Uplifter' },
  { number: 24, arabic: 'الْمُعِزُّ', transliteration: "Al-Mu'izz", meaning: 'The Giver of Honour' },
  { number: 25, arabic: 'الْمُذِلُّ', transliteration: 'Al-Mudhill', meaning: 'The Giver of Dishonour' },
  { number: 26, arabic: 'السَّمِيعُ', transliteration: 'As-Samee', meaning: 'The All-Hearing' },
  { number: 27, arabic: 'الْبَصِيرُ', transliteration: 'Al-Baseer', meaning: 'The All-Seeing' },
  { number: 28, arabic: 'الْحَكَمُ', transliteration: 'Al-Hakam', meaning: 'The Judge, The Arbitrator' },
  { number: 29, arabic: 'الْعَدْلُ', transliteration: "Al-'Adl", meaning: 'The Utterly Just' },
  { number: 30, arabic: 'اللَّطِيفُ', transliteration: 'Al-Lateef', meaning: 'The Subtle, The Most Gentle' },
  { number: 31, arabic: 'الْخَبِيرُ', transliteration: 'Al-Khabeer', meaning: 'The All-Aware' },
  { number: 32, arabic: 'الْحَلِيمُ', transliteration: 'Al-Haleem', meaning: 'The Most Forbearing' },
  { number: 33, arabic: 'الْعَظِيمُ', transliteration: "Al-'Azeem", meaning: 'The Magnificent, The Great' },
  { number: 34, arabic: 'الْغَفُورُ', transliteration: 'Al-Ghafoor', meaning: 'The Great Forgiver' },
  { number: 35, arabic: 'الشَّكُورُ', transliteration: 'Ash-Shakoor', meaning: 'The Most Appreciative' },
  { number: 36, arabic: 'الْعَلِيُّ', transliteration: "Al-'Alee", meaning: 'The Most High' },
  { number: 37, arabic: 'الْكَبِيرُ', transliteration: 'Al-Kabeer', meaning: 'The Most Great' },
  { number: 38, arabic: 'الْحَفِيظُ', transliteration: 'Al-Hafeez', meaning: 'The Preserver, The Guardian' },
  { number: 39, arabic: 'الْمُقِيتُ', transliteration: 'Al-Muqeet', meaning: 'The Sustainer, The Nourisher' },
  { number: 40, arabic: 'الْحَسِيبُ', transliteration: 'Al-Haseeb', meaning: 'The Reckoner, The Accounter' },
  { number: 41, arabic: 'الْجَلِيلُ', transliteration: 'Al-Jaleel', meaning: 'The Majestic, The Mighty' },
  { number: 42, arabic: 'الْكَرِيمُ', transliteration: 'Al-Kareem', meaning: 'The Most Generous' },
  { number: 43, arabic: 'الرَّقِيبُ', transliteration: 'Ar-Raqeeb', meaning: 'The Watchful, The Ever-Watchful' },
  { number: 44, arabic: 'الْمُجِيبُ', transliteration: 'Al-Mujeeb', meaning: 'The Responsive, The Answerer' },
  { number: 45, arabic: 'الْوَاسِعُ', transliteration: "Al-Wasi'", meaning: 'The All-Encompassing' },
  { number: 46, arabic: 'الْحَكِيمُ', transliteration: 'Al-Hakeem', meaning: 'The Most Wise' },
  { number: 47, arabic: 'الْوَدُودُ', transliteration: 'Al-Wadood', meaning: 'The Most Loving' },
  { number: 48, arabic: 'الْمَجِيدُ', transliteration: 'Al-Majeed', meaning: 'The Glorious' },
  { number: 49, arabic: 'الْبَاعِثُ', transliteration: "Al-Ba'ith", meaning: 'The Resurrector, The Raiser' },
  { number: 50, arabic: 'الشَّهِيدُ', transliteration: 'Ash-Shaheed', meaning: 'The Witness' },
  { number: 51, arabic: 'الْحَقُّ', transliteration: 'Al-Haqq', meaning: 'The Absolute Truth' },
  { number: 52, arabic: 'الْوَكِيلُ', transliteration: 'Al-Wakeel', meaning: 'The Trustee, The Disposer of Affairs' },
  { number: 53, arabic: 'الْقَوِيُّ', transliteration: 'Al-Qawiyy', meaning: 'The Most Strong' },
  { number: 54, arabic: 'الْمَتِينُ', transliteration: 'Al-Mateen', meaning: 'The Firm, The Steadfast' },
  { number: 55, arabic: 'الْوَلِيُّ', transliteration: 'Al-Waliyy', meaning: 'The Protecting Friend' },
  { number: 56, arabic: 'الْحَمِيدُ', transliteration: 'Al-Hameed', meaning: 'The Praiseworthy' },
  { number: 57, arabic: 'الْمُحْصِي', transliteration: 'Al-Muhsee', meaning: 'The Reckoner, The Enumerator' },
  { number: 58, arabic: 'الْمُبْدِئُ', transliteration: 'Al-Mubdi', meaning: 'The Originator, The Starter' },
  { number: 59, arabic: 'الْمُعِيدُ', transliteration: "Al-Mu'eed", meaning: 'The Restorer, The Reproducer' },
  { number: 60, arabic: 'الْمُحْيِي', transliteration: 'Al-Muhyee', meaning: 'The Giver of Life' },
  { number: 61, arabic: 'الْمُمِيتُ', transliteration: 'Al-Mumeet', meaning: 'The Bringer of Death' },
  { number: 62, arabic: 'الْحَيُّ', transliteration: 'Al-Hayy', meaning: 'The Ever-Living' },
  { number: 63, arabic: 'الْقَيُّومُ', transliteration: 'Al-Qayyum', meaning: 'The Self-Subsisting Sustainer' },
  { number: 64, arabic: 'الْوَاجِدُ', transliteration: 'Al-Wajid', meaning: 'The Perceiver, The Finder' },
  { number: 65, arabic: 'الْمَاجِدُ', transliteration: 'Al-Majid', meaning: 'The Noble, The Illustrious' },
  { number: 66, arabic: 'الْوَاحِدُ', transliteration: 'Al-Wahid', meaning: 'The One, The Unique' },
  { number: 67, arabic: 'الْأَحَدُ', transliteration: 'Al-Ahad', meaning: 'The One, The Indivisible' },
  { number: 68, arabic: 'الصَّمَدُ', transliteration: 'As-Samad', meaning: 'The Eternal, The Self-Sufficient' },
  { number: 69, arabic: 'الْقَادِرُ', transliteration: 'Al-Qadir', meaning: 'The All-Capable' },
  { number: 70, arabic: 'الْمُقْتَدِرُ', transliteration: 'Al-Muqtadir', meaning: 'The Omnipotent Determiner' },
  { number: 71, arabic: 'الْمُقَدِّمُ', transliteration: 'Al-Muqaddim', meaning: 'The Expediter, The Advancer' },
  { number: 72, arabic: 'الْمُؤَخِّرُ', transliteration: "Al-Mu'akhkhir", meaning: 'The Delayer' },
  { number: 73, arabic: 'الْأَوَّلُ', transliteration: 'Al-Awwal', meaning: 'The First' },
  { number: 74, arabic: 'الْآخِرُ', transliteration: 'Al-Akhir', meaning: 'The Last' },
  { number: 75, arabic: 'الظَّاهِرُ', transliteration: 'Az-Zahir', meaning: 'The Manifest, The Evident' },
  { number: 76, arabic: 'الْبَاطِنُ', transliteration: 'Al-Batin', meaning: 'The Hidden, The Unseen' },
  { number: 77, arabic: 'الْوَالِي', transliteration: 'Al-Walee', meaning: 'The Governor, The Protecting Friend' },
  { number: 78, arabic: 'الْمُتَعَالِي', transliteration: "Al-Muta'alee", meaning: 'The Most Exalted' },
  { number: 79, arabic: 'الْبَرُّ', transliteration: 'Al-Barr', meaning: 'The Source of All Goodness' },
  { number: 80, arabic: 'التَّوَّابُ', transliteration: 'At-Tawwab', meaning: 'The Accepter of Repentance' },
  { number: 81, arabic: 'الْمُنْتَقِمُ', transliteration: 'Al-Muntaqim', meaning: 'The Avenger' },
  { number: 82, arabic: 'الْعَفُوُّ', transliteration: "Al-'Afuww", meaning: 'The Pardoner' },
  { number: 83, arabic: 'الرَّءُوفُ', transliteration: "Ar-Ra'oof", meaning: 'The Most Kind' },
  { number: 84, arabic: 'مَالِكُ الْمُلْكِ', transliteration: 'Malik-ul-Mulk', meaning: 'Master of the Kingdom' },
  { number: 85, arabic: 'ذُو الْجَلَالِ وَالْإِكْرَامِ', transliteration: 'Dhul-Jalali wal-Ikram', meaning: 'Lord of Majesty and Generosity' },
  { number: 86, arabic: 'الْمُقْسِطُ', transliteration: 'Al-Muqsit', meaning: 'The Equitable, The Just' },
  { number: 87, arabic: 'الْجَامِعُ', transliteration: "Al-Jami'", meaning: 'The Gatherer, The Uniter' },
  { number: 88, arabic: 'الْغَنِيُّ', transliteration: 'Al-Ghaniyy', meaning: 'The Self-Sufficient' },
  { number: 89, arabic: 'الْمُغْنِي', transliteration: 'Al-Mughni', meaning: 'The Enricher' },
  { number: 90, arabic: 'الْمَانِعُ', transliteration: "Al-Mani'", meaning: 'The Preventer of Harm' },
  { number: 91, arabic: 'الضَّارُّ', transliteration: 'Ad-Darr', meaning: 'The Creator of Harm' },
  { number: 92, arabic: 'النَّافِعُ', transliteration: 'An-Nafi', meaning: 'The Bestower of Benefit' },
  { number: 93, arabic: 'النُّورُ', transliteration: 'An-Nur', meaning: 'The Light' },
  { number: 94, arabic: 'الْهَادِي', transliteration: 'Al-Hadee', meaning: 'The Guide' },
  { number: 95, arabic: 'الْبَدِيعُ', transliteration: 'Al-Badee', meaning: 'The Incomparable Originator' },
  { number: 96, arabic: 'الْبَاقِي', transliteration: 'Al-Baqi', meaning: 'The Everlasting' },
  { number: 97, arabic: 'الْوَارِثُ', transliteration: 'Al-Warith', meaning: 'The Inheritor of All' },
  { number: 98, arabic: 'الرَّشِيدُ', transliteration: 'Ar-Rasheed', meaning: 'The Guide to the Right Path' },
  { number: 99, arabic: 'الصَّبُورُ', transliteration: 'As-Saboor', meaning: 'The Most Patient' },
];

/** Quiz for the 99 Names learning page. */
export const NAMES_QUIZ_QUESTIONS: DuaQuizQuestion[] = [
  {
    id: 'names-1',
    question: 'How many beautiful names of Allah are listed in the well-known hadith?',
    options: ['50', '99', '12', '114'],
    correctAnswer: 1,
    explanation:
      'The Prophet ﷺ said that Allah has ninety-nine names; whoever learns and acts upon them enters Paradise.',
  },
  {
    id: 'names-2',
    question: 'What does the name “Ar-Rahman” mean?',
    options: ['The Most Compassionate', 'The King', 'The All-Hearing', 'The Light'],
    correctAnswer: 0,
    explanation: 'Ar-Rahman describes Allah’s vast mercy that covers all of creation.',
  },
  {
    id: 'names-3',
    question: 'Which name means “The All-Hearing”?',
    options: ['Al-Baseer', 'As-Samee', 'Al-Aleem', 'Al-Khabeer'],
    correctAnswer: 1,
    explanation: 'As-Samee means Allah hears every sound — even the quietest whisper.',
  },
  {
    id: 'names-4',
    question: 'Which name means “The Most Patient”?',
    options: ['As-Saboor', 'Al-Haleem', 'As-Samad', 'Al-Qadir'],
    correctAnswer: 0,
    explanation: 'As-Saboor describes Allah’s perfect patience — He never rushes His punishment.',
  },
  {
    id: 'names-5',
    question: 'Which name means “The Provider”?',
    options: ['Ar-Razzaq', 'Al-Malik', 'Al-Fattah', 'Al-Wahhab'],
    correctAnswer: 0,
    explanation: 'Ar-Razzaq is the One who provides food, drink and everything we need.',
  },
];

/** All dua categories shown on the hub, in display order. */
export const DUA_CATEGORIES: DuaCategory[] = [
  {
    slug: 'quran-duas',
    title: 'Duas from the Quran',
    emoji: '📗',
    description: 'Beautiful supplications that Allah Himself taught us in the Quran.',
    source: 'Quran',
    duas: [
      {
        key: 'quran-1',
        title: 'Good in this world and the Hereafter',
        arabic:
          'رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ',
        transliteration: 'Rabbana atina fid-dunya hasanatan wa fil-akhirati hasanatan wa qina ‘adhaban-nar',
        translation:
          'Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire.',
        reference: "Qur'an 2:201",
      },
      {
        key: 'quran-2',
        title: 'Dua for more knowledge',
        arabic: 'رَبِّ زِدْنِي عِلْمًا',
        transliteration: 'Rabbi zidni ‘ilma',
        translation: 'My Lord, increase me in knowledge.',
        reference: "Qur'an 20:114",
      },
      {
        key: 'quran-3',
        title: "Musa's dua for confidence and ease",
        arabic: 'رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي',
        transliteration: 'Rabbish-rah li sadri wa yassir li amri',
        translation:
          'My Lord, expand my chest for me and make my task easy for me.',
        reference: "Qur'an 20:25-26",
      },
      {
        key: 'quran-4',
        title: 'Dua for forgiveness of mistakes',
        arabic:
          'رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا',
        transliteration: "Rabbana la tu'akhidhna in nasina aw akhta'na",
        translation:
          'Our Lord, do not take us to task if we forget or make a mistake.',
        reference: "Qur'an 2:286",
      },
      {
        key: 'quran-5',
        title: "Yunus's dua from inside the whale",
        arabic: 'لَا إِلَٰهَ إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ الظَّالِمِينَ',
        transliteration: 'La ilaha illa anta subhanaka inni kuntu minaz-zalimin',
        translation:
          'There is no god except You; glory be to You. Indeed, I have been of the wrongdoers.',
        reference: "Qur'an 21:87",
      },
      {
        key: 'quran-6',
        title: 'Dua for our parents',
        arabic: 'رَّبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا',
        transliteration: 'Rabbir hamhuma kama rabbayani saghira',
        translation:
          'My Lord, have mercy upon them (my parents) as they brought me up when I was small.',
        reference: "Qur'an 17:24",
      },
      {
        key: 'quran-7',
        title: 'Allah is enough for us',
        arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
        transliteration: "Hasbunallahu wa ni'mal-wakeel",
        translation:
          'Allah is sufficient for us, and He is the best Disposer of affairs.',
        reference: "Qur'an 3:173",
      },
    ],
    quizQuestions: [
      {
        id: 'quran-dua-1',
        question: 'Which Quranic dua asks for good in this world and in the Hereafter?',
        options: [
          'Rabbana atina fid-dunya hasanah…',
          'Rabbi zidni ilma',
          'Hasbunallahu wa ni’mal-wakeel',
          'Rabbir hamhuma kama rabbayani saghira',
        ],
        correctAnswer: 0,
        explanation: 'This is one of the most complete duas in the Quran (2:201).',
      },
      {
        id: 'quran-dua-2',
        question: 'What does “Rabbi zidni ilma” mean?',
        options: [
          'My Lord, increase me in knowledge',
          'My Lord, forgive me',
          'My Lord, give me wealth',
          'My Lord, protect my family',
        ],
        correctAnswer: 0,
        explanation: 'It is found in Surah Ta-Ha (20:114).',
      },
      {
        id: 'quran-dua-3',
        question: 'Which dua did Prophet Yunus (as) call with from inside the whale?',
        options: [
          'La ilaha illa anta subhanaka inni kuntu minaz-zalimin',
          'Rabbish-rah li sadri',
          'Rabbana la tu’akhidhna',
          'Hasbunallahu wa ni’mal-wakeel',
        ],
        correctAnswer: 0,
        explanation: 'Allah saved him after he called with this dua (21:87).',
      },
      {
        id: 'quran-dua-4',
        question: 'What does “Hasbunallahu wa ni’mal-wakeel” mean?',
        options: [
          'Allah is sufficient for us, and He is the best Disposer of affairs',
          'All praise is for Allah',
          'There is no god except Allah',
          'My Lord, have mercy on my parents',
        ],
        correctAnswer: 0,
        explanation: 'The believers said this when they were told an army was gathering (3:173).',
      },
      {
        id: 'quran-dua-5',
        question: 'Which dua asks Allah to have mercy on our parents?',
        options: [
          'Rabbir hamhuma kama rabbayani saghira',
          'Rabbi zidni ilma',
          'Rabbana atina fid-dunya hasanah',
          'Rabbish-rah li sadri',
        ],
        correctAnswer: 0,
        explanation: 'It is found in Surah Al-Isra (17:24).',
      },
    ],
  },
  {
    slug: 'hadith-duas',
    title: 'Duas from the Hadith',
    emoji: '📜',
    description: 'Duas the Prophet ﷺ taught us — with where they are recorded.',
    source: 'Hadith',
    duas: [
      {
        key: 'hadith-1',
        title: 'Dua for anxiety and sadness',
        arabic:
          'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ',
        transliteration:
          'Allahumma inni a‘udhu bika minal-hammi wal-hazan, wal-‘ajzi wal-kasal, wal-bukhli wal-jubn, wa dala‘id-dayni wa ghalabatir-rijal',
        translation:
          'O Allah, I seek refuge in You from worry and sadness, from weakness and laziness, from miserliness and cowardice, from the burden of debt and from being overpowered by others.',
        reference: 'Sahih al-Bukhari 6369',
      },
      {
        key: 'hadith-2',
        title: 'Dua at times of distress',
        arabic:
          'لَا إِلَٰهَ إِلَّا اللَّهُ الْعَظِيمُ الْحَلِيمُ، لَا إِلَٰهَ إِلَّا اللَّهُ رَبُّ الْعَرْشِ الْعَظِيمِ، لَا إِلَٰهَ إِلَّا اللَّهُ رَبُّ السَّمَاوَاتِ وَرَبُّ الْأَرْضِ وَرَبُّ الْعَرْشِ الْكَرِيمِ',
        transliteration:
          "La ilaha illallahul-'Azimul-Halim, la ilaha illallahu Rabbul-'Arshil-'Azim, la ilaha illallahu Rabbus-samawati wa Rabbul-ardi wa Rabbul-'Arshil-Karim",
        translation:
          'There is no god but Allah, the Mighty, the Forbearing. There is no god but Allah, Lord of the Mighty Throne. There is no god but Allah, Lord of the heavens, Lord of the earth, and Lord of the noble Throne.',
        reference: 'Sahih al-Bukhari 6346; Sahih Muslim 2730',
      },
      {
        key: 'hadith-3',
        title: 'Dua for guidance and contentment',
        arabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْهُدَى وَالتُّقَى وَالْعَفَافَ وَالْغِنَى',
        transliteration: "Allahumma inni as'alukal-huda wat-tuqa wal-'afafa wal-ghina",
        translation:
          'O Allah, I ask You for guidance, piety, chastity and contentment.',
        reference: 'Sahih Muslim 2721',
      },
      {
        key: 'hadith-4',
        title: 'Dua when leaving the house',
        arabic:
          'بِسْمِ اللَّهِ، تَوَكَّلْتُ عَلَى اللَّهِ، وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
        transliteration:
          'Bismillah, tawakkaltu ‘alallah, wa la hawla wa la quwwata illa billah',
        translation:
          'In the name of Allah, I place my trust in Allah; there is no might and no power except with Allah.',
        reference: 'Abu Dawud 5095; Tirmidhi 3426',
      },
      {
        key: 'hadith-5',
        title: 'Dua asking by the names Al-Hayy and Al-Qayyum',
        arabic: 'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ',
        transliteration: 'Ya Hayyu ya Qayyumu bi rahmatika astaghith',
        translation:
          'O Ever-Living, O Sustainer, by Your mercy I seek relief.',
        reference: 'Tirmidhi 3524',
      },
      {
        key: 'hadith-6',
        title: 'Dua for blessings on the Prophet ﷺ',
        arabic:
          'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ',
        transliteration: "Allahumma salli 'ala Muhammadin wa 'ala ali Muhammad",
        translation:
          'O Allah, send Your blessings upon Muhammad and the family of Muhammad.',
        reference: 'Sahih Muslim 406',
      },
    ],
    quizQuestions: [
      {
        id: 'hadith-dua-1',
        question: 'Which dua is especially known for helping with worry and sadness?',
        options: [
          'Allahumma inni a’udhu bika minal-hammi wal-hazan…',
          'Rabbana atina fid-dunya hasanah',
          'Bismika Allahumma amutu wa ahya',
          'Subhanal-ladhi sakhkhara lana hadha',
        ],
        correctAnswer: 0,
        explanation: 'The Prophet ﷺ taught this dua for anxiety and sorrow.',
      },
      {
        id: 'hadith-dua-2',
        question: 'In “Ya Hayyu ya Qayyumu…”, which two names of Allah are we calling upon?',
        options: [
          'Al-Hayy (Ever-Living) and Al-Qayyum (Sustainer)',
          'Al-Malik and Al-Quddus',
          'As-Samee and Al-Baseer',
          'Al-Awwal and Al-Akhir',
        ],
        correctAnswer: 0,
        explanation: 'We ask by the names of the One who is always alive and sustains everything.',
      },
      {
        id: 'hadith-dua-3',
        question: 'What do we say when leaving the house?',
        options: [
          'Bismillah, tawakkaltu ‘alallah, wa la hawla wa la quwwata illa billah',
          'Alhamdulillahil-ladhi at‘amana',
          'La ilaha illa anta subhanaka',
          'Allahummaftah li abwaba rahmatik',
        ],
        correctAnswer: 0,
        explanation: 'This dua places our trust in Allah as we step out.',
      },
      {
        id: 'hadith-dua-4',
        question: 'What does “Allahumma salli ‘ala Muhammad” mean?',
        options: [
          'O Allah, send blessings upon Muhammad',
          'O Allah, forgive Muhammad',
          'O Allah, protect the Prophet’s family',
          'O Allah, guide us to the straight path',
        ],
        correctAnswer: 0,
        explanation: 'It is the well-known way of sending salawat (durood) upon the Prophet ﷺ.',
      },
      {
        id: 'hadith-dua-5',
        question: '“Allahumma rahmataka arju…” asks Allah for what?',
        options: [
          'Not to be left to ourselves even for a blink, and to fix all our affairs',
          'More money and toys',
          'A long life',
          'To win every game',
        ],
        correctAnswer: 0,
        explanation: 'We ask Allah to always keep us under His mercy (Abu Dawud 5090).',
      },
    ],
  },
  {
    slug: 'hardship',
    title: 'Duas for Difficulty & Sadness',
    emoji: '🤲',
    description: 'What to say when you feel worried, sad, scared or stuck.',
    source: 'Quran & Hadith',
    duas: [
      {
        key: 'hard-1',
        title: 'When you feel worried or sad',
        arabic:
          'اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ',
        transliteration:
          'Allahumma inni a‘udhu bika minal-hammi wal-hazan, wal-‘ajzi wal-kasal, wal-bukhli wal-jubn, wa dala‘id-dayni wa ghalabatir-rijal',
        translation:
          'O Allah, I seek refuge in You from worry and sadness, weakness and laziness, miserliness and cowardice, the burden of debt and from being overpowered by others.',
        reference: 'Sahih al-Bukhari 6369',
      },
      {
        key: 'hard-2',
        title: 'When something big is troubling you',
        arabic:
          'لَا إِلَٰهَ إِلَّا اللَّهُ الْعَظِيمُ الْحَلِيمُ، لَا إِلَٰهَ إِلَّا اللَّهُ رَبُّ الْعَرْشِ الْعَظِيمِ، لَا إِلَٰهَ إِلَّا اللَّهُ رَبُّ السَّمَاوَاتِ وَرَبُّ الْأَرْضِ وَرَبُّ الْعَرْشِ الْكَرِيمِ',
        transliteration:
          "La ilaha illallahul-'Azimul-Halim, la ilaha illallahu Rabbul-'Arshil-'Azim, la ilaha illallahu Rabbus-samawati wa Rabbul-ardi wa Rabbul-'Arshil-Karim",
        translation:
          'There is no god but Allah, the Mighty, the Forbearing; there is no god but Allah, Lord of the Mighty Throne; there is no god but Allah, Lord of the heavens and the earth, and Lord of the noble Throne.',
        reference: 'Sahih al-Bukhari 6346',
      },
      {
        key: 'hard-3',
        title: 'The dua of Yunus (as) when in difficulty',
        arabic: 'لَا إِلَٰهَ إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ الظَّالِمِينَ',
        transliteration: 'La ilaha illa anta subhanaka inni kuntu minaz-zalimin',
        translation:
          'There is no god except You; glory be to You. Indeed, I have been of the wrongdoers.',
        reference: "Qur'an 21:87",
      },
      {
        key: 'hard-4',
        title: 'When you feel you cannot cope',
        arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ',
        transliteration: "Hasbunallahu wa ni'mal-wakeel",
        translation: 'Allah is sufficient for us, and He is the best Disposer of affairs.',
        reference: "Qur'an 3:173",
      },
      {
        key: 'hard-5',
        title: 'Asking Allah never to leave us alone',
        arabic:
          'اللَّهُمَّ رَحْمَتَكَ أَرْجُو، فَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ، وَأَصْلِحْ لِي شَأْنِي كُلَّهُ، لَا إِلَٰهَ إِلَّا أَنتَ',
        transliteration:
          'Allahumma rahmataka arju fa la takilni ila nafsi tarfata ‘ayn, wa aslih li sha’ni kullah, la ilaha illa anta',
        translation:
          'O Allah, it is Your mercy that I hope for; do not leave me to myself even for the blink of an eye. Set right all my affairs. There is no god but You.',
        reference: 'Abu Dawud 5090',
      },
      {
        key: 'hard-6',
        title: 'A treasure of Paradise in hard times',
        arabic: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ',
        transliteration: 'La hawla wa la quwwata illa billah',
        translation: 'There is no might and no power except with Allah.',
        reference: 'Sahih al-Bukhari 6384; Sahih Muslim 2704',
      },
    ],
    quizQuestions: [
      {
        id: 'hard-1',
        question: 'Which dua should you say when you feel worried or sad?',
        options: [
          'Allahumma inni a’udhu bika minal-hammi wal-hazan…',
          'Bismillah',
          'Alhamdulillahil-ladhi at‘amana',
          'Subhana Rabbiyal ‘Azim',
        ],
        correctAnswer: 0,
        explanation: 'It asks Allah to free us from worry, sadness and weakness.',
      },
      {
        id: 'hard-2',
        question: 'Which dua did Prophet Yunus (as) call with from inside the whale?',
        options: [
          'La ilaha illa anta subhanaka inni kuntu minaz-zalimin',
          'Hasbunallahu wa ni’mal-wakeel',
          'La hawla wa la quwwata illa billah',
          'Rabbir hamhuma kama rabbayani saghira',
        ],
        correctAnswer: 0,
        explanation: 'Allah tells us He saved Yunus (as) after this dua (21:87).',
      },
      {
        id: 'hard-3',
        question: 'When we feel we cannot cope, what does the Quran teach us to say?',
        options: [
          'Hasbunallahu wa ni’mal-wakeel',
          'Alhamdulillah',
          'SubhanAllah',
          'Bismillah',
        ],
        correctAnswer: 0,
        explanation: 'It means “Allah is sufficient for us, and He is the best Disposer of affairs.”',
      },
      {
        id: 'hard-4',
        question: 'Which dhikr is described as a treasure of Paradise?',
        options: [
          'La hawla wa la quwwata illa billah',
          'La ilaha illallah',
          'Astaghfirullah',
          'Allahu Akbar',
        ],
        correctAnswer: 0,
        explanation: 'The Prophet ﷺ called it a treasure from the treasures of Paradise.',
      },
      {
        id: 'hard-5',
        question: 'What does “Allahumma rahmataka arju…” ask Allah for?',
        options: [
          'Not to be left to ourselves even for a blink, and to fix all our affairs',
          'More friends at school',
          'A bigger house',
          'To pass every test without studying',
        ],
        correctAnswer: 0,
        explanation: 'We rely completely on Allah’s mercy in every moment.',
      },
    ],
  },
  {
    slug: 'daily-life',
    title: 'Everyday Duas',
    emoji: '🏠',
    description: 'Short duas for eating, sleeping, the masjid, travelling and more.',
    source: 'Quran & Hadith',
    duas: [
      {
        key: 'daily-1',
        title: 'Before eating',
        arabic: 'بِسْمِ اللَّهِ',
        transliteration: 'Bismillah',
        translation: 'In the name of Allah.',
        reference: 'Abu Dawud 3767; Tirmidhi 1858',
      },
      {
        key: 'daily-2',
        title: 'After eating',
        arabic:
          'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مِنَ الْمُسْلِمِينَ',
        transliteration: "Alhamdulillahil-ladhi at'amana wa saqana wa ja'alana minal-muslimin",
        translation:
          'All praise is for Allah who fed us, gave us drink, and made us Muslims.',
        reference: 'Abu Dawud 3850; Tirmidhi 3457',
      },
      {
        key: 'daily-3',
        title: 'Before sleeping',
        arabic: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
        transliteration: 'Bismika Allahumma amutu wa ahya',
        translation: 'In Your name, O Allah, I die and I live.',
        reference: 'Sahih al-Bukhari 6324',
      },
      {
        key: 'daily-4',
        title: 'When waking up',
        arabic:
          'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ',
        transliteration: 'Alhamdulillahil-ladhi ahyana ba‘da ma amatana wa ilayhin-nushur',
        translation:
          'All praise is for Allah who gave us life after He had caused us to die, and to Him is the return.',
        reference: 'Sahih al-Bukhari 6312',
      },
      {
        key: 'daily-5',
        title: 'Entering the masjid',
        arabic: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
        transliteration: 'Allahummaftah li abwaba rahmatik',
        translation: 'O Allah, open for me the gates of Your mercy.',
        reference: 'Sahih Muslim 713',
      },
      {
        key: 'daily-6',
        title: 'When travelling',
        arabic:
          'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَٰذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَىٰ رَبِّنَا لَمُنقَلِبُونَ',
        transliteration:
          'Subhanal-ladhi sakhkhara lana hadha wa ma kunna lahu muqrinin, wa inna ila Rabbina lamunqalibun',
        translation:
          'Glory be to the One who has subjected this to us, though we could never have done so ourselves. And indeed, to our Lord we will surely return.',
        reference: "Qur'an 43:13-14",
      },
    ],
    quizQuestions: [
      {
        id: 'daily-1',
        question: 'What do we say before eating?',
        options: ['Bismillah', 'Alhamdulillah', 'Astaghfirullah', 'SubhanAllah'],
        correctAnswer: 0,
        explanation: 'Bismillah means “In the name of Allah.”',
      },
      {
        id: 'daily-2',
        question: 'What do we say after eating?',
        options: [
          'Alhamdulillahil-ladhi at‘amana wa saqana…',
          'Bismika Allahumma amutu wa ahya',
          'Allahummaftah li abwaba rahmatik',
          'Subhanal-ladhi sakhkhara lana hadha',
        ],
        correctAnswer: 0,
        explanation: 'We praise and thank Allah for feeding us and guiding us.',
      },
      {
        id: 'daily-3',
        question: 'What do we say before sleeping?',
        options: [
          'Bismika Allahumma amutu wa ahya',
          'Bismillah',
          'La hawla wa la quwwata illa billah',
          'Hasbunallahu wa ni’mal-wakeel',
        ],
        correctAnswer: 0,
        explanation: 'It means “In Your name, O Allah, I die and I live.”',
      },
      {
        id: 'daily-4',
        question: 'What do we say when entering the masjid?',
        options: [
          'Allahummaftah li abwaba rahmatik',
          'Alhamdulillahil-ladhi ahyana',
          'Bismillah, tawakkaltu ‘alallah',
          'Bismika Allahumma amutu wa ahya',
        ],
        correctAnswer: 0,
        explanation: 'We ask Allah to open the gates of His mercy.',
      },
      {
        id: 'daily-5',
        question: 'What dua do we make when travelling?',
        options: [
          'Subhanal-ladhi sakhkhara lana hadha…',
          'Rabbana atina fid-dunya hasanah',
          'Allahumma inni as’alukal-huda',
          'Bismillah',
        ],
        correctAnswer: 0,
        explanation: 'It thanks Allah for the transport He made available to us.',
      },
    ],
  },
  {
    slug: 'protection',
    title: 'Duas for Protection',
    emoji: '🛡️',
    description: 'Morning and evening duas that keep us safe, by Allah’s permission.',
    source: 'Quran & Hadith',
    duas: [
      {
        key: 'prot-1',
        title: 'Ayat al-Kursi — the greatest verse',
        arabic:
          'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ',
        transliteration: 'Allahu la ilaha illa Huwal-Hayyul-Qayyum…',
        translation:
          'Allah — there is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth…',
        reference: "Qur'an 2:255",
      },
      {
        key: 'prot-2',
        title: 'Morning and evening protection (say 3×)',
        arabic:
          'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
        transliteration:
          "Bismillahil-ladhi la yadurru ma'asmihi shay'un fil-ardi wa la fis-sama'i wa Huwas-Sami'ul-'Alim",
        translation:
          'In the name of Allah, with whose name nothing on earth or in the heavens can cause harm; and He is the All-Hearing, the All-Knowing.',
        reference: 'Abu Dawud 5088; Tirmidhi 3388',
      },
      {
        key: 'prot-3',
        title: 'The three Quls (Al-Ikhlas, Al-Falaq, An-Nas)',
        arabic: 'قُلْ هُوَ اللَّهُ أَحَدٌ — قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ — قُلْ أَعُوذُ بِرَبِّ النَّاسِ',
        transliteration: 'Qul Huwallahu Ahad… Qul a‘udhu bi Rabbil-Falaq… Qul a‘udhu bi Rabbin-Nas…',
        translation:
          '“Say: He is Allah, the One…” — “Say: I seek refuge in the Lord of the daybreak…” — “Say: I seek refuge in the Lord of mankind…”',
        reference: "Qur'an 112, 113, 114",
      },
      {
        key: 'prot-4',
        title: 'Seeking refuge from all harm',
        arabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
        transliteration: 'A‘udhu bikalimatillahit-tammati min sharri ma khalaq',
        translation:
          'I seek refuge in the perfect words of Allah from the evil of what He has created.',
        reference: 'Sahih Muslim 2708',
      },
      {
        key: 'prot-5',
        title: 'Entering the morning and evening',
        arabic:
          'اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ الْمَصِيرُ',
        transliteration:
          'Allahumma bika asbahna wa bika amsayna wa bika nahya wa bika namutu wa ilaykal-masir',
        translation:
          'O Allah, by You we enter the morning and by You we enter the evening; by You we live and by You we die, and to You is the final return.',
        reference: 'Tirmidhi 3391',
      },
      {
        key: 'prot-6',
        title: 'Sufficient is Allah (say 7× morning and evening)',
        arabic:
          'حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ',
        transliteration:
          "Hasbiyallahu la ilaha illa Huwa 'alayhi tawakkaltu wa Huwa Rabbul-'Arshil-'Azim",
        translation:
          'Allah is sufficient for me; there is no god except Him. In Him I put my trust, and He is the Lord of the Mighty Throne.',
        reference: 'Abu Dawud 5081',
      },
    ],
    quizQuestions: [
      {
        id: 'prot-1',
        question: 'Which verse is known as the greatest verse in the Quran for protection?',
        options: ['Ayat al-Kursi (2:255)', 'Al-Ikhlas', 'Al-Fatiha', 'Ayat of the cave'],
        correctAnswer: 0,
        explanation: 'Ayat al-Kursi is recited especially in the morning and evening.',
      },
      {
        id: 'prot-2',
        question: 'Which dua do we say three times in the morning and evening for protection?',
        options: [
          'Bismillahil-ladhi la yadurru ma‘asmihi shay’…',
          'Bismika Allahumma amutu wa ahya',
          'Rabbana atina fid-dunya hasanah',
          'La hawla wa la quwwata illa billah',
        ],
        correctAnswer: 0,
        explanation: 'It reminds us nothing can harm us without Allah’s permission.',
      },
      {
        id: 'prot-3',
        question: 'How many “Quls” do we recite for protection?',
        options: ['Three', 'One', 'Five', 'Seven'],
        correctAnswer: 0,
        explanation: 'Al-Ikhlas, Al-Falaq and An-Nas — the three Quls.',
      },
      {
        id: 'prot-4',
        question: '“A‘udhu bikalimatillahit-tammati min sharri ma khalaq” asks protection from what?',
        options: [
          'The evil of what Allah has created',
          'Bad weather only',
          'Loud noises',
          'Being late for school',
        ],
        correctAnswer: 0,
        explanation: 'It seeks refuge in Allah’s perfect words from all created harm.',
      },
      {
        id: 'prot-5',
        question: 'Which dua includes the words “wa ilaykal-masir”?',
        options: [
          'Allahumma bika asbahna…',
          'Bismillah',
          'Hasbunallahu wa ni’mal-wakeel',
          'Rabbir hamhuma',
        ],
        correctAnswer: 0,
        explanation: 'It ends “…and to You is the final return.”',
      },
    ],
  },
];

export function getDuaCategoryBySlug(slug: string): DuaCategory | undefined {
  return DUA_CATEGORIES.find((category) => category.slug === slug);
}

export function scoreDuaQuiz(
  questions: DuaQuizQuestion[],
  answers: number[]
): { correct: number; total: number; percent: number; passed: boolean } {
  const total = questions.length;
  let correct = 0;
  questions.forEach((question, index) => {
    if (answers[index] === question.correctAnswer) correct += 1;
  });
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  return { correct, total, percent, passed: percent >= 80 };
}

export type DuaProgress = Record<
  string,
  { completed: boolean; score: number; percent: number; completedAt: string }
>;

export function getDuaProgressKey(userId: string) {
  return `dua-library-progress-${userId}`;
}

export function readDuaProgress(userId: string): DuaProgress {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(getDuaProgressKey(userId));
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writeDuaProgress(userId: string, progress: DuaProgress) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getDuaProgressKey(userId), JSON.stringify(progress));
}
