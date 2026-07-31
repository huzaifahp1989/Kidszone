export type ChallengeQuizKey = 'quran-stories' | 'fiqh' | 'aug-2026-mixed';

export interface ChallengeQuestion {
  id: string;
  prompt: string;
  answer: string;
  acceptedAnswers: string[];
  explanation: string;
  isBonus: boolean;
  points: number;
  /**
   * Optional topic grouping used by the Aug 2026 mixed quiz (8 themes) so the
   * admin review queue groups answers by category and the leaderboard can
   * show per-topic stats.
   */
  topic?: 'Seerah' | 'Hadith' | 'Quran' | 'Sahabah' | 'Prophets' | 'Akhlaq' | 'Fiqh' | 'General';
}

export interface ChallengeQuizConfig {
  key: ChallengeQuizKey;
  title: string;
  emoji: string;
  description: string;
  passScore: number;
  awardsBadge: boolean;
  /**
   * When true, the quiz switches to manual review mode. Kids type open-ended
   * answers for every question; admins judge each answer manually through the
   * Admin → Manual Quiz Submissions queue and award points per answer.
   */
  manualReview?: boolean;
  questions: ChallengeQuestion[];
}

export const CHALLENGE_TIMER_SECONDS = 30 * 60;

const QURAN_STORIES_QUESTIONS: ChallengeQuestion[] = [
  {
    id: 'qs-nuh-950',
    prompt: 'Which Prophet called his people to Allah for 950 years before the great flood?',
    answer: 'Nuh',
    acceptedAnswers: ['Nooh', 'Noah', 'Prophet Nuh'],
    explanation: 'Allah says Prophet Nuh (AS) stayed among his people for a thousand years less fifty — 950 years (Surah Al-Ankabut 29:14).',
    isBonus: false,
    points: 1,
    topic: 'Prophets',
  },
  {
    id: 'qs-ibrahim-birds',
    prompt: 'Which Prophet asked Allah to show him how He brings the dead back to life, and was told to take four birds?',
    answer: 'Ibrahim',
    acceptedAnswers: ['Ibraheem', 'Abraham', 'Prophet Ibrahim'],
    explanation: 'Prophet Ibrahim (AS) asked to see how the dead are given life; Allah told him to take four birds (Surah Al-Baqarah 2:260).',
    isBonus: false,
    points: 1,
    topic: 'Prophets',
  },
  {
    id: 'qs-yusuf-dream',
    prompt: "Which Prophet explained the king of Egypt's dream of seven fat cows eaten by seven thin cows?",
    answer: 'Yusuf',
    acceptedAnswers: ['Yousuf', 'Yussef', 'Joseph', 'Prophet Yusuf'],
    explanation: 'Prophet Yusuf (AS) interpreted the dream as seven years of plenty followed by seven years of hardship (Surah Yusuf 12:43-49).',
    isBonus: false,
    points: 1,
    topic: 'Prophets',
  },
  {
    id: 'qs-musa-signs',
    prompt: 'Which Prophet was sent to Firaun (Pharaoh) with nine clear signs from Allah?',
    answer: 'Musa',
    acceptedAnswers: ['Moosa', 'Moses', 'Prophet Musa'],
    explanation: 'Allah gave Prophet Musa (AS) nine clear signs to take to Firaun (Surah Al-Isra 17:101).',
    isBonus: false,
    points: 1,
    topic: 'Prophets',
  },
  {
    id: 'qs-yunus-city',
    prompt: "Prophet Yunus was sent to a city whose people finally believed and were saved from punishment. What was the Prophet's name?",
    answer: 'Yunus',
    acceptedAnswers: ['Yoonus', 'Jonah', 'Dhun-Nun', 'Prophet Yunus'],
    explanation: 'The people of Yunus (AS) — the people of Nineveh — believed, so Allah removed the punishment from them (Surah Yunus 10:98).',
    isBonus: false,
    points: 1,
    topic: 'Prophets',
  },
  {
    id: 'qs-sulayman-throne',
    prompt: 'Which Prophet had the throne of the Queen of Sheba (Bilqis) brought to him in the blink of an eye?',
    answer: 'Sulayman',
    acceptedAnswers: ['Sulaiman', 'Suleiman', 'Solomon', 'Prophet Sulayman'],
    explanation: 'By Allah’s power, one who had knowledge of the Book brought the Queen’s throne to Prophet Sulayman (AS) in an instant (Surah An-Naml 27:38-40).',
    isBonus: false,
    points: 1,
    topic: 'Prophets',
  },
  {
    id: 'qs-dawud-iron',
    prompt: 'Which Prophet did Allah teach to make coats of armour by softening iron for him?',
    answer: 'Dawud',
    acceptedAnswers: ['Dawood', 'Daud', 'David', 'Prophet Dawud'],
    explanation: 'Allah softened iron for Prophet Dawud (AS) and taught him to make armour (Surah Al-Anbiya 21:80; Surah Saba 34:10-11).',
    isBonus: false,
    points: 1,
    topic: 'Prophets',
  },
  {
    id: 'qs-isa-injeel',
    prompt: 'Which Prophet was given the Injeel (Gospel) and, by Allah’s permission, healed the blind and the lepers?',
    answer: 'Isa',
    acceptedAnswers: ['Eesa', 'Jesus', 'Prophet Isa'],
    explanation: 'Prophet Isa (AS) was given the Injeel and, by Allah’s leave, healed the blind and lepers and gave life to the dead (Surah Aal-e-Imran 3:49).',
    isBonus: false,
    points: 1,
    topic: 'Prophets',
  },
  {
    id: 'qs-ayyub',
    prompt: 'Which Prophet is the great example of patience (sabr), who stayed thankful to Allah through years of illness and loss?',
    answer: 'Ayyub',
    acceptedAnswers: ['Ayoub', 'Ayub', 'Job', 'Prophet Ayyub'],
    explanation: 'Prophet Ayyub (AS) was patient through severe trials, and Allah restored his health and family (Surah Al-Anbiya 21:83-84; Surah Sad 38:41-44).',
    isBonus: false,
    points: 1,
    topic: 'Prophets',
  },
  {
    id: 'qs-hijrah',
    prompt: 'What is the name of Prophet Muhammad ﷺ’s migration from Makkah to Madinah?',
    answer: 'Hijrah',
    acceptedAnswers: ['Hijra', 'Hejira', 'Hijrat', 'The Hijrah'],
    explanation: 'The Hijrah was the Prophet ﷺ’s migration from Makkah to Madinah; it marks the start of the Islamic calendar.',
    isBonus: false,
    points: 1,
    topic: 'Seerah',
  },
  {
    id: 'qs-bonus-khidr',
    prompt: 'BONUS: What is the name of the wise servant of Allah whom Prophet Musa travelled with to learn hidden knowledge?',
    answer: 'Khidr',
    acceptedAnswers: ['Al-Khidr', 'Khizr', 'Khadir', 'Khidhr', 'Al Khidr'],
    explanation: 'Prophet Musa (AS) travelled to learn from Al-Khidr, a servant given special knowledge by Allah (Surah Al-Kahf 18:65-82).',
    isBonus: true,
    points: 2,
    topic: 'Quran',
  },
];

const FIQH_QUESTIONS: ChallengeQuestion[] = [
  {
    id: 'fq-rakahs-total',
    prompt: 'How many fard (obligatory) rak’ahs are prayed in total across the five daily prayers?',
    answer: '17',
    acceptedAnswers: ['seventeen', '17 rakahs', '17 rakats'],
    explanation: 'Fajr 2 + Dhuhr 4 + Asr 4 + Maghrib 3 + Isha 4 = 17 fard rak’ahs each day.',
    isBonus: false,
    points: 1,
    topic: 'Fiqh',
  },
  {
    id: 'fq-wudu-fard',
    prompt: 'How many obligatory (fard) acts of wudu are mentioned in the Quran (Surah Al-Maidah 5:6)?',
    answer: '4',
    acceptedAnswers: ['four', '4 acts', 'four acts'],
    explanation: 'The Quran mentions four: washing the face, washing the arms to the elbows, wiping the head, and washing the feet (Surah Al-Maidah 5:6).',
    isBonus: false,
    points: 1,
    topic: 'Fiqh',
  },
  {
    id: 'fq-tayammum-earth',
    prompt: 'What clean, natural thing is used to perform Tayammum when there is no water?',
    answer: 'Earth',
    acceptedAnswers: ['Dust', 'Clean earth', 'Sand', 'Soil', 'Dirt', 'Clean dust'],
    explanation: 'Tayammum is made with clean earth/dust when water is not available or would cause harm (Surah Al-Maidah 5:6).',
    isBonus: false,
    points: 1,
    topic: 'Fiqh',
  },
  {
    id: 'fq-nisab',
    prompt: 'What is the minimum amount of wealth a Muslim must own before Zakat becomes obligatory called?',
    answer: 'Nisab',
    acceptedAnswers: ['Nisaab', 'Nisab threshold', 'Niscab'],
    explanation: 'The Nisab is the minimum threshold of wealth (held for a lunar year) that makes Zakat due.',
    isBonus: false,
    points: 1,
    topic: 'Fiqh',
  },
  {
    id: 'fq-niyyah',
    prompt: 'What is the Arabic word for the intention a Muslim makes in the heart before fasting or Salah?',
    answer: 'Niyyah',
    acceptedAnswers: ['Niyah', 'Niyat', 'Niyyat', 'Intention', 'Niyyah intention'],
    explanation: 'The Prophet ﷺ said, “Actions are but by intentions (niyyah)” (Sahih al-Bukhari 1).',
    isBonus: false,
    points: 1,
    topic: 'Fiqh',
  },
  {
    id: 'fq-eid-adha',
    prompt: 'What is the name of the Eid celebrated during Hajj, when Muslims sacrifice an animal?',
    answer: 'Eid al-Adha',
    acceptedAnswers: ['Eid ul Adha', 'Eid ul-Adha', 'Eidul Adha', 'Eid Adha', 'Bakra Eid', 'Qurbani Eid'],
    explanation: 'Eid al-Adha, the festival of sacrifice, remembers Prophet Ibrahim’s (AS) willingness to obey Allah (Surah As-Saffat 37:102-107).',
    isBonus: false,
    points: 1,
    topic: 'Fiqh',
  },
  {
    id: 'fq-ghusl',
    prompt: 'What is the full-body ritual washing (bath) that restores purity after major impurity called?',
    answer: 'Ghusl',
    acceptedAnswers: ['Gusl', 'Ghusul', 'Ghusal', 'Ritual bath'],
    explanation: 'Ghusl is the complete washing of the body required for full purity (Surah Al-Maidah 5:6).',
    isBonus: false,
    points: 1,
    topic: 'Fiqh',
  },
  {
    id: 'fq-iqamah',
    prompt: 'What is the second, shorter call said just before the congregation stands to begin Salah called?',
    answer: 'Iqamah',
    acceptedAnswers: ['Iqama', 'Iqaamah', 'Iqamat', 'Iqaama'],
    explanation: 'The Iqamah is the second call, announced immediately before the fard prayer begins in congregation.',
    isBonus: false,
    points: 1,
    topic: 'Fiqh',
  },
  {
    id: 'fq-qibla',
    prompt: 'What is the name of the direction (towards the Kaaba) that Muslims face during Salah?',
    answer: 'Qibla',
    acceptedAnswers: ['Qiblah', 'Kaaba direction', 'Qiblah direction'],
    explanation: 'Allah commanded the believers to turn their faces towards the Sacred Mosque (the Kaaba) — the Qibla (Surah Al-Baqarah 2:144).',
    isBonus: false,
    points: 1,
    topic: 'Fiqh',
  },
  {
    id: 'fq-akhlaq',
    prompt: 'What is the Arabic word for good character and manners, which the Prophet ﷺ was sent to perfect?',
    answer: 'Akhlaq',
    acceptedAnswers: ['Akhlaaq', 'Ikhlaq', 'Good manners', 'Good character', 'Akhlaq'],
    explanation: 'The Prophet ﷺ said, “I was sent to perfect good character (akhlaq)” (Al-Adab Al-Mufrad 273).',
    isBonus: false,
    points: 1,
    topic: 'Akhlaq',
  },
  {
    id: 'fq-bonus-laylatul-qadr',
    prompt: 'BONUS: What is the special night in the last ten days of Ramadan that is better than a thousand months called?',
    answer: 'Laylatul Qadr',
    acceptedAnswers: ['Laylat al-Qadr', 'Lailatul Qadr', 'Laylatul Qadar', 'Night of Power', 'Night of Decree', 'Qadr'],
    explanation: 'Laylatul Qadr (the Night of Power) is better than a thousand months (Surah Al-Qadr 97:3).',
    isBonus: true,
    points: 2,
    topic: 'Quran',
  },
];

// ============================================================
// AUGUST 2026 MIXED ISLAMIC QUIZ — 40 unique questions
// 8 themes × 5 Qs each: Seerah, Hadith, Quran, Sahabah,
// Prophets, Akhlaq, Fiqh, and General (bonus-themed).
// No repeats from the quran-stories or fiqh pools above.
// ============================================================

const AUG_2026_MIXED_QUESTIONS: ChallengeQuestion[] = [
  // --- Theme 1: SEERAH (5) ---
  {
    id: 'aug-seerah-1',
    topic: 'Seerah',
    prompt: 'What is the name of the cave where Prophet Muhammad ﷺ received the first revelation from Angel Jibril?',
    answer: 'Hira',
    acceptedAnswers: ['Cave Hira', 'Ghar Hira', 'Jabal an-Nur', 'Mount Nur', 'Mount Hira'],
    explanation: 'The first revelation came to Prophet Muhammad ﷺ in the Cave of Hira on Jabal an-Nur, in Makkah.',
    isBonus: false,
    points: 3,
  },
  {
    id: 'aug-seerah-2',
    topic: 'Seerah',
    prompt: 'What was the name of the very first year of Prophethood called, when the Prophet ﷺ first began to invite people secretly?',
    answer: "Dawat al-Asrar",
    acceptedAnswers: ['Secret invitation', 'Secret da’wah', 'Dawat Asrar', 'Dawah al-Asrar'],
    explanation: 'For the first three years after Prophethood the Prophet ﷺ invited people to Islam secretly before the open call in public.',
    isBonus: false,
    points: 3,
  },
  {
    id: 'aug-seerah-3',
    topic: 'Seerah',
    prompt: 'In which battle did the disbelievers break their treaty and attack Madinah from the north, and the Sahabah dug a great trench?',
    answer: 'Khandaq',
    acceptedAnswers: ['Battle of the Trench', 'Ghazwah al-Khandaq', 'Ahzab', 'Battle of Ahzab'],
    explanation: 'The Battle of Khandaq (Trench / Ahzab) — the Sahabah dug a long trench following the advice of Salman al-Farsi (RA).',
    isBonus: false,
    points: 4,
  },
  {
    id: 'aug-seerah-4',
    topic: 'Seerah',
    prompt: 'What was the name of the treaty the Prophet ﷺ signed with the Quraysh that stopped fighting for 10 years?',
    answer: 'Hudaybiyyah',
    acceptedAnswers: ['Treaty of Hudaybiyyah', 'Hudaibiya', 'Treaty of Hudaibiya'],
    explanation: 'The Treaty of Hudaybiyyah brought a 10-year peace and was, in the eyes of Allah, a clear victory (Surah Al-Fath 48:1).',
    isBonus: false,
    points: 3,
  },
  {
    id: 'aug-seerah-5',
    topic: 'Seerah',
    prompt: 'What is the name of the final sermon the Prophet ﷺ delivered during his last Hajj?',
    answer: "Khutbatul Wada'",
    acceptedAnswers: ['Farewell Sermon', 'Khutbah Wada', 'Last Sermon', 'Khutbat ul-Wada'],
    explanation: 'The Farewell Sermon (Khutbatul Wada’) was delivered on the 9th of Dhul-Hijjah in the Uranah valley of Arafat during Hajjatul Wida.’',
    isBonus: false,
    points: 4,
  },

  // --- Theme 2: HADITH (5) ---
  {
    id: 'aug-hadith-1',
    topic: 'Hadith',
    prompt: 'The Prophet ﷺ said “Actions are judged only by _______.” Complete this most famous hadith.',
    answer: 'Intentions',
    acceptedAnswers: ['Intention', 'Niyyah', 'Niyah', 'By intentions'],
    explanation: 'Hadith #1 in Sahih al-Bukhari and Sahih Muslim: “Actions are (judged) by intentions, and each person will have what he intended.”',
    isBonus: false,
    points: 3,
  },
  {
    id: 'aug-hadith-2',
    topic: 'Hadith',
    prompt: 'The Prophet ﷺ said “None of you truly believes until he loves for his brother what he loves for _______.”',
    answer: 'Himself',
    acceptedAnswers: ['His own self', 'Him', 'His own nafs'],
    explanation: 'A foundational hadith in Sahih al-Bukhari and Muslim — loving for your Muslim brother what you love for yourself.',
    isBonus: false,
    points: 3,
  },
  {
    id: 'aug-hadith-3',
    topic: 'Hadith',
    prompt: 'Complete: “The best of you are those who learn the _______ and teach it.” (Sahih al-Bukhari)',
    answer: 'Quran',
    acceptedAnswers: ['Qur’an', 'Quran Kareem', 'Book of Allah'],
    explanation: 'The Prophet ﷺ said: “The best among you are those who learn the Quran and teach it.” (Sahih al-Bukhari 5027).',
    isBonus: false,
    points: 3,
  },
  {
    id: 'aug-hadith-4',
    topic: 'Hadith',
    prompt: 'Which hadith collection is called “Sahih” and is generally accepted as the most authentic book after the Quran?',
    answer: 'Sahih al-Bukhari',
    acceptedAnswers: ['Bukhari', 'Sahih Bukhari', 'Muhammad al-Bukhari', 'Sahihayn', 'Sahih Muslim', 'The two Sahihs'],
    explanation: 'Sahih al-Bukhari compiled by Imam Muhammad ibn Ismail al-Bukhari (RA) is considered the most authentic hadith book after the Noble Quran.',
    isBonus: false,
    points: 4,
  },
  {
    id: 'aug-hadith-5',
    topic: 'Hadith',
    prompt: 'BONUS: The Prophet ﷺ said “Smiling at your brother is _______.” Fill in the blank.',
    answer: 'Charity',
    acceptedAnswers: ['Sadaqah', 'A charity', 'An act of charity', 'Sadaqah voluntary'],
    explanation: 'A beloved hadith in Tirmidhi: smiling in the face of your brother is a charity (sadaqah).',
    isBonus: true,
    points: 5,
  },

  // --- Theme 3: QURAN (5) ---
  {
    id: 'aug-quran-1',
    topic: 'Quran',
    prompt: 'Which Surah of the Quran is called “The Heart of the Quran” and recited abundantly in every prayer?',
    answer: 'Al-Fatihah',
    acceptedAnswers: ['Surah Al-Fatihah', 'Fatiha', 'The Opening', 'Surah Fatiha'],
    explanation: 'Surah Al-Fatihah (the Opening, 7 ayahs) is known as Umm ul-Quran — the Mother of the Quran.',
    isBonus: false,
    points: 3,
  },
  {
    id: 'aug-quran-2',
    topic: 'Quran',
    prompt: 'What is the longest Surah in the entire Quran?',
    answer: 'Al-Baqarah',
    acceptedAnswers: ['Surah Baqarah', 'Surah Al-Baqarah', 'The Cow'],
    explanation: 'Surah Al-Baqarah (286 ayahs — the Cow) is the longest Surah and contains the famous Ayat ul-Kursi.',
    isBonus: false,
    points: 3,
  },
  {
    id: 'aug-quran-3',
    topic: 'Quran',
    prompt: 'In which Surah will you find Ayat ul-Kursi — the greatest single verse of the Quran?',
    answer: 'Al-Baqarah',
    acceptedAnswers: ['Surah Al-Baqarah', 'Baqarah 255', 'Ayah 255 of Al-Baqarah', 'Surah Baqarah'],
    explanation: 'Ayat ul-Kursi (The Throne Verse — 2:255) is widely called the greatest ayah of the Quran (Sahih al-Bukhari).',
    isBonus: false,
    points: 4,
  },
  {
    id: 'aug-quran-4',
    topic: 'Quran',
    prompt: 'Which Surah does not begin with Bismillah?',
    answer: 'At-Tawbah',
    acceptedAnswers: ['Surah Taubah', 'Surah At-Tawbah', 'Surah Bara’ah', 'Al-Bara’ah', 'Taubah'],
    explanation: 'Surah At-Tawbah (The Repentance / Bara’ah) is the only Surah in the Quran that does not open with Bismillahir-Rahmanir-Raheem.',
    isBonus: false,
    points: 4,
  },
  {
    id: 'aug-quran-5',
    topic: 'Quran',
    prompt: 'BONUS: Which Surah has two Bismillahs (one in the beginning and one in the middle)?',
    answer: 'An-Naml',
    acceptedAnswers: ['Surah An-Naml', 'Namal', 'Surah Naml', 'The Ant'],
    explanation: 'Surah An-Naml (The Ant) begins once with Bismillah and contains a second Bismillah in verse 30 when Prophet Sulayman reads the letter of Queen Bilqis.',
    isBonus: true,
    points: 5,
  },

  // --- Theme 4: SAHABAH (5) ---
  {
    id: 'aug-sahabah-1',
    topic: 'Sahabah',
    prompt: 'Who was the very first male child to accept Islam?',
    answer: 'Ali ibn Abi Talib',
    acceptedAnswers: ['Ali (RA)', 'Ali', 'Hazrat Ali', 'Ali ibn Abu Talib'],
    explanation: 'Ali ibn Abi Talib (RA), at only 10 years old, was the first male child to embrace Islam. The first male adult was Abu Bakr (RA).',
    isBonus: false,
    points: 3,
  },
  {
    id: 'aug-sahabah-2',
    topic: 'Sahabah',
    prompt: 'Who was known as “The Truthful” (As-Siddiq), the first Caliph of Islam after the Prophet ﷺ?',
    answer: 'Abu Bakr',
    acceptedAnswers: ['Abu Bakr as-Siddiq', 'Abu Bakr (RA)', 'Hazrat Abu Bakr', 'Abdullah ibn Abi Quhafah'],
    explanation: 'Abu Bakr as-Siddiq (RA) was the closest companion of the Prophet ﷺ and the first of the Rightly Guided Caliphs (Al-Khulafa Ar-Rashidun).',
    isBonus: false,
    points: 3,
  },
  {
    id: 'aug-sahabah-3',
    topic: 'Sahabah',
    prompt: 'Who was the Sahabi (companion) who carried the Prophet ﷺ’s banner in many battles and was nicknamed “The Lion of Allah”?',
    answer: 'Hamza ibn Abdul-Muttalib',
    acceptedAnswers: ['Hamza (RA)', 'Hamzah', 'Uncle of Prophet', 'Hamza', 'Asadullah'],
    explanation: 'Hamza ibn Abdul-Muttalib (RA), the uncle of the Prophet ﷺ, was martyred at Uhud and is called “Asadullah — the Lion of Allah.”',
    isBonus: false,
    points: 4,
  },
  {
    id: 'aug-sahabah-4',
    topic: 'Sahabah',
    prompt: 'Which companion was sent to Madinah to teach Islam before the Hijrah, and is known as “The Great Scholar of this Ummah”?',
    answer: 'Musab ibn Umayr',
    acceptedAnswers: ['Musab (RA)', 'Musab bin Umair', 'Musab ibn Umair'],
    explanation: 'Musab ibn Umayr (RA) was sent as the first teacher of Islam to Madinah, winning many Ansar to Iman before the Hijrah.',
    isBonus: false,
    points: 4,
  },
  {
    id: 'aug-sahabah-5',
    topic: 'Sahabah',
    prompt: 'BONUS: Who was the first female martyr (shaheedah) in Islam?',
    answer: 'Sumayyah bint Khayyat',
    acceptedAnswers: ['Sumayyah (RA)', 'Sumaya', 'Hazrat Sumayya', 'Sumayyah'],
    explanation: 'Sumayyah bint Khayyat (RA) was tortured and killed for her faith in Makkah — the very first woman martyr in the history of Islam.',
    isBonus: true,
    points: 5,
  },

  // --- Theme 5: PROPHETS (5) ---
  {
    id: 'aug-prophets-1',
    topic: 'Prophets',
    prompt: 'Which Prophet is given the title “Khalil-ur-Rahman” — the Beloved Friend of Allah?',
    answer: 'Ibrahim (AS)',
    acceptedAnswers: ['Ibrahim', 'Ibraheem', 'Abraham', 'Prophet Ibrahim', 'Khalilullah'],
    explanation: 'Prophet Ibrahim (AS) is the only one in the Quran given the title of Khalil — the true, intimate Friend of Allah.',
    isBonus: false,
    points: 3,
  },
  {
    id: 'aug-prophets-2',
    topic: 'Prophets',
    prompt: 'Which Prophet could speak to the Jinn and animals and was granted a kingdom the likes of which no one will be given again?',
    answer: 'Sulayman (AS)',
    acceptedAnswers: ['Sulayman', 'Solomon', 'Suleiman', 'Sulaiman', 'Prophet Sulayman'],
    explanation: 'Prophet Sulayman (AS) was granted control over winds, jinn, animals, the birds, and flowing metal — a kingdom of wonders.',
    isBonus: false,
    points: 3,
  },
  {
    id: 'aug-prophets-3',
    topic: 'Prophets',
    prompt: 'Which Prophet and his people were saved from a tyrannical king by crossing the Red Sea on dry land?',
    answer: 'Musa (AS)',
    acceptedAnswers: ['Musa', 'Moses', 'Moosa', 'Prophet Musa'],
    explanation: 'By the command of Allah, Musa (AS) struck the sea with his staff and the water split into twelve paths for Bani Israel to cross safely.',
    isBonus: false,
    points: 3,
  },
  {
    id: 'aug-prophets-4',
    topic: 'Prophets',
    prompt: 'Which Prophet was swallowed by a great fish because he left his people without Allah’s permission?',
    answer: 'Yunus (AS)',
    acceptedAnswers: ['Yunus', 'Jonah', 'Younus', 'Dhun-Nun', 'Prophet Yunus'],
    explanation: 'Prophet Yunus (AS) — Dhun-Nun — was swallowed inside a whale; he glorified Allah and was eventually freed to return to his mission.',
    isBonus: false,
    points: 4,
  },
  {
    id: 'aug-prophets-5',
    topic: 'Prophets',
    prompt: 'BONUS: Which Prophet was raised up to Allah alive and will return as a just ruler near the end of time?',
    answer: 'Isa (AS)',
    acceptedAnswers: ['Isa', 'Eesa', 'Jesus', 'Prophet Isa', 'Ibn Maryam'],
    explanation: 'Prophet Isa ibn Maryam (AS) was raised alive to the heavens (Surah An-Nisa 4:157-158) and will return as a just ruler before Qiyamah.',
    isBonus: true,
    points: 5,
  },

  // --- Theme 6: AKHLAQ (5) ---
  {
    id: 'aug-akhlaq-1',
    topic: 'Akhlaq',
    prompt: 'What is the Arabic word for patience, one of the greatest virtues taught in every Surah of difficulty in the Quran?',
    answer: 'Sabr',
    acceptedAnswers: ['Patience', 'Sabur', 'Sabr (Patience)'],
    explanation: '“Indeed, Allah is with the patient (as-sabireen).” (Surah Al-Baqarah 2:153).',
    isBonus: false,
    points: 3,
  },
  {
    id: 'aug-akhlaq-2',
    topic: 'Akhlaq',
    prompt: 'What is the Arabic word for trust — the great quality we must have in Allah, no matter what happens?',
    answer: 'Tawakkul',
    acceptedAnswers: ['Tawakkul alal-Allah', 'Trust in Allah', 'Tawakkal', 'Tawakul'],
    explanation: '“And whoever relies (tawakkala) upon Allah — then He is sufficient for him.” (Surah At-Talaq 65:3).',
    isBonus: false,
    points: 4,
  },
  {
    id: 'aug-akhlaq-3',
    topic: 'Akhlaq',
    prompt: 'Complete the Islamic teaching: “Do not be angry, for _______ belongs to Allah alone.”',
    answer: 'Revenge',
    acceptedAnswers: ['Vengeance', 'Retribution', 'Taking revenge', 'Payback'],
    explanation: 'The Prophet ﷺ taught us to control anger and leave revenge to Allah, for He will judge with perfect justice.',
    isBonus: false,
    points: 3,
  },
  {
    id: 'aug-akhlaq-4',
    topic: 'Akhlaq',
    prompt: 'The Prophet ﷺ said “The most beloved deeds to Allah are those that are _______ even if they are small.”',
    answer: 'Consistent',
    acceptedAnswers: ['Regular', 'Done consistently', 'Continuous', 'Done every day'],
    explanation: 'A much-loved hadith in Sahih al-Bukhari & Muslim: small but consistent (muwadda) deeds are more beloved to Allah than great deeds done once.',
    isBonus: false,
    points: 4,
  },
  {
    id: 'aug-akhlaq-5',
    topic: 'Akhlaq',
    prompt: 'BONUS: What is the Arabic word for sincere advice — what every Muslim must give (and accept) for the sake of Allah alone?',
    answer: 'Naseehah',
    acceptedAnswers: ['Advice', 'Nasihah', 'Nasiha', 'Nasheeha'],
    explanation: '“The religion is naseehah (sincere advice) — to Allah, His Book, His Messenger, and to Muslim leaders and common folk.” (Sahih Muslim).',
    isBonus: true,
    points: 5,
  },

  // --- Theme 7: FIQH (5) ---
  {
    id: 'aug-fiqh-1',
    topic: 'Fiqh',
    prompt: 'How many total rak’ahs (obligatory + confirmed Sunnah) are prayed every day in the five daily prayers?',
    answer: '20',
    acceptedAnswers: ['twenty', '20 rak’ahs', '20 rakats'],
    explanation: 'Sunnah Mu’akkadah are 2 Fajr + 4/2 Dhuhr + 2 Maghrib + 2 Isha = 12; plus 17 fard → 20 confirmed rak’ahs every day.',
    isBonus: false,
    points: 4,
  },
  {
    id: 'aug-fiqh-2',
    topic: 'Fiqh',
    prompt: 'What is the term for the minimum amount of gold/silver/wealth that makes Zakat obligatory when held for a full lunar year?',
    answer: 'Nisab',
    acceptedAnswers: ['Nisaab', 'Threshold', 'Nisab threshold'],
    explanation: 'Zakat of 2.5% is obligatory on wealth that reaches the Nisab and is held for a full Islamic (lunar) year.',
    isBonus: false,
    points: 3,
  },
  {
    id: 'aug-fiqh-3',
    topic: 'Fiqh',
    prompt: 'What is the call to prayer that is recited loudly from the masjid five times a day called?',
    answer: 'Adhan',
    acceptedAnswers: ['Azaan', 'Athan', 'The Azan', 'Azaan call'],
    explanation: 'The beautiful Adhan was taught by Allah through Angel Jibril and is recited before every congregational fard prayer.',
    isBonus: false,
    points: 3,
  },
  {
    id: 'aug-fiqh-4',
    topic: 'Fiqh',
    prompt: 'What is the Arabic name for the obligatory 2.5% yearly charity that every wealthy Muslim must pay on their wealth?',
    answer: 'Zakat',
    acceptedAnswers: ['Zakah', 'Zakat al-Mal', 'Zakaat'],
    explanation: 'Zakat is the 3rd Pillar of Islam; it purifies wealth and helps the eight categories of recipients named in Surah At-Tawbah 9:60.',
    isBonus: false,
    points: 3,
  },
  {
    id: 'aug-fiqh-5',
    topic: 'Fiqh',
    prompt: 'BONUS: What is the name of the extra night prayers prayed voluntarily in Ramadan after Isha?',
    answer: 'Taraweeh',
    acceptedAnswers: ['Taraweh', 'Tahajjud in Ramadan', 'Taraweeh Salah'],
    explanation: 'Taraweeh are long voluntary night prayers prayed only in Ramadan; the Prophet ﷺ prayed them in congregation for three nights.',
    isBonus: true,
    points: 5,
  },

  // --- Theme 8: GENERAL ISLAMIC KNOWLEDGE (5) ---
  {
    id: 'aug-general-1',
    topic: 'General',
    prompt: 'What is the 4th Pillar of Islam, the month when the Quran was revealed and every Muslim adult must fast from dawn to sunset?',
    answer: 'Ramadan',
    acceptedAnswers: ['Ramadhan', 'Ramzan', 'Month of Fasting', 'Sawm of Ramadan'],
    explanation: 'Ramadan — the 4th Pillar of Islam — the Blessed Month the Quran was first sent down to Prophet Muhammad ﷺ.',
    isBonus: false,
    points: 3,
  },
  {
    id: 'aug-general-2',
    topic: 'General',
    prompt: 'What is the first Pillar of Islam, the declaration of faith recited to enter Islam (in Arabic)?',
    answer: 'Shahadah',
    acceptedAnswers: ['La ilaha illallah Muhammadur-Rasulullah', 'Two Shahadahs', 'Kalimah Tayyibah', 'Shahada'],
    explanation: 'The Shahadah: La ilaha illallah, Muhammadur-Rasulullah — there is no god but Allah and Muhammad is His Messenger.',
    isBonus: false,
    points: 4,
  },
  {
    id: 'aug-general-3',
    topic: 'General',
    prompt: 'What is the name of the building in the centre of Masjid al-Haram in Makkah that all Muslims face when praying?',
    answer: 'The Kaaba',
    acceptedAnswers: ['Kaaba', 'Ka’bah', 'House of Allah', 'Baitullah', 'Kabah'],
    explanation: 'The Kaaba (Baitullah) in Makkah was built by Prophets Ibrahim and Ismail (AS) and is the Qibla of the entire Ummah.',
    isBonus: false,
    points: 3,
  },
  {
    id: 'aug-general-4',
    topic: 'General',
    prompt: 'What is the literal meaning of the word “Islam” in Arabic?',
    answer: 'Submission',
    acceptedAnswers: ['Peace', 'Submission to Allah', 'Surrender', 'Peace through submission'],
    explanation: '“Islam” literally means submitting one’s self willingly to the will of Allah alone, and it shares the same Arabic root as salaam (peace).',
    isBonus: false,
    points: 4,
  },
  {
    id: 'aug-general-5',
    topic: 'General',
    prompt: 'BONUS: What is the name of the black stone set in the corner of the Kaaba that Muslims kiss or point to when doing Tawaf?',
    answer: 'Hajar al-Aswad',
    acceptedAnswers: ['The Black Stone', 'Hajar Aswad', 'Hajar-al-Aswad', 'Black Stone of Kaaba'],
    explanation: 'Hajar al-Aswad — the Black Stone — was brought down from Jannah and marks the starting point of each circuit of Tawaf around the Kaaba.',
    isBonus: true,
    points: 5,
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
  'aug-2026-mixed': {
    key: 'aug-2026-mixed',
    title: 'August 2026 Islamic Mix — Manual Review',
    emoji: '🎯',
    description:
      '40 unique questions across 8 themes — Seerah, Hadith, Quran, Sahabah, Prophets, Akhlaq, Fiqh, and General knowledge. Every answer is read and scored by a real Admin, so write clearly and in sha Allah earn bonus points!',
    passScore: 75,
    awardsBadge: true,
    manualReview: true,
    questions: AUG_2026_MIXED_QUESTIONS,
  },
};

export const CHALLENGE_QUIZ_KEYS: ChallengeQuizKey[] = ['quran-stories', 'fiqh', 'aug-2026-mixed'];

export function isChallengeQuizKey(value: unknown): value is ChallengeQuizKey {
  return value === 'quran-stories' || value === 'fiqh' || value === 'aug-2026-mixed';
}

export function getChallengeQuizConfig(key: string): ChallengeQuizConfig | null {
  return isChallengeQuizKey(key) ? CHALLENGE_QUIZZES[key] : null;
}
