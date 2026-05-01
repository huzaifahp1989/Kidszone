
export type AgeGroup = '6-8' | '9-11' | '12-14';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // Index of correct option
  explanation: string;
  category: string;
}

export interface HadithContent {
  id: string;
  text: string;
  source: string;
  reflectionOptions: {
    id: string;
    text: string;
    isCorrect: boolean; // "What you can learn" - arguably multiple could be correct, but usually one "best" answer or all correct?
                        // User asked for "options what the hadith is telling them", implying a quiz-like reflection.
  }[];
  explanation: string;
}

export interface QuranMatchPair {
  id: string;
  item1: string; // e.g., Arabic or Surah Name
  item2: string; // e.g., English or Meaning
  matchId: string; // To verify match
}

export interface QuranContextQuestion {
  id: string;
  ayatText: string; // Arabic or English translation
  surahReference: string;
  options: string[]; // "what the quran ayat is talking about"
  correctAnswer: number;
  explanation: string;
}

export const AGE_GROUPS: Record<AgeGroup, {
  quizzes: QuizQuestion[];
  hadiths: HadithContent[];
  quranMatch: QuranMatchPair[];
  quranContext: QuranContextQuestion[];
}> = {
  '6-8': {
    quizzes: [
      // Quran
      {
        id: 'q68-quran-1',
        question: 'What is the holy book of Muslims called?',
        options: ['The Bible', 'The Quran', 'The Torah', 'The Zabur'],
        correctAnswer: 1,
        explanation: 'The Quran is the holy book of Muslims, revealed by Allah.',
        category: 'Quran'
      },
      {
        id: 'q68-quran-2',
        question: 'Who sent us the Quran?',
        options: ['Prophet Muhammad ﷺ', 'Angel Jibreel', 'Allah', 'People'],
        correctAnswer: 2,
        explanation: 'Allah sent the Quran to guide all of humanity.',
        category: 'Quran'
      },
      {
        id: 'q68-quran-3',
        question: 'To which prophet was the Quran revealed?',
        options: ['Prophet Musa (AS)', 'Prophet Isa (AS)', 'Prophet Muhammad ﷺ', 'Prophet Ibrahim (AS)'],
        correctAnswer: 2,
        explanation: 'The Quran was revealed to Prophet Muhammad ﷺ.',
        category: 'Quran'
      },
      {
        id: 'q68-quran-4',
        question: 'In which month did the Quran start coming down?',
        options: ['Rajab', 'Sha\'ban', 'Ramadan', 'Muharram'],
        correctAnswer: 2,
        explanation: 'The Quran was first revealed in the month of Ramadan.',
        category: 'Quran'
      },
      {
        id: 'q68-quran-5',
        question: 'Is the Quran the word of people or the word of Allah?',
        options: ['Word of people', 'Word of Allah', 'Word of Angels', 'Word of Poets'],
        correctAnswer: 1,
        explanation: 'The Quran is the literal word of Allah.',
        category: 'Quran'
      },

      // Hadith
      {
        id: 'q68-hadith-1',
        question: 'What is a hadith?',
        options: ['A story from a book', 'Sayings and actions of Prophet Muhammad ﷺ', 'A poem', 'A history book'],
        correctAnswer: 1,
        explanation: 'Hadith refers to the sayings, actions, and approvals of Prophet Muhammad ﷺ.',
        category: 'Hadith'
      },
      {
        id: 'q68-hadith-2',
        question: 'Whose words and actions are written in hadith books?',
        options: ['Kings', 'Prophet Muhammad ﷺ', 'Poets', 'Scientists'],
        correctAnswer: 1,
        explanation: 'Hadith books contain the words and actions of Prophet Muhammad ﷺ.',
        category: 'Hadith'
      },
      {
        id: 'q68-hadith-3',
        question: 'Can we learn how to pray from hadith?',
        options: ['Yes', 'No', 'Maybe', 'Only sometimes'],
        correctAnswer: 0,
        explanation: 'Yes, the Prophet ﷺ taught us how to pray through his hadith.',
        category: 'Hadith'
      },
      {
        id: 'q68-hadith-4',
        question: 'Is it allowed to lie about the Prophet Muhammad ﷺ?',
        options: ['Yes, if it is funny', 'No, never', 'Maybe', 'Only a little'],
        correctAnswer: 1,
        explanation: 'It is a major sin to lie about the Prophet Muhammad ﷺ.',
        category: 'Hadith'
      },
      {
        id: 'q68-hadith-5',
        question: 'Is learning and teaching authentic hadith a good deed?',
        options: ['No', 'Yes, a very good deed', 'It does not matter', 'Only for adults'],
        correctAnswer: 1,
        explanation: 'Learning and teaching the Prophet\'s guidance is a great deed.',
        category: 'Hadith'
      },

      // Seerah
      {
        id: 'q68-seerah-1',
        question: 'What is the name of our Prophet?',
        options: ['Musa (AS)', 'Isa (AS)', 'Muhammad ﷺ', 'Nuh (AS)'],
        correctAnswer: 2,
        explanation: 'Our Prophet\'s name is Muhammad ﷺ.',
        category: 'Seerah'
      },
      {
        id: 'q68-seerah-2',
        question: 'In which city was Prophet Muhammad ﷺ born?',
        options: ['Madinah', 'Makkah', 'Jerusalem', 'Taif'],
        correctAnswer: 1,
        explanation: 'He was born in the holy city of Makkah.',
        category: 'Seerah'
      },
      {
        id: 'q68-seerah-3',
        question: 'In which city is he buried?',
        options: ['Makkah', 'Madinah', 'Cairo', 'Baghdad'],
        correctAnswer: 1,
        explanation: 'Prophet Muhammad ﷺ is buried in Madinah.',
        category: 'Seerah'
      },
      {
        id: 'q68-seerah-4',
        question: 'What special title did people give him before he became a prophet (because he was honest and trusted)?',
        options: ['Al-Amin (The Trustworthy)', 'The King', 'The Rich', 'The Strong'],
        correctAnswer: 0,
        explanation: 'He was called Al-Amin, meaning the Trustworthy one.',
        category: 'Seerah'
      },
      {
        id: 'q68-seerah-5',
        question: 'Should Muslims try to follow the character of Prophet Muhammad ﷺ?',
        options: ['No', 'Yes, he is our role model', 'Only sometimes', 'Only if we want to'],
        correctAnswer: 1,
        explanation: 'Yes, he is the best example for all Muslims to follow.',
        category: 'Seerah'
      },

      // Sahabah
      {
        id: 'q68-sahabah-1',
        question: 'Who are the Sahabah (companions) of the Prophet ﷺ?',
        options: ['His enemies', 'Muslims who met him and believed in him', 'People who lived before him', 'People who live now'],
        correctAnswer: 1,
        explanation: 'Sahabah are the Muslims who met the Prophet ﷺ and believed in him.',
        category: 'Sahabah'
      },
      {
        id: 'q68-sahabah-2',
        question: 'Why are the Sahabah special for us?',
        options: ['They were rich', 'They helped Islam and the Prophet ﷺ', 'They were tall', 'They lived in castles'],
        correctAnswer: 1,
        explanation: 'They loved Allah and helped the Prophet ﷺ spread Islam.',
        category: 'Sahabah'
      },
      {
        id: 'q68-sahabah-3',
        question: 'Who was the Prophet’s ﷺ best friend and the first caliph?',
        options: ['Umar (RA)', 'Abu Bakr (RA)', 'Ali (RA)', 'Uthman (RA)'],
        correctAnswer: 1,
        explanation: 'Abu Bakr (RA) was his best friend and the first Caliph.',
        category: 'Sahabah'
      },
      {
        id: 'q68-sahabah-4',
        question: 'Who was the first woman to accept Islam?',
        options: ['Aisha (RA)', 'Khadijah (RA)', 'Fatimah (RA)', 'Asiyah (AS)'],
        correctAnswer: 1,
        explanation: 'Khadijah (RA), the Prophet\'s wife, was the first to accept Islam.',
        category: 'Sahabah'
      },
      {
        id: 'q68-sahabah-5',
        question: 'Should we love and respect all the Sahabah?',
        options: ['No', 'Only some', 'Yes, all of them', 'I do not know'],
        correctAnswer: 2,
        explanation: 'We love and respect all the Sahabah for their sacrifices.',
        category: 'Sahabah'
      },

      // Fiqh
      {
        id: 'q68-fiqh-1',
        question: 'How many times do Muslims pray each day?',
        options: ['1', '3', '5', '10'],
        correctAnswer: 2,
        explanation: 'Muslims perform Salah 5 times a day.',
        category: 'Fiqh'
      },
      {
        id: 'q68-fiqh-2',
        question: 'What do we call the washing before salah?',
        options: ['Ghusl', 'Wudu', 'Tayammum', 'Shower'],
        correctAnswer: 1,
        explanation: 'Wudu is the washing we do before praying Salah.',
        category: 'Fiqh'
      },
      {
        id: 'q68-fiqh-3',
        question: 'Should we face the qiblah when we pray?',
        options: ['Yes', 'No', 'Any direction is fine', 'Only on Fridays'],
        correctAnswer: 0,
        explanation: 'We must face the Qiblah (Kaaba) when we pray.',
        category: 'Fiqh'
      },
      {
        id: 'q68-fiqh-4',
        question: 'Is it allowed to eat pork in Islam?',
        options: ['Yes', 'No, it is Haram', 'Only on weekends', 'If it is cooked well'],
        correctAnswer: 1,
        explanation: 'Eating pork is not allowed (Haram) for Muslims.',
        category: 'Fiqh'
      },
      {
        id: 'q68-fiqh-5',
        question: 'Is stealing allowed in Islam?',
        options: ['Yes', 'No, never', 'Only if you are hungry', 'Only from bad people'],
        correctAnswer: 1,
        explanation: 'Stealing is wrong and not allowed in Islam.',
        category: 'Fiqh'
      },

      // Akhlaq
      {
        id: 'q68-akhlaq-1',
        question: 'What does “akhlaq” mean (what part of a person)?',
        options: ['Height', 'Money', 'Character and Manners', 'Clothes'],
        correctAnswer: 2,
        explanation: 'Akhlaq refers to a person\'s character and manners.',
        category: 'Akhlaq'
      },
      {
        id: 'q68-akhlaq-2',
        question: 'Who had the best akhlaq of all people?',
        options: ['A king', 'Prophet Muhammad ﷺ', 'A rich man', 'A famous hero'],
        correctAnswer: 1,
        explanation: 'Prophet Muhammad ﷺ had the most perfect character.',
        category: 'Akhlaq'
      },
      {
        id: 'q68-akhlaq-3',
        question: 'Is telling the truth part of good akhlaq?',
        options: ['Yes', 'No', 'Only sometimes', 'It does not matter'],
        correctAnswer: 0,
        explanation: 'Being truthful is a very important part of good character.',
        category: 'Akhlaq'
      },
      {
        id: 'q68-akhlaq-4',
        question: 'Is bullying other children good or bad akhlaq?',
        options: ['Good', 'Bad', 'Okay', 'Funny'],
        correctAnswer: 1,
        explanation: 'Bullying is bad behavior and bad Akhlaq.',
        category: 'Akhlaq'
      },
      {
        id: 'q68-akhlaq-5',
        question: 'Is it good akhlaq to respect and help your parents?',
        options: ['No', 'Yes, very important', 'Only when they give gifts', 'Only on holidays'],
        correctAnswer: 1,
        explanation: 'Respecting and helping parents is a huge part of good Akhlaq.',
        category: 'Akhlaq'
      },

      // Adaab
      {
        id: 'q68-adaab-1',
        question: 'What does “adaab” mean?',
        options: ['Food', 'Manners and Etiquette', 'Sleep', 'Sports'],
        correctAnswer: 1,
        explanation: 'Adaab means having good manners and proper etiquette.',
        category: 'Adaab'
      },
      {
        id: 'q68-adaab-2',
        question: 'What should we say when we meet another Muslim?',
        options: ['Hello', 'Hi', 'Assalamu Alaikum', 'Bye'],
        correctAnswer: 2,
        explanation: 'We say "Assalamu Alaikum" (Peace be upon you).',
        category: 'Adaab'
      },
      {
        id: 'q68-adaab-3',
        question: 'With which hand should we eat and drink?',
        options: ['Left hand', 'Right hand', 'Both hands', 'No hands'],
        correctAnswer: 1,
        explanation: 'We should always eat and drink with our right hand.',
        category: 'Adaab'
      },
      {
        id: 'q68-adaab-4',
        question: 'Is it good manners to waste food?',
        options: ['Yes', 'No', 'It is okay', 'Only if we are full'],
        correctAnswer: 1,
        explanation: 'We should not waste food; it is a blessing from Allah.',
        category: 'Adaab'
      },
      {
        id: 'q68-adaab-5',
        question: 'Is it good manners to knock before entering someone’s room?',
        options: ['No, just walk in', 'Yes, always knock', 'Only at night', 'Only if the door is locked'],
        correctAnswer: 1,
        explanation: 'We should knock and ask permission before entering.',
        category: 'Adaab'
      },

      // Duas
      {
        id: 'q68-dua-1',
        question: 'What does “dua” mean?',
        options: ['Sleeping', 'Playing', 'Asking Allah for help', 'Reading a book'],
        correctAnswer: 2,
        explanation: 'Dua means asking Allah for help and guidance.',
        category: 'Duas'
      },
      {
        id: 'q68-dua-2',
        question: 'Who do we make dua to?',
        options: ['Prophets', 'Angels', 'Allah Alone', 'People'],
        correctAnswer: 2,
        explanation: 'We make Dua only to Allah.',
        category: 'Duas'
      },
      {
        id: 'q68-dua-3',
        question: 'Can children make dua?',
        options: ['No, only adults', 'Yes, Allah loves children\'s dua', 'Only at school', 'Only in the mosque'],
        correctAnswer: 1,
        explanation: 'Yes, anyone can make Dua, and Allah listens to everyone.',
        category: 'Duas'
      },
      {
        id: 'q68-dua-4',
        question: 'Can we make dua in our own language?',
        options: ['No, only Arabic', 'Yes, any language', 'Only English', 'Only Urdu'],
        correctAnswer: 1,
        explanation: 'Allah understands all languages, so we can ask in our own language.',
        category: 'Duas'
      },
      {
        id: 'q68-dua-5',
        question: 'Can we ask Allah in dua to help us go to Jannah?',
        options: ['No', 'Yes, we should ask for Jannah', 'Maybe', 'Only if we are old'],
        correctAnswer: 1,
        explanation: 'We should always ask Allah to grant us Jannah.',
        category: 'Duas'
      },

      // Ramadan
      {
        id: 'q68-ramadan-1',
        question: 'What do Muslims do in Ramadan?',
        options: ['Fast (Sawm)', 'Sleep all day', 'Eat more', 'Play only'],
        correctAnswer: 0,
        explanation: 'In Ramadan, Muslims fast from dawn until sunset.',
        category: 'Ramadan'
      },
      {
        id: 'q68-ramadan-2',
        question: 'What do we eat before starting the fast?',
        options: ['Dinner', 'Lunch', 'Suhoor', 'Snacks'],
        correctAnswer: 2,
        explanation: 'Suhoor is the blessed meal we eat before Fajr to start our fast.',
        category: 'Ramadan'
      },
      {
        id: 'q68-ramadan-3',
        question: 'What is the meal called when we break our fast?',
        options: ['Breakfast', 'Iftar', 'Lunch', 'Supper'],
        correctAnswer: 1,
        explanation: 'Iftar is the meal we eat at Maghrib to break our fast.',
        category: 'Ramadan'
      },
      {
        id: 'q68-ramadan-4',
        question: 'Which special prayer is prayed at night in Ramadan?',
        options: ['Jumuah', 'Taraweeh', 'Eid', 'Janazah'],
        correctAnswer: 1,
        explanation: 'Taraweeh is the special night prayer performed only in Ramadan.',
        category: 'Ramadan'
      },
      {
        id: 'q68-ramadan-5',
        question: 'What festival comes after Ramadan finishes?',
        options: ['Eid al-Fitr', 'Eid al-Adha', 'New Year', 'Birthday'],
        correctAnswer: 0,
        explanation: 'Eid al-Fitr is the celebration that comes after Ramadan ends.',
        category: 'Ramadan'
      }
    ],
    hadiths: [
      {
        id: 'h68-1',
        text: 'The Prophet (SAW) said: "Smile is a charity."',
        source: 'Tirmidhi',
        reflectionOptions: [
          { id: 'ro1', text: 'We should always be angry.', isCorrect: false },
          { id: 'ro2', text: 'Smiling makes others happy and Allah rewards us.', isCorrect: true },
          { id: 'ro3', text: 'We have to give money to smile.', isCorrect: false }
        ],
        explanation: 'Smiling is a simple way to do good and be kind to others.'
      },
      {
        id: 'h68-2',
        text: 'The Prophet (SAW) said: "Cleanliness is half of faith."',
        source: 'Sahih Muslim',
        reflectionOptions: [
          { id: 'ro1', text: 'Being messy is okay.', isCorrect: false },
          { id: 'ro2', text: 'We should keep our body and clothes clean.', isCorrect: true },
          { id: 'ro3', text: 'Faith means only praying.', isCorrect: false }
        ],
        explanation: 'Allah loves those who are clean and pure.'
      },
      {
        id: 'h68-3',
        text: 'The Prophet (SAW) said: "None of you truly believes until he loves for his brother what he loves for himself."',
        source: 'Bukhari & Muslim',
        reflectionOptions: [
          { id: 'ro1', text: 'I should keep all toys for myself.', isCorrect: false },
          { id: 'ro2', text: 'I should want good things for my friends just like I want for me.', isCorrect: true },
          { id: 'ro3', text: 'I should take my brother\'s toys.', isCorrect: false }
        ],
        explanation: 'We should be selfish-less and care for others.'
      },
      {
        id: 'h68-4',
        text: 'The Prophet (SAW) said: "Paradise lies at the feet of your mother."',
        source: 'Nasai',
        reflectionOptions: [
          { id: 'ro1', text: 'We should not listen to our mothers.', isCorrect: false },
          { id: 'ro2', text: 'Respecting and serving our mother helps us go to Jannah.', isCorrect: true },
          { id: 'ro3', text: 'Mothers should serve us.', isCorrect: false }
        ],
        explanation: 'Our mothers do so much for us, we must treat them with the best kindness.'
      },
      {
        id: 'h68-5',
        text: 'The Prophet (SAW) said: "He who does not show mercy to our young ones... is not one of us."',
        source: 'Tirmidhi',
        reflectionOptions: [
          { id: 'ro1', text: 'Big kids should be mean to little kids.', isCorrect: false },
          { id: 'ro2', text: 'We should be kind and gentle to younger children.', isCorrect: true },
          { id: 'ro3', text: 'Mercy is only for animals.', isCorrect: false }
        ],
        explanation: 'Being kind to those smaller than us is a sign of a good Muslim.'
      }
    ],
    quranMatch: [
      { id: 'qm68-1', item1: 'Bismillah', item2: 'In the name of Allah', matchId: 'm1' },
      { id: 'qm68-2', item1: 'Alhamdulillah', item2: 'All praise is due to Allah', matchId: 'm2' },
      { id: 'qm68-3', item1: 'Allah', item2: 'God', matchId: 'm3' },
      { id: 'qm68-4', item1: 'Jannah', item2: 'Paradise', matchId: 'm4' },
      { id: 'qm68-5', item1: 'Salah', item2: 'Prayer', matchId: 'm5' }
    ],
    quranContext: [
      {
        id: 'qc68-1',
        ayatText: 'Qul Huwa Allahu Ahad. Allahus-Samad.',
        surahReference: 'Surah Al-Ikhlas',
        options: ['Allah is One and needs nothing.', 'We should be honest.', 'Story of an Elephant.', 'About Fasting.'],
        correctAnswer: 0,
        explanation: 'This Surah tells us that Allah is One, Unique, and Eternal.'
      },
      {
        id: 'qc68-2',
        ayatText: 'Alhamdulillahi Rabbil Alamin.',
        surahReference: 'Surah Al-Fatiha',
        options: ['Asking for help.', 'Thanking Allah, the Lord of all worlds.', 'Warning about fire.', 'Story of Musa.'],
        correctAnswer: 1,
        explanation: 'This is how we start our prayers, by thanking Allah who takes care of everything.'
      }
    ]
  },
  '9-11': {
    quizzes: [
      {
        id: 'q911-1',
        question: 'Which Angel brought revelation to the Prophets?',
        options: ['Mikail', 'Israfil', 'Jibreel', 'Malik'],
        correctAnswer: 2,
        explanation: 'Angel Jibreel (Gabriel) was responsible for bringing Allah\'s messages to the Prophets.',
        category: 'Angels'
      },
      {
        id: 'q911-2',
        question: 'In which month was the Quran revealed?',
        options: ['Rajab', 'Sha\'ban', 'Ramadan', 'Muharram'],
        correctAnswer: 2,
        explanation: 'The Quran was first revealed in the month of Ramadan.',
        category: 'Quran'
      },
      {
        id: 'q911-3',
        question: 'What was the first battle of Islam?',
        options: ['Battle of Uhud', 'Battle of Badr', 'Battle of Khandaq', 'Battle of Tabuk'],
        correctAnswer: 1,
        explanation: 'The Battle of Badr was the first major battle between Muslims and Quraysh.',
        category: 'Seerah'
      },
      {
        id: 'q911-4',
        question: 'Who was the first Caliph of Islam?',
        options: ['Umar ibn Al-Khattab', 'Ali ibn Abi Talib', 'Abu Bakr As-Siddiq', 'Uthman ibn Affan'],
        correctAnswer: 2,
        explanation: 'Abu Bakr (RA) was the first Caliph after the Prophet (SAW) passed away.',
        category: 'History'
      },
      {
        id: 'q911-5',
        question: 'What is the meaning of "Islam"?',
        options: ['To fight', 'Submission to Allah', 'To read', 'To travel'],
        correctAnswer: 1,
        explanation: 'Islam comes from the root word meaning submission and peace.',
        category: 'Basics'
      },

      // Ramadan
      {
        id: 'q911-ramadan-1',
        question: 'What is the "Night of Power" called in Arabic?',
        options: ['Laylatul Qadr', 'Laylatul Miraj', 'Laylatul Baraat', 'Laylatul Jumuah'],
        correctAnswer: 0,
        explanation: 'Laylatul Qadr (The Night of Decree) is better than a thousand months.',
        category: 'Ramadan'
      },
      {
        id: 'q911-ramadan-2',
        question: 'In which ten days of Ramadan is Laylatul Qadr likely to be?',
        options: ['First ten', 'Middle ten', 'Last ten', 'Any day'],
        correctAnswer: 2,
        explanation: 'The Prophet (SAW) told us to search for it in the odd nights of the last ten days.',
        category: 'Ramadan'
      },
      {
        id: 'q911-ramadan-3',
        question: 'What is Zakat al-Fitr?',
        options: ['Charity given before Eid prayer', 'Money for clothes', 'Food for yourself', 'A gift for friends'],
        correctAnswer: 0,
        explanation: 'Zakat al-Fitr is charity given to the poor before the Eid prayer so everyone can celebrate.',
        category: 'Ramadan'
      },
      {
        id: 'q911-ramadan-4',
        question: 'Which gate of Jannah is for those who fast?',
        options: ['Ar-Rayyan', 'Al-Firdaus', 'Bab as-Salah', 'Bab al-Jihad'],
        correctAnswer: 0,
        explanation: 'Ar-Rayyan is the special gate of Paradise for those who observe fasting.',
        category: 'Ramadan'
      },
      {
        id: 'q911-ramadan-5',
        question: 'Does eating by mistake break your fast?',
        options: ['Yes', 'No', 'Maybe', 'Only if you drink water'],
        correctAnswer: 1,
        explanation: 'If you eat or drink by mistake (forgetfully), your fast is still valid.',
        category: 'Ramadan'
      }
    ],
    hadiths: [
      {
        id: 'h911-1',
        text: 'The Prophet (SAW) said: "The best among you is the one who learns the Quran and teaches it."',
        source: 'Bukhari',
        reflectionOptions: [
          { id: 'ro1', text: 'Only the Imam should learn Quran.', isCorrect: false },
          { id: 'ro2', text: 'We should learn Quran and help others learn it too.', isCorrect: true },
          { id: 'ro3', text: 'Teaching is boring.', isCorrect: false }
        ],
        explanation: 'Learning and sharing the Quran is one of the highest acts of worship.'
      },
      {
        id: 'h911-2',
        text: 'The Prophet (SAW) said: "A Muslim is the brother of a Muslim. He does not oppress him, nor does he fail him."',
        source: 'Muslim',
        reflectionOptions: [
          { id: 'ro1', text: 'Muslims should support each other and stand up for justice.', isCorrect: true },
          { id: 'ro2', text: 'Brothers always fight.', isCorrect: false },
          { id: 'ro3', text: 'We only help people we know.', isCorrect: false }
        ],
        explanation: 'Brotherhood in Islam means protecting and helping one another.'
      },
      {
        id: 'h911-3',
        text: 'The Prophet (SAW) said: "Say the truth even if it is bitter."',
        source: 'Baihaqi',
        reflectionOptions: [
          { id: 'ro1', text: 'Lie to make people happy.', isCorrect: false },
          { id: 'ro2', text: 'Always be honest, even when it is difficult.', isCorrect: true },
          { id: 'ro3', text: 'Truth is not important.', isCorrect: false }
        ],
        explanation: 'Honesty is a core value, regardless of the consequences.'
      },
      {
        id: 'h911-4',
        text: 'The Prophet (SAW) said: "The strong man is not the good wrestler; the strong man is the one who controls himself when he is angry."',
        source: 'Bukhari',
        reflectionOptions: [
          { id: 'ro1', text: 'Strength is about muscles.', isCorrect: false },
          { id: 'ro2', text: 'Real strength is controlling your temper.', isCorrect: true },
          { id: 'ro3', text: 'We should fight when angry.', isCorrect: false }
        ],
        explanation: 'Inner strength and self-control are more important than physical power.'
      },
      {
        id: 'h911-5',
        text: 'The Prophet (SAW) said: "God does not look at your forms and possessions, but He looks at your hearts and your deeds."',
        source: 'Muslim',
        reflectionOptions: [
          { id: 'ro1', text: 'Having nice clothes is the most important.', isCorrect: false },
          { id: 'ro2', text: 'Allah cares about our intentions and actions.', isCorrect: true },
          { id: 'ro3', text: 'Rich people are better.', isCorrect: false }
        ],
        explanation: 'Allah judges us by what is inside us and what we do, not how we look.'
      }
    ],
    quranMatch: [
      { id: 'qm911-1', item1: 'Al-Fatiha', item2: 'The Opening', matchId: 'm1' },
      { id: 'qm911-2', item1: 'Al-Baqarah', item2: 'The Cow', matchId: 'm2' },
      { id: 'qm911-3', item1: 'Ayat al-Kursi', item2: 'Verse of the Throne', matchId: 'm3' },
      { id: 'qm911-4', item1: 'Laylat al-Qadr', item2: 'Night of Power', matchId: 'm4' },
      { id: 'qm911-5', item1: 'Zamzam', item2: 'Holy Water', matchId: 'm5' }
    ],
    quranContext: [
      {
        id: 'qc911-1',
        ayatText: '"O you who have believed, fasting is prescribed for you as it was prescribed for those before you, that you may become righteous."',
        surahReference: 'Surah Al-Baqarah 2:183',
        options: ['Rules of Zakat', 'Obligation of Fasting (Sawm)', 'Paying Zakat', 'Being kind to parents'],
        correctAnswer: 1,
        explanation: 'This verse establishes the command for Muslims to fast during Ramadan.'
      },
      {
        id: 'qc911-2',
        ayatText: '"Indeed, We sent it down during the Night of Decree."',
        surahReference: 'Surah Al-Qadr 97:1',
        options: ['Revelation of Quran', 'Creation of the world', 'Day of Judgment', 'Story of Prophets'],
        correctAnswer: 0,
        explanation: 'This refers to the revelation of the Quran on Laylat al-Qadr.'
      }
    ]
  },
  '12-14': {
    quizzes: [
      {
        id: 'q1214-1',
        question: 'Which surah is called Umm al-Kitab (Mother of the Book)?',
        options: ['Surah Al-Fatiha', 'Surah Al-Ikhlas', 'Surah Al-Mulk', 'Surah Al-Kahf'],
        correctAnswer: 0,
        explanation: 'Surah Al-Fatiha is called Umm al-Kitab because of its central place in recitation and prayer.',
        category: 'Quran'
      },
      {
        id: 'q1214-2',
        question: 'What was the Treaty of Hudaybiyyah?',
        options: ['A peace treaty between Muslims and Quraysh', 'A declaration of war', 'A trade agreement', 'A treaty with the Jews of Madinah'],
        correctAnswer: 0,
        explanation: 'It was a pivotal peace treaty that allowed Muslims to return for pilgrimage the following year.',
        category: 'Seerah'
      },
      {
        id: 'q1214-3',
        question: 'Who are the "Ulul Azm" (Prophets of Determination)?',
        options: ['Adam, Idris, Nuh, Hud, Salih', 'Nuh, Ibrahim, Musa, Isa, Muhammad (SAW)', 'Yusuf, Yaqub, Ishaq, Ismail, Lut', 'Dawud, Sulayman, Zakariya, Yahya, Isa'],
        correctAnswer: 1,
        explanation: 'The five resolute messengers are Nuh, Ibrahim, Musa, Isa, and Muhammad (SAW).',
        category: 'Prophets'
      },
      {
        id: 'q1214-4',
        question: 'What is "Ijma" in Islamic Law?',
        options: ['Personal opinion', 'Consensus of scholars', 'Analogical deduction', 'Local custom'],
        correctAnswer: 1,
        explanation: 'Ijma refers to the consensus or agreement of Islamic scholars on a point of Islamic law.',
        category: 'Fiqh'
      },
      {
        id: 'q1214-5',
        question: 'Which battle took place in 8 AH resulting in the conquest of Makkah?',
        options: ['Battle of Tabuk', 'Battle of Hunayn', 'Conquest of Makkah', 'Battle of Mu\'tah'],
        correctAnswer: 2,
        explanation: 'The Conquest of Makkah (Fath Makkah) happened peacefully in 8 AH.',
        category: 'History'
      },

      // Ramadan
      {
        id: 'q1214-ramadan-1',
        question: 'What is the ruling of fasting Ramadan for a healthy adult Muslim?',
        options: ['Sunnah', 'Fard (Obligatory)', 'Nafl (Optional)', 'Mustahabb (Recommended)'],
        correctAnswer: 1,
        explanation: 'Fasting Ramadan is one of the Five Pillars of Islam and is Fard (obligatory).',
        category: 'Ramadan'
      },
      {
        id: 'q1214-ramadan-2',
        question: 'What is Itikaf?',
        options: ['Staying in the mosque for worship', 'Visiting graves', 'Traveling for knowledge', 'Giving charity'],
        correctAnswer: 0,
        explanation: 'Itikaf is seclusion in the mosque for the purpose of worshipping Allah, usually in the last 10 days.',
        category: 'Ramadan'
      },
      {
        id: 'q1214-ramadan-3',
        question: 'Which major battle took place on the 17th of Ramadan?',
        options: ['Battle of Uhud', 'Battle of Badr', 'Battle of Khandaq', 'Battle of Tabuk'],
        correctAnswer: 1,
        explanation: 'The Battle of Badr, the first decisive battle, took place on 17th Ramadan, 2 AH.',
        category: 'Ramadan'
      },
      {
        id: 'q1214-ramadan-4',
        question: 'What does the word "Ramadan" come from?',
        options: ['Ramad (Scorching heat)', 'Raheem (Mercy)', 'Rahah (Rest)', 'Rizq (Provision)'],
        correctAnswer: 0,
        explanation: 'Ramadan comes from the root "Ramad" which means scorching heat or dryness, symbolizing the burning of sins.',
        category: 'Ramadan'
      },
      {
        id: 'q1214-ramadan-5',
        question: 'Who is exempt from fasting but must pay Fidya?',
        options: ['A traveler', 'A sick person who expects to recover', 'An elderly person unable to fast', 'A child'],
        correctAnswer: 2,
        explanation: 'An elderly person who cannot fast and has no hope of recovery must pay Fidya (feeding a poor person) for each day.',
        category: 'Ramadan'
      }
    ],
    hadiths: [
      {
        id: 'h1214-1',
        text: 'The Prophet (SAW) said: "Seven people will be shaded by Allah under His shade on the day when there will be no shade except His..."',
        source: 'Bukhari',
        reflectionOptions: [
          { id: 'ro1', text: 'It describes people who are lazy.', isCorrect: false },
          { id: 'ro2', text: 'It lists categories of righteous people, like a just leader and a youth growing up in worship.', isCorrect: true },
          { id: 'ro3', text: 'It talks about building umbrellas.', isCorrect: false }
        ],
        explanation: 'This hadith encourages specific virtues like justice, chastity, and charity to earn Allah\'s special protection.'
      },
      {
        id: 'h1214-2',
        text: 'The Prophet (SAW) said: "The world is a prison for the believer and a paradise for the disbeliever."',
        source: 'Muslim',
        reflectionOptions: [
          { id: 'ro1', text: 'Muslims should be in jail.', isCorrect: false },
          { id: 'ro2', text: 'Believers restrict themselves from haram desires for eternal reward, while disbelievers indulge now.', isCorrect: true },
          { id: 'ro3', text: 'We should hate the world.', isCorrect: false }
        ],
        explanation: 'This highlights the transient nature of worldly life compared to the Hereafter.'
      },
      {
        id: 'h1214-3',
        text: 'The Prophet (SAW) said: "Take advantage of five before five: your youth before your old age..."',
        source: 'Mustadrak Al-Hakim',
        reflectionOptions: [
          { id: 'ro1', text: 'We should procrastinate.', isCorrect: false },
          { id: 'ro2', text: 'We must value our time, health, and youth to do good deeds before it is too late.', isCorrect: true },
          { id: 'ro3', text: 'Numbers are important.', isCorrect: false }
        ],
        explanation: 'Time management and seizing opportunities for good deeds are crucial.'
      },
      {
        id: 'h1214-4',
        text: 'The Prophet (SAW) said: "Whosoever of you sees an evil, let him change it with his hand..."',
        source: 'Muslim',
        reflectionOptions: [
          { id: 'ro1', text: 'We should ignore bad things.', isCorrect: false },
          { id: 'ro2', text: 'We have a responsibility to stop injustice by action, speech, or at least hating it in our heart.', isCorrect: true },
          { id: 'ro3', text: 'Only police change things.', isCorrect: false }
        ],
        explanation: 'This defines the levels of responsibility in enjoining good and forbidding evil.'
      },
      {
        id: 'h1214-5',
        text: 'The Prophet (SAW) said: "Actions are but by intentions, and every man shall have that which he intended."',
        source: 'Bukhari & Muslim',
        reflectionOptions: [
          { id: 'ro1', text: 'Results matter more than thoughts.', isCorrect: false },
          { id: 'ro2', text: 'The purity of intention (Niyyah) determines the value of our deeds.', isCorrect: true },
          { id: 'ro3', text: 'Intention is not needed.', isCorrect: false }
        ],
        explanation: 'This is the most fundamental principle in Islam; everything depends on why we do it.'
      }
    ],
    quranMatch: [
      { id: 'qm1214-1', item1: 'Surah Al-Mulk', item2: 'Protection from grave punishment', matchId: 'm1' },
      { id: 'qm1214-2', item1: 'Surah Al-Kahf', item2: 'Protection from Dajjal', matchId: 'm2' },
      { id: 'qm1214-3', item1: 'Surah Al-Ikhlas', item2: 'One third of Quran', matchId: 'm3' },
      { id: 'qm1214-4', item1: 'Ayat al-Kursi', item2: 'Greatest verse', matchId: 'm4' },
      { id: 'qm1214-5', item1: 'Surah Al-Fatiha', item2: 'Mother of the Book', matchId: 'm5' }
    ],
    quranContext: [
      {
        id: 'qc1214-1',
        ayatText: '"And hold firmly to the rope of Allah all together and do not become divided."',
        surahReference: 'Surah Ali Imran 3:103',
        options: ['Importance of Unity', 'How to climb', 'Story of a rope', 'Hiking rules'],
        correctAnswer: 0,
        explanation: 'This verse commands Muslims to remain united upon the Quran and Sunnah.'
      },
      {
        id: 'qc1214-2',
        ayatText: '"Nor does he speak from [his own] inclination. It is not but a revelation revealed."',
        surahReference: 'Surah An-Najm 53:3-4',
        options: ['Prophet\'s Poetry', 'Truthfulness of Prophet Muhammad (SAW)', 'About Angels', 'About Stars'],
        correctAnswer: 1,
        explanation: 'This confirms that whatever the Prophet (SAW) spoke regarding religion was from Allah.'
      }
    ]
  }
};

const AUTHENTIC_TOPIC_ADDONS: Record<AgeGroup, QuizQuestion[]> = {
  '6-8': [
    {
      id: 'q68-auth-quran-1',
      question: 'How many surahs are in the Quran?',
      options: ['100', '110', '114', '120'],
      correctAnswer: 2,
      explanation: 'The Quran has 114 surahs.',
      category: 'Quran'
    },
    {
      id: 'q68-auth-hadith-1',
      question: 'In hadith, deeds are judged by what?',
      options: ['Intentions', 'Clothes', 'Age', 'Voice'],
      correctAnswer: 0,
      explanation: 'The Prophet ﷺ taught that deeds are judged by intentions.',
      category: 'Hadith'
    },
    {
      id: 'q68-auth-seerah-1',
      question: 'Where did the Prophet ﷺ migrate in Hijrah?',
      options: ['Makkah', 'Taif', 'Madinah', 'Jerusalem'],
      correctAnswer: 2,
      explanation: 'Hijrah was the migration from Makkah to Madinah.',
      category: 'Seerah'
    },
    {
      id: 'q68-auth-hajj-1',
      question: 'What is the name of circling the Ka bah seven times?',
      options: ['Sa i', 'Tawaf', 'Wudu', 'Iqamah'],
      correctAnswer: 1,
      explanation: 'Tawaf is circling the Ka bah seven times.',
      category: 'Hajj'
    },
    {
      id: 'q68-auth-prophets-1',
      question: 'Which prophet built the Ark?',
      options: ['Musa AS', 'Nuh AS', 'Yunus AS', 'Isa AS'],
      correctAnswer: 1,
      explanation: 'Allah commanded Prophet Nuh AS to build the Ark.',
      category: 'Prophets'
    },
    {
      id: 'q68-auth-sahabah-1',
      question: 'Who was the first Caliph after the Prophet ﷺ?',
      options: ['Abu Bakr RA', 'Umar RA', 'Ali RA', 'Uthman RA'],
      correctAnswer: 0,
      explanation: 'Abu Bakr RA became the first Caliph.',
      category: 'Sahabah'
    }
  ],
  '9-11': [
    {
      id: 'q911-auth-quran-1',
      question: 'Which surah is the longest in the Quran?',
      options: ['Surah Ya-Sin', 'Surah Al-Baqarah', 'Surah Al-Ikhlas', 'Surah Al-Mulk'],
      correctAnswer: 1,
      explanation: 'Surah Al-Baqarah is the longest surah in the Quran.',
      category: 'Quran'
    },
    {
      id: 'q911-auth-hadith-1',
      question: 'Who is a Muslim according to hadith?',
      options: ['One who harms people', 'One whose tongue and hands do not harm others', 'One who travels often', 'One who only speaks Arabic'],
      correctAnswer: 1,
      explanation: 'A Muslim is one from whose tongue and hands people are safe.',
      category: 'Hadith'
    },
    {
      id: 'q911-auth-seerah-1',
      question: 'What was the Treaty of Hudaybiyyah?',
      options: ['A war declaration', 'A peace treaty', 'A trade boycott', 'A battle in Madinah'],
      correctAnswer: 1,
      explanation: 'Hudaybiyyah was a peace treaty that helped Islam spread.',
      category: 'Seerah'
    },
    {
      id: 'q911-auth-hajj-1',
      question: 'On which day do pilgrims stand at Arafah?',
      options: ['8th Dhul Hijjah', '9th Dhul Hijjah', '10th Dhul Hijjah', '11th Dhul Hijjah'],
      correctAnswer: 1,
      explanation: 'The standing at Arafah is on the 9th of Dhul Hijjah.',
      category: 'Hajj'
    },
    {
      id: 'q911-auth-prophets-1',
      question: 'Which prophet and his son raised the Ka bah foundations?',
      options: ['Musa and Harun AS', 'Ibrahim and Ismail AS', 'Yaqub and Yusuf AS', 'Dawud and Sulayman AS'],
      correctAnswer: 1,
      explanation: 'Ibrahim AS and Ismail AS raised the foundations of the Ka bah.',
      category: 'Prophets'
    },
    {
      id: 'q911-auth-sahabah-1',
      question: 'Which companion was known as Al-Faruq?',
      options: ['Bilal RA', 'Umar RA', 'Abu Hurairah RA', 'Zayd RA'],
      correctAnswer: 1,
      explanation: 'Umar RA was called Al-Faruq for distinguishing truth and falsehood.',
      category: 'Sahabah'
    }
  ],
  '12-14': [
    {
      id: 'q1214-auth-quran-1',
      question: 'What were the first revealed verses from?',
      options: ['Surah Al-Alaq', 'Surah Al-Mulk', 'Surah Al-Kawthar', 'Surah An-Nas'],
      correctAnswer: 0,
      explanation: 'The first revealed verses were from Surah Al-Alaq (96:1-5).',
      category: 'Quran'
    },
    {
      id: 'q1214-auth-hadith-1',
      question: 'What did the Prophet ﷺ say about mercy?',
      options: ['Mercy is optional', 'Whoever does not show mercy will not be shown mercy', 'Mercy is only for family', 'Mercy is only for children'],
      correctAnswer: 1,
      explanation: 'The Prophet ﷺ taught that mercy is central to faith and character.',
      category: 'Hadith'
    },
    {
      id: 'q1214-auth-seerah-1',
      question: 'Which battle was the first major battle in Islam?',
      options: ['Uhud', 'Khandaq', 'Badr', 'Hunayn'],
      correctAnswer: 2,
      explanation: 'Badr was the first major battle fought by Muslims.',
      category: 'Seerah'
    },
    {
      id: 'q1214-auth-hajj-1',
      question: 'What does Ramy al-Jamarat symbolize?',
      options: ['Sports activity', 'Rejecting Shaytan and obeying Allah', 'Choosing a camp', 'Marking the end of Hajj only'],
      correctAnswer: 1,
      explanation: 'Throwing pebbles symbolizes rejecting Shaytan and following obedience to Allah.',
      category: 'Hajj'
    },
    {
      id: 'q1214-auth-prophets-1',
      question: 'Who are the five Ulul Azm prophets?',
      options: ['Nuh, Ibrahim, Musa, Isa, Muhammad (peace be upon them)', 'Adam, Idris, Hud, Salih, Lut', 'Yusuf, Yaqub, Ismail, Yunus, Ayyub', 'Harun, Dawud, Sulayman, Zakariya, Yahya'],
      correctAnswer: 0,
      explanation: 'Ulul Azm are Nuh, Ibrahim, Musa, Isa, and Muhammad (peace be upon them).',
      category: 'Prophets'
    },
    {
      id: 'q1214-auth-sahabah-1',
      question: 'During whose caliphate was the written Mushaf standardized for the Ummah?',
      options: ['Abu Bakr RA', 'Umar RA', 'Uthman RA', 'Ali RA'],
      correctAnswer: 2,
      explanation: 'Uthman RA standardized the Mushaf copies for unity in recitation.',
      category: 'Sahabah'
    }
  ]
};

for (const ageGroup of Object.keys(AUTHENTIC_TOPIC_ADDONS) as AgeGroup[]) {
  AGE_GROUPS[ageGroup].quizzes = [
    ...AGE_GROUPS[ageGroup].quizzes,
    ...AUTHENTIC_TOPIC_ADDONS[ageGroup]
  ];
}
