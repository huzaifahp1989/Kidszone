export type SurahCourseDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type SurahCourseQuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  reference?: string;
};

export type SurahCourse = {
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
  sections: Array<{ title: string; content: string }>;
  keyAyahs: Array<{ reference: string; text: string; meaning: string }>;
  quizQuestions: SurahCourseQuizQuestion[];
  juzAmmaLearnUrl?: string;
};

export const SURAH_COURSES: SurahCourse[] = [
  {
    slug: 'al-fatiha',
    number: 1,
    arabicName: 'الفاتحة',
    englishName: 'Al-Fatiha',
    emoji: '🌟',
    ayahCount: 7,
    revelation: 'Makki',
    difficulty: 'beginner',
    theme: 'The opening of the Quran — praise, guidance, and dua',
    summary:
      'Al-Fatiha is the first surah of the Quran and the greatest surah. We recite it in every rakah of salah. It teaches us to praise Allah, ask for guidance, and stay on the straight path.',
    sections: [
      {
        title: 'The greatest surah',
        content:
          'Prophet Muhammad ﷺ said Al-Fatiha is the greatest surah in the Quran. Muslims read it at least seventeen times every day in salah. It opens the Book of Allah with praise and ends with a beautiful dua for guidance.',
      },
      {
        title: 'Praising Allah',
        content:
          'We begin by praising Allah, Lord of all worlds — humans, jinn, angels, and everything He created. Ar-Rahman and Ar-Raheem remind us that Allah is full of mercy. On the Day of Judgment, only believers will receive His special mercy.',
      },
      {
        title: 'Master of the Day of Judgment',
        content:
          'Allah alone is the King on the Day we will all return to Him. This ayah keeps our hearts humble. We worship Him alone and ask Him for help in every good deed.',
      },
      {
        title: 'Asking for guidance',
        content:
          'The most important dua in Al-Fatiha is: "Guide us to the straight path." We ask Allah to keep us on the path of the prophets, the truthful, the martyrs, and the righteous — not the path of those who earned anger or went astray.',
      },
    ],
    keyAyahs: [
      { reference: '1:1', text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', meaning: 'In the name of Allah, the Most Gracious, the Most Merciful.' },
      { reference: '1:5', text: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', meaning: 'You alone we worship, and You alone we ask for help.' },
      { reference: '1:6-7', text: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ', meaning: 'Guide us to the straight path.' },
    ],
    quizQuestions: [
      {
        id: 'fatiha-1',
        question: 'How many ayahs are in Surah Al-Fatiha?',
        options: ['5', '7', '10', '114'],
        correctAnswer: 1,
        explanation: 'Al-Fatiha has 7 ayahs and is often called "As-Sab\' al-Mathani" (the seven oft-repeated).',
        reference: '1:1-7',
      },
      {
        id: 'fatiha-2',
        question: 'When do Muslims recite Al-Fatiha?',
        options: ['Only on Jumuah', 'In every rakah of salah', 'Only in Ramadan', 'Once a year'],
        correctAnswer: 1,
        explanation: 'Al-Fatiha is recited in every unit of prayer — that is why we learn it first.',
        reference: '1:1',
      },
      {
        id: 'fatiha-3',
        question: 'What do we ask Allah for in the last part of Al-Fatiha?',
        options: ['More money', 'Guidance to the straight path', 'To win games', 'Longer holidays'],
        correctAnswer: 1,
        explanation: 'The heart of Al-Fatiha is asking Allah for guidance, not worldly things.',
        reference: '1:6-7',
      },
      {
        id: 'fatiha-4',
        question: 'Ar-Rahman and Ar-Raheem both mean Allah is…',
        options: ['Very strict', 'Full of mercy', 'Only for angels', 'Hidden'],
        correctAnswer: 1,
        explanation: 'Allah\'s mercy surrounds everything He created.',
        reference: '1:3',
      },
      {
        id: 'fatiha-5',
        question: 'Al-Fatiha is called the ___ of the Quran.',
        options: ['End', 'Opening', 'Middle', 'Secret'],
        correctAnswer: 1,
        explanation: 'Al-Fatiha means "The Opening" — it starts the Mushaf and starts our salah.',
        reference: '1:1',
      },
    ],
  },
  {
    slug: 'al-hujurat',
    number: 49,
    arabicName: 'الحجرات',
    englishName: 'Al-Hujurat',
    emoji: '🤝',
    ayahCount: 18,
    revelation: 'Madani',
    difficulty: 'intermediate',
    theme: 'Good manners, respect, and brotherhood in Islam',
    summary:
      'Surah Al-Hujurat teaches Muslims how to behave with each other — respect the Prophet ﷺ, verify news, avoid backbiting, and treat every believer as a brother or sister.',
    sections: [
      {
        title: 'Respect for Allah and His Messenger',
        content:
          'Allah tells us not to put ourselves before the Prophet ﷺ. We should speak with respect and follow his teachings. Raising our voice rudely or ignoring his guidance displeases Allah.',
      },
      {
        title: 'Check before you share',
        content:
          'If a troublemaker brings news, verify it first so you do not harm people by mistake. In our time this means checking WhatsApp rumours and not spreading gossip without knowing the truth.',
      },
      {
        title: 'Muslims are brothers and sisters',
        content:
          'Allah says: "The believers are but brothers." We should make peace between people who argue, treat each other fairly, and help one another. Unity makes the ummah strong.',
      },
      {
        title: 'No mockery or insults',
        content:
          'Do not mock people because of their name, looks, or background. Do not call hurtful nicknames. These small sins can grow into big problems and break friendships.',
      },
      {
        title: 'Avoid suspicion and backbiting',
        content:
          'Allah warns us not to spy on people or think bad of them without reason. Backbiting — talking badly about someone behind their back — is like eating the flesh of your dead brother. Would you like that?',
      },
      {
        title: 'We are equal, the best is the most righteous',
        content:
          'Allah created us from a man and a woman and made us into tribes so we can know each other. The noblest among us is the one with the most taqwa (God-consciousness), not the richest or loudest.',
      },
    ],
    keyAyahs: [
      { reference: '49:10', text: 'إِنَّمَا الْمُؤْمِنُونَ إِخْوَةٌ', meaning: 'The believers are but brothers.' },
      { reference: '49:12', text: 'وَلَا يَغْتَب بَّعْضُكُم بَعْضًا', meaning: 'Do not backbite one another.' },
      { reference: '49:13', text: 'إِنَّ أَكْرَمَكُمْ عِندَ اللَّهِ أَتْقَاكُمْ', meaning: 'The most noble of you in the sight of Allah is the most righteous.' },
    ],
    quizQuestions: [
      {
        id: 'hujurat-1',
        question: 'What does Allah say about believers in Surah Al-Hujurat?',
        options: ['They are competitors', 'They are brothers and sisters', 'They should stay apart', 'Only adults are believers'],
        correctAnswer: 1,
        explanation: 'Believers should support and love each other like family.',
        reference: '49:10',
      },
      {
        id: 'hujurat-2',
        question: 'What should we do if someone brings doubtful news?',
        options: ['Share it quickly', 'Verify it first', 'Ignore Islam', 'Make a video about it'],
        correctAnswer: 1,
        explanation: 'Checking news protects people from harm and lies.',
        reference: '49:6',
      },
      {
        id: 'hujurat-3',
        question: 'Backbiting means…',
        options: ['Praying for someone', 'Saying bad things about someone behind their back', 'Giving sadaqah', 'Memorising Quran'],
        correctAnswer: 1,
        explanation: 'Allah compares backbiting to something very disgusting — we must avoid it.',
        reference: '49:12',
      },
      {
        id: 'hujurat-4',
        question: 'Who is the most noble in the sight of Allah?',
        options: ['The tallest person', 'The person with most money', 'The person with most taqwa', 'The loudest speaker'],
        correctAnswer: 2,
        explanation: 'Allah looks at our hearts and actions, not our appearance or wealth.',
        reference: '49:13',
      },
      {
        id: 'hujurat-5',
        question: 'Surah Al-Hujurat was revealed in…',
        options: ['Makkah before Hijrah', 'Madinah', 'Jerusalem', 'Egypt'],
        correctAnswer: 1,
        explanation: 'It is a Madani surah — many rules for living together as a Muslim community.',
        reference: '49:1',
      },
    ],
  },
  {
    slug: 'al-kahf',
    number: 18,
    arabicName: 'الكهف',
    englishName: 'Al-Kahf',
    emoji: '🏔️',
    ayahCount: 110,
    revelation: 'Makki',
    difficulty: 'advanced',
    theme: 'Four great stories and protection from trials',
    summary:
      'Surah Al-Kahf tells four amazing stories: the People of the Cave, the man with two gardens, Musa and Khidr, and Dhul-Qarnayn. Reading it on Friday is a beloved sunnah.',
    sections: [
      {
        title: 'Why we learn Al-Kahf',
        content:
          'The Prophet ﷺ encouraged reading Surah Al-Kahf every Friday. It gives light between two Fridays and helps protect from the trials of the Dajjal. Even learning the main stories is a great start for kids.',
      },
      {
        title: 'Story 1 — The People of the Cave',
        content:
          'Young believers lived in a city where people worshipped idols. They believed in Allah alone and hid in a cave. Allah put them to sleep for hundreds of years and woke them as a sign that He controls life and death.',
      },
      {
        title: 'Story 2 — The man with two gardens',
        content:
          'A rich man bragged about his gardens and forgot to thank Allah. His friend warned him about arrogance. The gardens were destroyed overnight — a lesson that wealth can disappear and only good deeds last.',
      },
      {
        title: 'Story 3 — Musa and Khidr',
        content:
          'Prophet Musa (AS) travelled to learn special wisdom from Khidr. Three strange events happened — a damaged boat, a boy, and a wall. Musa learned that Allah\'s wisdom is deeper than what we see at first.',
      },
      {
        title: 'Story 4 — Dhul-Qarnayn',
        content:
          'A righteous ruler travelled east and west, helped people, and built a barrier against Ya\'juj and Ma\'juj until Allah allows them to be released near the end of time.',
      },
      {
        title: 'Four trials to remember',
        content:
          'Scholars link Al-Kahf to four trials: faith (Cave), wealth (gardens), knowledge (Musa & Khidr), and power (Dhul-Qarnayn). The surah teaches us to stay close to Allah in all of these.',
      },
    ],
    keyAyahs: [
      { reference: '18:10', text: 'رَبَّنَا آتِنَا مِن لَّدُنكَ رَحْمَةً', meaning: 'Our Lord, grant us mercy from Yourself.' },
      { reference: '18:24', text: 'وَقُلْ عَسَىٰ أَن يَهْدِيَنِي رَبِّي', meaning: 'Say: Perhaps my Lord will guide me.' },
      { reference: '18:110', text: 'فَمَن كَانَ يَرْجُو لِقَاءَ رَبِّهِ', meaning: 'Whoever hopes to meet his Lord — let him do good deeds.' },
    ],
    quizQuestions: [
      {
        id: 'kahf-1',
        question: 'Where did the young believers hide in the first story?',
        options: ['In a masjid', 'In a cave', 'On a ship', 'In a palace'],
        correctAnswer: 1,
        explanation: 'Al-Kahf means "The Cave" — the story of the sleepers is the heart of the surah.',
        reference: '18:9-26',
      },
      {
        id: 'kahf-2',
        question: 'What happened to the rich man\'s gardens?',
        options: ['They grew bigger', 'They were destroyed', 'He sold them', 'Nothing'],
        correctAnswer: 1,
        explanation: 'Arrogance about wealth led to loss — always thank Allah for what you have.',
        reference: '18:32-44',
      },
      {
        id: 'kahf-3',
        question: 'Which two prophets/learners travel together in Al-Kahf?',
        options: ['Ibrahim and Ismail', 'Musa and Khidr', 'Yusuf and Ya\'qub', 'Isa and Maryam'],
        correctAnswer: 1,
        explanation: 'Musa (AS) learned patience and trust in Allah\'s hidden wisdom.',
        reference: '18:60-82',
      },
      {
        id: 'kahf-4',
        question: 'Reading Surah Al-Kahf on which day is a sunnah?',
        options: ['Monday', 'Friday', 'Eid only', 'Never'],
        correctAnswer: 1,
        explanation: 'Many hadith encourage reading Al-Kahf on Jumuah for protection and light.',
        reference: '18:1',
      },
      {
        id: 'kahf-5',
        question: 'One lesson of Al-Kahf is that Allah\'s wisdom is…',
        options: ['Always easy to see', 'Sometimes hidden from us', 'Only for adults', 'Not important'],
        correctAnswer: 1,
        explanation: 'Musa could not understand Khidr\'s actions until the reasons were explained.',
        reference: '18:65-82',
      },
    ],
  },
  {
    slug: 'yaseen',
    number: 36,
    arabicName: 'يس',
    englishName: 'Yaseen',
    emoji: '💚',
    ayahCount: 83,
    revelation: 'Makki',
    difficulty: 'intermediate',
    theme: 'The heart of the Quran — resurrection and signs of Allah',
    summary:
      'Surah Yaseen is called the heart of the Quran. It speaks about the truth of the message, the signs in creation, and life after death.',
    sections: [
      {
        title: 'Heart of the Quran',
        content:
          'Prophet Muhammad ﷺ called Yaseen the heart of the Quran. Many Muslims recite it for the sick and at important times. Learning its meaning helps our iman grow stronger.',
      },
      {
        title: 'The Quran is from Allah',
        content:
          'Allah swears by the wise Quran that Muhammad ﷺ is truly a messenger. The disbelievers in Makkah were stubborn, but the truth remains clear for those who think.',
      },
      {
        title: 'Signs in nature',
        content:
          'Allah points to the sun, moon, night, day, ships on the sea, and rain that brings dead land back to life. All of these are signs for people who remember Allah.',
      },
      {
        title: 'Resurrection is real',
        content:
          'People asked: "When we die and become bones, will we be raised again?" Allah answers that He who created us the first time can create us again. Nothing is hard for Him.',
      },
      {
        title: 'Paradise for the righteous',
        content:
          'Those who believed and did good deeds will be greeted in Paradise with "Peace!" They will be with their families, rewarded for their patience.',
      },
    ],
    keyAyahs: [
      { reference: '36:1-2', text: 'يس ۚ وَالْقُرْآنِ الْحَكِيمِ', meaning: 'Ya-Sin. By the wise Quran.' },
      { reference: '36:82', text: 'إِنَّمَا أَمْرُهُ إِذَا أَرَادَ شَيْئًا', meaning: 'His command, when He intends something, is only "Be" and it is.' },
      { reference: '36:58', text: 'سَلَامٌ قَوْلًا مِّن رَّبٍّ رَّحِيمٍ', meaning: 'Peace — a word from a Merciful Lord.' },
    ],
    quizQuestions: [
      {
        id: 'yaseen-1',
        question: 'Surah Yaseen is often called the ___ of the Quran.',
        options: ['Foot', 'Heart', 'Roof', 'Cover'],
        correctAnswer: 1,
        explanation: 'This nickname shows how special and central Yaseen is.',
        reference: '36:1',
      },
      {
        id: 'yaseen-2',
        question: 'What does Allah mention as signs in Yaseen?',
        options: ['Only mountains', 'Sun, moon, rain, and ships', 'Only animals', 'Video games'],
        correctAnswer: 1,
        explanation: 'Creation points us to the Creator when we reflect.',
        reference: '36:37-42',
      },
      {
        id: 'yaseen-3',
        question: 'What did doubters ask about after death?',
        options: ['If food exists', 'If bones can be raised again', 'If salah is required', 'If moon exists'],
        correctAnswer: 1,
        explanation: 'Allah answers that resurrection is easy for Him.',
        reference: '36:78-79',
      },
      {
        id: 'yaseen-4',
        question: 'How are believers greeted in Paradise in Yaseen?',
        options: ['With exams', 'With "Peace!"', 'With silence', 'With homework'],
        correctAnswer: 1,
        explanation: 'Salam from Allah is the greatest welcome.',
        reference: '36:58',
      },
      {
        id: 'yaseen-5',
        question: 'When Allah wants something to happen, He says…',
        options: ['Maybe later', 'Be, and it is', 'Ask someone else', 'Wait 100 years'],
        correctAnswer: 1,
        explanation: 'Allah\'s power is perfect — nothing is difficult for Him.',
        reference: '36:82',
      },
    ],
  },
  {
    slug: 'al-mulk',
    number: 67,
    arabicName: 'الملك',
    englishName: 'Al-Mulk',
    emoji: '🛡️',
    ayahCount: 30,
    revelation: 'Makki',
    difficulty: 'intermediate',
    theme: 'Allah\'s kingdom and protection in the grave',
    summary:
      'Surah Al-Mulk reminds us that Allah owns everything in the heavens and earth. The Prophet ﷺ said it intercedes for the one who recites it before sleeping.',
    sections: [
      {
        title: 'Blessed is the Owner of all kingdom',
        content:
          'Allah created life and death to test who does the best deeds. He made seven heavens stacked perfectly — look at any flaw! You will not find cracks in His creation.',
      },
      {
        title: 'Stars and safety',
        content:
          'Allah decorated the lowest heaven with lamps (stars) and made them a protection against devils who try to listen to the heavens. His control is complete.',
      },
      {
        title: 'Think about creation',
        content:
          'If you walk on earth you see Allah\'s design — plants, rain, birds in the sky. Nothing supports birds except Allah. He sees everything we do.',
      },
      {
        title: 'Intercession on the Day of Judgment',
        content:
          'Disbelievers will wish they had listened. The surah itself will speak on the Day of Judgment for those who recited it and lived by its message.',
      },
      {
        title: 'Recite before sleeping',
        content:
          'The Prophet ﷺ would not sleep without reciting Al-Mulk. Many scholars say it protects a person in the grave. Even learning a portion regularly is wonderful for kids.',
      },
    ],
    keyAyahs: [
      { reference: '67:1', text: 'تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ', meaning: 'Blessed is He in whose hand is all dominion.' },
      { reference: '67:2', text: 'الَّذِي خَلَقَ الْمَوْتَ وَالْحَيَاةَ', meaning: 'Who created death and life to test you.' },
      { reference: '67:15', text: 'أَفَأَنتُم مُّؤْمِنُونَ بِبَعْضِ الْكِتَابِ', meaning: 'Do you believe in part of the Book and reject part?' },
    ],
    quizQuestions: [
      {
        id: 'mulk-1',
        question: 'Al-Mulk means…',
        options: ['The Table', 'The Kingdom / Dominion', 'The Cave', 'The Star'],
        correctAnswer: 1,
        explanation: 'Allah owns every kingdom — seen and unseen.',
        reference: '67:1',
      },
      {
        id: 'mulk-2',
        question: 'Why did Allah create death and life?',
        options: ['For fun only', 'To test who does best deeds', 'By accident', 'For animals only'],
        correctAnswer: 1,
        explanation: 'This life is a test — our actions matter.',
        reference: '67:2',
      },
      {
        id: 'mulk-3',
        question: 'How many heavens does Allah mention stacking perfectly?',
        options: ['Three', 'Seven', 'One hundred', 'None'],
        correctAnswer: 1,
        explanation: 'The perfect design of the heavens shows Allah\'s power.',
        reference: '67:3',
      },
      {
        id: 'mulk-4',
        question: 'The Prophet ﷺ recited Al-Mulk before…',
        options: ['Eating only', 'Sleeping', 'Playing football', 'Travelling only'],
        correctAnswer: 1,
        explanation: 'A nightly habit of Al-Mulk brings protection and reward.',
        reference: '67:1',
      },
      {
        id: 'mulk-5',
        question: 'Who holds up birds in the sky according to Al-Mulk?',
        options: ['Wind alone', 'Allah', 'Nothing', 'Other birds'],
        correctAnswer: 1,
        explanation: 'Allah sustains every creature — nothing stays in the sky without Him.',
        reference: '67:19',
      },
    ],
  },
  {
    slug: 'ar-rahman',
    number: 55,
    arabicName: 'الرحمن',
    englishName: 'Ar-Rahman',
    emoji: '🌺',
    ayahCount: 78,
    revelation: 'Makki',
    difficulty: 'intermediate',
    theme: 'The blessings of Allah — "Which of the favours of your Lord will you deny?"',
    summary:
      'Surah Ar-Rahman lists Allah\'s gifts: the Quran, sun and moon, fruits, seas, and Paradise. The refrain "Which of the favours of your Lord will you deny?" repeats throughout.',
    sections: [
      {
        title: 'The Most Merciful taught the Quran',
        content:
          'Allah begins by telling us He taught the Quran and created human beings. Knowledge of the Quran is one of the greatest gifts we can receive.',
      },
      {
        title: 'Balance in the universe',
        content:
          'Allah set the sun and moon on precise courses. Trees and crops grow. Everything has a limit and order — that is from Ar-Rahman.',
      },
      {
        title: 'Two seas and pearls',
        content:
          'Allah merged two seas that do not mix completely, and from the sea come pearls and coral. Even the smallest shell holds a treasure by His design.',
      },
      {
        title: 'The famous question',
        content:
          'Over and over Allah asks: "Which of the favours of your Lord will you deny?" Every blessing — eyes, family, food, faith — is a reason to say thank you.',
      },
      {
        title: 'Two gardens in Paradise',
        content:
          'Allah describes Paradise with flowing springs, fruits, comfortable seats, and companions. The righteous will enjoy this because they feared standing before Allah.',
      },
    ],
    keyAyahs: [
      { reference: '55:1', text: 'الرَّحْمَٰنُ', meaning: 'The Most Merciful.' },
      { reference: '55:13', text: 'فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ', meaning: 'So which of the favours of your Lord will you deny?' },
      { reference: '55:60', text: 'هَلْ جَزَاءُ الْإِحْسَانِ إِلَّا الْإِحْسَانُ', meaning: 'Is the reward for good anything but good?' },
    ],
    quizQuestions: [
      {
        id: 'rahman-1',
        question: 'What question repeats many times in Ar-Rahman?',
        options: ['Where is food?', 'Which favours of your Lord will you deny?', 'Who is strongest?', 'When is Eid?'],
        correctAnswer: 1,
        explanation: 'This repeating ayah makes us count our blessings.',
        reference: '55:13',
      },
      {
        id: 'rahman-2',
        question: 'Ar-Rahman means…',
        options: ['The Most Merciful', 'The Judge', 'The Hidden', 'The Angry'],
        correctAnswer: 0,
        explanation: 'Allah\'s mercy fills this surah from start to finish.',
        reference: '55:1',
      },
      {
        id: 'rahman-3',
        question: 'What did Allah teach according to the opening?',
        options: ['Football', 'The Quran', 'Cooking only', 'Swimming'],
        correctAnswer: 1,
        explanation: 'Learning Quran is a direct gift from Ar-Rahman.',
        reference: '55:1-2',
      },
      {
        id: 'rahman-4',
        question: 'What comes from the sea in Ar-Rahman?',
        options: ['Only salt', 'Pearls and coral', 'Nothing', 'Clouds only'],
        correctAnswer: 1,
        explanation: 'Allah placed beauty and benefit even in the oceans.',
        reference: '55:22',
      },
      {
        id: 'rahman-5',
        question: 'The reward for doing good is…',
        options: ['Punishment', 'More good / Paradise', 'Nothing', 'Only money'],
        correctAnswer: 1,
        explanation: 'Allah repays kindness with something even better.',
        reference: '55:60',
      },
    ],
  },
  {
    slug: 'al-waqiah',
    number: 56,
    arabicName: 'الواقعة',
    englishName: 'Al-Waqiah',
    emoji: '⚖️',
    ayahCount: 96,
    revelation: 'Makki',
    difficulty: 'intermediate',
    theme: 'The Day of Judgment and three groups of people',
    summary:
      'Surah Al-Waqiah describes the Day of Judgment and sorts people into three groups: the foremost, the people of the right, and the people of the left.',
    sections: [
      {
        title: 'The Event must happen',
        content:
          'Al-Waqiah is the great event — the Day of Judgment — that will definitely occur. When the earth shakes and mountains crumble, no one can deny that day.',
      },
      {
        title: 'Three groups',
        content:
          'People will be divided into three: (1) As-Sabiqoon — the foremost in good deeds, closest to Allah. (2) People of the right — ordinary believers who enter Paradise. (3) People of the left — those who denied and sinned.',
      },
      {
        title: 'Rewards of the foremost',
        content:
          'They will rest on jewelled thrones, drink from special springs, and enjoy fruits and meat. They will have companions of purity and peace from their Lord.',
      },
      {
        title: 'People of the right',
        content:
          'They will be among lote trees without thorns, banana trees, flowing water, and many fruits. They will hear: "Peace" — a greeting from the Merciful Lord.',
      },
      {
        title: 'Remember your creation',
        content:
          'Allah reminds us we were created from a drop of fluid. Can we not bring a grain of sand back if it falls in the ground? Allah who created us the first time will resurrect us.',
      },
    ],
    keyAyahs: [
      { reference: '56:1', text: 'إِذَا وَقَعَتِ الْوَاقِعَةُ', meaning: 'When the Occurrence occurs…' },
      { reference: '56:8-9', text: 'فَأَصْحَابُ الْمَيْمَنَةِ', meaning: 'Then the companions of the right…' },
      { reference: '56:91', text: 'سَلَامٌ عَلَيْكُمْ', meaning: 'Peace be upon you — from the Compassionate Lord.' },
    ],
    quizQuestions: [
      {
        id: 'waqiah-1',
        question: 'How many main groups of people are mentioned on Judgment Day?',
        options: ['Two', 'Three', 'Ten', 'One'],
        correctAnswer: 1,
        explanation: 'The foremost, people of the right, and people of the left.',
        reference: '56:7-10',
      },
      {
        id: 'waqiah-2',
        question: 'Al-Waqiah refers to…',
        options: ['A school', 'The great Event / Judgment Day', 'A mountain', 'A river'],
        correctAnswer: 1,
        explanation: 'Al-Waqiah is the inevitable Day everyone will face.',
        reference: '56:1',
      },
      {
        id: 'waqiah-3',
        question: 'Who are As-Sabiqoon?',
        options: ['Those who deny Allah', 'The foremost in good deeds', 'Angels only', 'Mountains'],
        correctAnswer: 1,
        explanation: 'They are the closest to Allah because of their excellence in faith.',
        reference: '56:10-11',
      },
      {
        id: 'waqiah-4',
        question: 'People of the right will hear…',
        options: ['Go away', 'Peace (Salam)', 'Nothing', 'Loud music'],
        correctAnswer: 1,
        explanation: 'Paradise begins with peace from Allah.',
        reference: '56:91',
      },
      {
        id: 'waqiah-5',
        question: 'Allah created us from…',
        options: ['Stone', 'A drop of fluid', 'Air only', 'Gold'],
        correctAnswer: 1,
        explanation: 'Knowing our humble beginning keeps us humble and grateful.',
        reference: '56:58-59',
      },
    ],
  },
  {
    slug: 'al-ikhlas',
    number: 112,
    arabicName: 'الإخلاص',
    englishName: 'Al-Ikhlas',
    emoji: '☝️',
    ayahCount: 4,
    revelation: 'Makki',
    difficulty: 'beginner',
    theme: 'Pure Tawhid — Allah is One',
    summary:
      'Surah Al-Ikhlas equals one-third of the Quran in reward. It teaches that Allah is One, eternal, and unlike anything in creation.',
    sections: [
      {
        title: 'One-third of the Quran',
        content:
          'The Prophet ﷺ said reciting Al-Ikhlas three times gives the reward of reading the whole Quran. It is short but carries huge meaning — perfect for memorising.',
      },
      {
        title: 'Say: He is Allah, One',
        content:
          'Allah is Ahad — absolutely One. There is no partner, no child, no equal. This is the core belief of Islam.',
      },
      {
        title: 'Allah is As-Samad',
        content:
          'Everything needs Allah, but Allah needs nothing. He is the Eternal Refuge — all creation depends on Him for life, food, and breath.',
      },
      {
        title: 'No likeness to creation',
        content:
          'Allah was not born and does not give birth. Nothing in the universe looks like Him. We worship Him without making images or idols.',
      },
    ],
    keyAyahs: [
      { reference: '112:1', text: 'قُلْ هُوَ اللَّهُ أَحَدٌ', meaning: 'Say: He is Allah, One.' },
      { reference: '112:2', text: 'اللَّهُ الصَّمَدُ', meaning: 'Allah, the Eternal Refuge.' },
      { reference: '112:4', text: 'وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ', meaning: 'Nor is there to Him any equivalent.' },
    ],
    juzAmmaLearnUrl: '/quran/learn/112',
    quizQuestions: [
      {
        id: 'ikhlas-1',
        question: 'How many ayahs are in Al-Ikhlas?',
        options: ['4', '7', '10', '30'],
        correctAnswer: 0,
        explanation: 'Only four ayahs — but equal to one-third of the Quran in reward!',
        reference: '112:1-4',
      },
      {
        id: 'ikhlas-2',
        question: 'What does Ahad mean?',
        options: ['Allah is One', 'Allah is tired', 'Allah is many', 'Allah is hidden'],
        correctAnswer: 0,
        explanation: 'Tawhid — believing Allah is uniquely One — is the foundation of Islam.',
        reference: '112:1',
      },
      {
        id: 'ikhlas-3',
        question: 'As-Samad means Allah…',
        options: ['Needs sleep', 'Is needed by everything', 'Is small', 'Is angry'],
        correctAnswer: 1,
        explanation: 'All creation depends on Allah; He depends on nothing.',
        reference: '112:2',
      },
      {
        id: 'ikhlas-4',
        question: 'Allah was not born and does not…',
        options: ['Create', 'Give birth', 'Show mercy', 'Send prophets'],
        correctAnswer: 1,
        explanation: 'Allah has no beginning and no children — He is unlike creation.',
        reference: '112:3',
      },
      {
        id: 'ikhlas-5',
        question: 'Al-Ikhlas means…',
        options: ['Sincerity / purity of faith', 'War', 'Food', 'Sleep'],
        correctAnswer: 0,
        explanation: 'Ikhlas is worshipping Allah alone with a pure heart.',
        reference: '112:1',
      },
    ],
  },
  {
    slug: 'an-naba',
    number: 78,
    arabicName: 'النبأ',
    englishName: 'An-Naba',
    emoji: '📣',
    ayahCount: 40,
    revelation: 'Makki',
    difficulty: 'beginner',
    theme: 'The great news of resurrection',
    summary:
      'Surah An-Naba asks about the great news — the Day of Judgment. It describes Paradise for the righteous and Hell for the arrogant deniers.',
    sections: [
      {
        title: 'What is the great news?',
        content:
          'The disbelievers argued about the Day of Judgment. Allah asks: "What are they asking one another about?" The great news is that we will all stand before Allah.',
      },
      {
        title: 'Look at the earth',
        content:
          'Allah made the earth a bed and mountains pegs so it does not shake. He created pairs in all things and made sleep for rest and night as a cover.',
      },
      {
        title: 'The Day of Decision',
        content:
          'On that day the trumpet will be blown and people will rise from graves in groups. The sky will open like gates and mountains will move like clouds.',
      },
      {
        title: 'Paradise and Hell',
        content:
          'The righteous will have gardens, flowing springs, and fruits. The wicked who denied will face Hell — a painful home for those who rejected the truth.',
      },
    ],
    keyAyahs: [
      { reference: '78:1-2', text: 'عَمَّ يَتَسَاءَلُونَ', meaning: 'About what are they asking one another?' },
      { reference: '78:31', text: 'إِنَّ لِلْمُتَّقِينَ مَفَازًا', meaning: 'Indeed, for the righteous is success.' },
      { reference: '78:40', text: 'إِنَّا أَنذَرْنَاكُمْ عَذَابًا قَرِيبًا', meaning: 'We have warned you of a near punishment.' },
    ],
    juzAmmaLearnUrl: '/quran/learn/78',
    quizQuestions: [
      {
        id: 'naba-1',
        question: 'An-Naba means…',
        options: ['The Great News', 'The Small Story', 'The River', 'The Mountain'],
        correctAnswer: 0,
        explanation: 'The great news is the reality of resurrection and Judgment Day.',
        reference: '78:2',
      },
      {
        id: 'naba-2',
        question: 'Allah made mountains like ___ to keep the earth steady.',
        options: ['Clouds', 'Pegs', 'Birds', 'Ships'],
        correctAnswer: 1,
        explanation: 'Mountains stabilise the earth — a sign of Allah\'s design.',
        reference: '78:7',
      },
      {
        id: 'naba-3',
        question: 'Who will have gardens and springs?',
        options: ['Everyone', 'The righteous (muttaqeen)', 'Only kings', 'Nobody'],
        correctAnswer: 1,
        explanation: 'Taqwa — fearing Allah and obeying Him — leads to success.',
        reference: '78:31',
      },
      {
        id: 'naba-4',
        question: 'What will happen to mountains on Judgment Day?',
        options: ['Stay still forever', 'Move like clouds', 'Turn to gold', 'Disappear quietly'],
        correctAnswer: 1,
        explanation: 'The earth as we know it will be transformed completely.',
        reference: '78:20',
      },
      {
        id: 'naba-5',
        question: 'An-Naba is from which part of the Quran?',
        options: ['Juz Amma (last juz)', 'Only page 1', 'Not in Quran', 'Only for adults'],
        correctAnswer: 0,
        explanation: 'It is the first surah of Juz Amma — a great place to start learning.',
        reference: '78:1',
      },
    ],
  },
  {
    slug: 'ad-duha',
    number: 93,
    arabicName: 'الضحى',
    englishName: 'Ad-Duha',
    emoji: '🌅',
    ayahCount: 11,
    revelation: 'Makki',
    difficulty: 'beginner',
    theme: 'Allah never abandoned you — hope after hardship',
    summary:
      'Surah Ad-Duha was revealed to comfort Prophet Muhammad ﷺ when revelation paused. Allah promises He has not forsaken him and that ease comes after hardship.',
    sections: [
      {
        title: 'Allah swears by the morning',
        content:
          'Allah swears by the bright morning and the night when it covers with darkness — beautiful times that remind us of His power every day.',
      },
      {
        title: 'You are not forgotten',
        content:
          'Allah tells the Prophet ﷺ: "Your Lord has not taken leave of you, nor has He detested you." When we feel sad, we remember Allah still cares for us.',
      },
      {
        title: 'The hereafter is better',
        content:
          'The life to come is better for the Prophet ﷺ than this world — and for every believer who stays patient and keeps faith.',
      },
      {
        title: 'Help orphans and the needy',
        content:
          'Allah reminds the Prophet ﷺ that He found him an orphan and gave him shelter, found him lost and guided him, and found him poor and made him self-sufficient. So help others the same way.',
      },
    ],
    keyAyahs: [
      { reference: '93:3', text: 'مَا وَدَّعَكَ رَبُّكَ', meaning: 'Your Lord has not taken leave of you.' },
      { reference: '93:5', text: 'وَلَلْآخِرَةُ خَيْرٌ لَّكَ', meaning: 'The Hereafter is better for you than the first life.' },
      { reference: '93:11', text: 'وَأَمَّا بِنِعْمَةِ رَبِّكَ فَحَدِّثْ', meaning: 'As for the favour of your Lord, proclaim it.' },
    ],
    juzAmmaLearnUrl: '/quran/learn/93',
    quizQuestions: [
      {
        id: 'duha-1',
        question: 'Ad-Duha means…',
        options: ['The morning brightness', 'The night', 'The sea', 'The star'],
        correctAnswer: 0,
        explanation: 'Duha is the forenoon — bright and hopeful like the message of the surah.',
        reference: '93:1',
      },
      {
        id: 'duha-2',
        question: 'Allah tells the Prophet ﷺ he has NOT been…',
        options: ['Given Quran', 'Forsaken / abandoned', 'Sent to people', 'Created'],
        correctAnswer: 1,
        explanation: 'This surah brought comfort when the Prophet ﷺ worried about a pause in revelation.',
        reference: '93:3',
      },
      {
        id: 'duha-3',
        question: 'What is better than this worldly life for believers?',
        options: ['Video games', 'The Hereafter', 'Sleep only', 'Money only'],
        correctAnswer: 1,
        explanation: 'Jannah and meeting Allah are the true success.',
        reference: '93:4',
      },
      {
        id: 'duha-4',
        question: 'Who should we help according to Ad-Duha?',
        options: ['Only rich people', 'Orphans and the needy', 'Nobody', 'Only friends'],
        correctAnswer: 1,
        explanation: 'The Prophet ﷺ was cared for as an orphan — we should care for others too.',
        reference: '93:9-10',
      },
      {
        id: 'duha-5',
        question: 'We should speak about…',
        options: ['Bad gossip', 'Allah\'s favours upon us', 'Secrets only', 'Nothing'],
        correctAnswer: 1,
        explanation: 'Sharing gratitude spreads hope and iman.',
        reference: '93:11',
      },
    ],
  },
  {
    slug: 'al-asr',
    number: 103,
    arabicName: 'العصر',
    englishName: 'Al-Asr',
    emoji: '⏳',
    ayahCount: 3,
    revelation: 'Makki',
    difficulty: 'beginner',
    theme: 'Time — success is through faith, good deeds, and patience',
    summary:
      'Surah Al-Asr is only three ayahs but Imam Shafi\'i said if people pondered it alone, it would be enough. It teaches the formula for success.',
    sections: [
      {
        title: 'By time',
        content:
          'Allah swears by time — every second matters. We should not waste our days on things that do not bring us closer to Allah.',
      },
      {
        title: 'Humanity is in loss',
        content:
          'Except those who believe, do righteous deeds, advise each other to truth, and advise each other to patience. Everyone else loses unless they follow this path.',
      },
      {
        title: 'Four keys to success',
        content:
          '(1) Faith in Allah. (2) Good deeds. (3) Telling others to hold onto truth. (4) Telling others to be patient. This is the Muslim formula for a successful life.',
      },
    ],
    keyAyahs: [
      { reference: '103:1', text: 'وَالْعَصْرِ', meaning: 'By time.' },
      { reference: '103:2', text: 'إِنَّ الْإِنسَانَ لَفِي خُسْرٍ', meaning: 'Indeed, mankind is in loss.' },
      { reference: '103:3', text: 'إِلَّا الَّذِينَ آمَنُوا', meaning: 'Except those who believe and do righteous deeds…' },
    ],
    juzAmmaLearnUrl: '/quran/learn/103',
    quizQuestions: [
      {
        id: 'asr-1',
        question: 'How many ayahs are in Al-Asr?',
        options: ['3', '7', '10', '50'],
        correctAnswer: 0,
        explanation: 'Small in size, huge in meaning — one of the shortest surahs.',
        reference: '103:1-3',
      },
      {
        id: 'asr-2',
        question: 'Allah swears by…',
        options: ['Money', 'Time (Al-Asr)', 'Mountains only', 'Food'],
        correctAnswer: 1,
        explanation: 'Time is precious — use it for iman and good deeds.',
        reference: '103:1',
      },
      {
        id: 'asr-3',
        question: 'People are in loss EXCEPT those who…',
        options: ['Are rich', 'Believe and do good deeds', 'Are famous', 'Play games all day'],
        correctAnswer: 1,
        explanation: 'Faith plus action saves us from loss.',
        reference: '103:3',
      },
      {
        id: 'asr-4',
        question: 'Two things believers should encourage in each other:',
        options: ['Laziness and gossip', 'Truth and patience', 'Cheating and lying', 'Silence only'],
        correctAnswer: 1,
        explanation: 'Good friends remind us of haqq and sabr.',
        reference: '103:3',
      },
      {
        id: 'asr-5',
        question: 'Imam Shafi\'i said if people understood only this surah, it would be…',
        options: ['Useless', 'Enough for them', 'Too hard', 'Only for scholars'],
        correctAnswer: 1,
        explanation: 'Al-Asr packs the whole roadmap of success into three ayahs.',
        reference: '103:1-3',
      },
    ],
  },
  {
    slug: 'an-nas',
    number: 114,
    arabicName: 'الناس',
    englishName: 'An-Nas',
    emoji: '🛡️',
    ayahCount: 6,
    revelation: 'Makki',
    difficulty: 'beginner',
    theme: 'Seeking refuge from whispers of Shaytan',
    summary:
      'Surah An-Nas is the last surah of the Quran. With Al-Falaq it protects us when recited. We ask Allah — Lord of mankind — to guard us from evil whispers.',
    sections: [
      {
        title: 'Lord of mankind',
        content:
          'We begin by naming Allah as Rabb, Malik, and Ilah of people — the One who cares for us, rules us, and alone deserves worship.',
      },
      {
        title: 'The whisperer',
        content:
          'Shaytan whispers evil into hearts — making us jealous, scared, or angry. He hides and tries again when we forget Allah.',
      },
      {
        title: 'Seek refuge in Allah',
        content:
          'We ask Allah to protect us from jinn and humans who whisper harm. Reciting An-Nas and Al-Falaq before sleep is a sunnah the Prophet ﷺ taught.',
      },
      {
        title: 'Closing the Quran',
        content:
          'An-Nas ends the Mushaf where Al-Fatiha opened it — both are surahs of protection and dua. Learning them by heart is one of the best gifts a kid can memorise.',
      },
    ],
    keyAyahs: [
      { reference: '114:1', text: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ', meaning: 'Say: I seek refuge in the Lord of mankind.' },
      { reference: '114:4', text: 'مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ', meaning: 'From the evil of the retreating whisperer.' },
      { reference: '114:6', text: 'مِنَ الْجِنَّةِ وَالنَّاسِ', meaning: 'From among jinn and mankind.' },
    ],
    juzAmmaLearnUrl: '/quran/learn/114',
    quizQuestions: [
      {
        id: 'nas-1',
        question: 'An-Nas is surah number…',
        options: ['1', '112', '114 (last surah)', '50'],
        correctAnswer: 2,
        explanation: 'It closes the Quran — pair it with Al-Falaq (113) for protection.',
        reference: '114:1',
      },
      {
        id: 'nas-2',
        question: 'We seek refuge from the whisperer who…',
        options: ['Helps us pray', 'Whispers evil and hides', 'Gives us food', 'Teaches Quran'],
        correctAnswer: 1,
        explanation: 'Waswas is the sneaky voice that pushes bad thoughts.',
        reference: '114:4-5',
      },
      {
        id: 'nas-3',
        question: 'An-Nas mentions refuge from jinn and…',
        options: ['Animals only', 'Mankind', 'Angels', 'Stars'],
        correctAnswer: 1,
        explanation: 'Harm can come from seen and unseen sources — Allah protects both.',
        reference: '114:6',
      },
      {
        id: 'nas-4',
        question: 'Which surah is often recited together with An-Nas for protection?',
        options: ['Al-Baqarah', 'Al-Falaq', 'Yaseen only', 'None'],
        correctAnswer: 1,
        explanation: 'Al-Mu\'awwidhatayn — Al-Falaq and An-Nas — are a protective pair.',
        reference: '113-114',
      },
      {
        id: 'nas-5',
        question: 'In An-Nas, Allah is called Lord (Rabb) of…',
        options: ['Mankind', 'Only animals', 'Only angels', 'Nobody'],
        correctAnswer: 0,
        explanation: 'Allah cares for every human being He created.',
        reference: '114:1',
      },
    ],
  },
];

export function getSurahCourseBySlug(slug: string): SurahCourse | undefined {
  return SURAH_COURSES.find((course) => course.slug === slug);
}

export function getSurahCourseByNumber(number: number): SurahCourse | undefined {
  return SURAH_COURSES.find((course) => course.number === number);
}

export const SURAH_COURSE_SLUGS = SURAH_COURSES.map((course) => course.slug);

export function getDifficultyLabel(difficulty: SurahCourseDifficulty): string {
  switch (difficulty) {
    case 'beginner':
      return 'Beginner';
    case 'intermediate':
      return 'Intermediate';
    case 'advanced':
      return 'Advanced';
    default:
      return difficulty;
  }
}

export function scoreSurahQuiz(
  course: SurahCourse,
  answers: number[]
): { correct: number; total: number; percent: number; passed: boolean } {
  const total = course.quizQuestions.length;
  let correct = 0;
  course.quizQuestions.forEach((question, index) => {
    if (answers[index] === question.correctAnswer) correct += 1;
  });
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  return { correct, total, percent, passed: percent >= 80 };
}

export type SurahCourseProgress = Record<
  string,
  { completed: boolean; score: number; percent: number; completedAt: string }
>;

export function getSurahProgressStorageKey(userId: string) {
  return `surah-course-progress-${userId}`;
}

export function readSurahProgress(userId: string): SurahCourseProgress {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(getSurahProgressStorageKey(userId));
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writeSurahProgress(userId: string, progress: SurahCourseProgress) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getSurahProgressStorageKey(userId), JSON.stringify(progress));
}
