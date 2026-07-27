export type FeaturedDailyChallengeDifficulty = 'Medium' | 'Medium+' | 'Challenging';

export type FeaturedDailyChallengeCategoryId =
  | 'quran'
  | 'tafsir'
  | 'prophets'
  | 'companions'
  | 'women-in-islam'
  | 'islamic-manners'
  | 'duas'
  | 'salah'
  | 'fasting'
  | 'hajj-umrah'
  | 'hadith'
  | 'islamic-history';

export type FeaturedDailyChallengeQuestion = {
  id: string;
  categoryId: FeaturedDailyChallengeCategoryId;
  difficulty: FeaturedDailyChallengeDifficulty;
  question: string;
  correctAnswer: string;
  distractors: string[];
  explanation: string;
  reference: string;
  learningFact: string;
};

export const FEATURED_DAILY_CHALLENGE_CATEGORIES: Array<{
  id: FeaturedDailyChallengeCategoryId;
  label: string;
  emoji: string;
}> = [
  { id: 'quran', label: "Qur'an", emoji: '📖' },
  { id: 'tafsir', label: 'Tafsir', emoji: '🕯️' },
  { id: 'prophets', label: 'Prophets', emoji: '🌙' },
  { id: 'companions', label: 'Companions', emoji: '⭐' },
  { id: 'women-in-islam', label: 'Women in Islam', emoji: '🌸' },
  { id: 'islamic-manners', label: 'Islamic Manners', emoji: '🤝' },
  { id: 'duas', label: 'Duas', emoji: '🤲' },
  { id: 'salah', label: 'Salah', emoji: '🕌' },
  { id: 'fasting', label: 'Fasting', emoji: '🌙' },
  { id: 'hajj-umrah', label: 'Hajj & Umrah', emoji: '🕋' },
  { id: 'hadith', label: 'Hadith', emoji: '📚' },
  { id: 'islamic-history', label: 'Islamic History', emoji: '🗺️' },
];

function q(
  id: string,
  categoryId: FeaturedDailyChallengeCategoryId,
  difficulty: FeaturedDailyChallengeDifficulty,
  question: string,
  correctAnswer: string,
  distractors: string[],
  explanation: string,
  reference: string,
  learningFact: string
): FeaturedDailyChallengeQuestion {
  return {
    id,
    categoryId,
    difficulty,
    question,
    correctAnswer,
    distractors,
    explanation,
    reference,
    learningFact,
  };
}

export const FEATURED_DAILY_CHALLENGE_QUESTION_BANK: FeaturedDailyChallengeQuestion[] = [
  q(
    'featured-quran-1',
    'quran',
    'Medium',
    'Which Surah contains the verse "Indeed, with hardship comes ease"?',
    'Surah Ash-Sharh',
    ['Surah Ad-Duha', 'Surah Al-Asr', 'Surah Al-Qadr', 'Surah At-Tin'],
    'Allah repeats this promise in Surah Ash-Sharh to reassure the Prophet Muhammad ﷺ and the believers that hardship is never the end of the story.',
    "Qur'an 94:5-6",
    'The promise of ease is mentioned twice in these ayat, which scholars note as a strong source of hope for believers.'
  ),
  q(
    'featured-quran-2',
    'quran',
    'Medium+',
    "In which Surah is Luqman's advice to his son not to associate partners with Allah mentioned?",
    'Surah Luqman',
    ['Surah Yusuf', 'Surah An-Nahl', 'Surah Maryam', 'Surah Al-Isra'],
    "Luqman's wise advice begins with the warning against shirk, showing that tawhid is the foundation of a child's Islamic upbringing.",
    "Qur'an 31:13",
    "Luqman's advice in this passage also includes prayer, patience, humility, and good manners."
  ),
  q(
    'featured-quran-3',
    'quran',
    'Challenging',
    'Which Surah mentions that iron was sent down and contains great strength and benefits for people?',
    'Surah Al-Hadid',
    ['Surah As-Saff', 'Surah Al-Jathiyah', 'Surah Ar-Rahman', 'Surah Al-Insan'],
    "Surah Al-Hadid highlights Allah's power and wisdom, mentioning iron as one of the signs of His provision and control over creation.",
    "Qur'an 57:25",
    "The Surah itself is named Al-Hadid, which means 'The Iron'."
  ),
  q(
    'featured-tafsir-1',
    'tafsir',
    'Medium',
    "In Ayat al-Kursi, what does the name 'Al-Qayyum' mean?",
    'The One who sustains and manages all creation',
    [
      'The One who only forgives major sins',
      'The One who sleeps lightly but never deeply',
      'The One who is seen by everyone in this life',
      'The One who created only humans and angels',
    ],
    "Classical tafsir explains Al-Qayyum as the One who is self-subsisting and the One by whom all creation is sustained.",
    "Qur'an 2:255; Tafsir Ibn Kathir",
    "Ayat al-Kursi combines Allah's perfect life, knowledge, power, and authority in one of the greatest verses of the Qur'an."
  ),
  q(
    'featured-tafsir-2',
    'tafsir',
    'Medium+',
    "According to well-known tafsir, what does 'As-Samad' mean in Surah Al-Ikhlas?",
    'The One upon whom all creation depends',
    [
      'The One who has a large family',
      'The One who changes from place to place',
      'The One who needs helpers in His rule',
      'The One who was created before the angels',
    ],
    "The word As-Samad points to Allah's perfect independence and the total dependence of all creation upon Him.",
    "Qur'an 112:2; Tafsir al-Tabari; Tafsir Ibn Kathir",
    'Surah Al-Ikhlas is a short Surah, but it powerfully summarizes pure tawhid.'
  ),
  q(
    'featured-tafsir-3',
    'tafsir',
    'Challenging',
    "In Surah Al-Ma'un, what action is condemned alongside showing off in prayer?",
    'Withholding small acts of kindness and help',
    [
      'Sleeping after Fajr every day',
      'Reciting the Qur’an quietly',
      'Traveling for trade in winter',
      'Standing in the first row too often',
    ],
    "Surah Al-Ma'un links outward worship with character, warning against empty prayer that does not produce mercy and generosity.",
    "Qur'an 107:4-7",
    "The word ma'un refers to simple everyday help, teaching that small kindnesses matter greatly in Islam."
  ),
  q(
    'featured-prophets-1',
    'prophets',
    'Medium',
    'Which prophet asked Allah to show him how the dead are brought back to life?',
    'Prophet Ibrahim (AS)',
    ['Prophet Nuh (AS)', 'Prophet Musa (AS)', 'Prophet Yusuf (AS)', 'Prophet Zakariyya (AS)'],
    'Prophet Ibrahim (AS) asked this not out of doubt, but so that his heart could be even more at peace through witnessing Allah’s power.',
    "Qur'an 2:260",
    'This ayah shows that increasing certainty through reflection is a praiseworthy goal.'
  ),
  q(
    'featured-prophets-2',
    'prophets',
    'Medium+',
    'Which prophet said, "My Lord, indeed I am in need of whatever good You send down to me"?',
    'Prophet Musa (AS)',
    ['Prophet Ayyub (AS)', 'Prophet Yunus (AS)', 'Prophet Yaqub (AS)', 'Prophet Sulayman (AS)'],
    'Musa (AS) made this humble dua after helping the two women at Madyan, showing deep neediness before Allah even in hardship.',
    "Qur'an 28:24",
    'This is one of the most beloved Qur’anic duas for asking Allah for provision and relief.'
  ),
  q(
    'featured-prophets-3',
    'prophets',
    'Challenging',
    'Which prophet was given the ability to understand the speech of birds by Allah’s permission?',
    'Prophet Sulayman (AS)',
    ['Prophet Dawud (AS)', 'Prophet Idris (AS)', 'Prophet Ismail (AS)', 'Prophet Hud (AS)'],
    'Allah gave Sulayman (AS) a unique kingdom and special abilities, including understanding the speech of birds and commanding jinn by His permission.',
    "Qur'an 27:16-19; 34:12",
    'Sulayman (AS) responded to these blessings with gratitude, saying that he smiled and thanked Allah.'
  ),
  q(
    'featured-companions-1',
    'companions',
    'Medium',
    'Which companion was sent to Madinah before the Hijrah to teach Islam and the Qur’an?',
    "Mus'ab ibn Umayr (RA)",
    ['Muadh ibn Jabal (RA)', 'Bilal ibn Rabah (RA)', 'Zayd ibn Thabit (RA)', 'Khalid ibn al-Walid (RA)'],
    "Mus'ab ibn Umayr (RA) helped prepare Madinah for the arrival of the Prophet ﷺ and became one of Islam's earliest great teachers.",
    'Ibn Hisham, Seerah; accepted books of Seerah',
    'Before Islam, Mus’ab was known for luxury in Makkah, but he left comfort behind for faith and da’wah.'
  ),
  q(
    'featured-companions-2',
    'companions',
    'Medium+',
    "Which companion was known by the title 'Dhun-Nurayn'?",
    "Uthman ibn Affan (RA)",
    ['Ali ibn Abi Talib (RA)', 'Abu Bakr as-Siddiq (RA)', 'Abdur-Rahman ibn Awf (RA)', 'Talhah ibn Ubaydillah (RA)'],
    "Uthman (RA) was called Dhun-Nurayn, 'the possessor of two lights,' because he married two daughters of the Prophet ﷺ, one after the other.",
    'Sahih al-Bukhari; accepted books of Seerah',
    'Uthman (RA) also led the standardization of the written mushaf during his caliphate.'
  ),
  q(
    'featured-companions-3',
    'companions',
    'Challenging',
    'Which companion narrated the famous hadith of Jibril that explains Islam, Iman, and Ihsan?',
    "Umar ibn al-Khattab (RA)",
    ['Abu Hurairah (RA)', 'Abdullah ibn Masud (RA)', 'Zayd ibn Harithah (RA)', 'Abu Ubaydah ibn al-Jarrah (RA)'],
    'Umar (RA) described the unknown visitor who questioned the Prophet ﷺ, and from this narration the ummah received one of the greatest hadith summaries of the religion.',
    'Sahih Muslim 8',
    'Many scholars call the hadith of Jibril one of the most comprehensive hadiths in Islam.'
  ),
  q(
    'featured-women-1',
    'women-in-islam',
    'Medium',
    'Which believing woman is given as an example for the believers in Surah At-Tahrim despite living with a tyrant husband?',
    "Asiyah, the wife of Fir'awn",
    ['Maryam bint Imran', 'Sarah the wife of Ibrahim', 'Hajar the mother of Ismail', 'Umm Musa'],
    "Allah mentions Asiyah as an example of faith, proving that a believer can remain firm even in the most difficult home environment.",
    "Qur'an 66:11",
    'Asiyah asked Allah for a house near Him in Paradise, showing that her hope was fixed on the Hereafter.'
  ),
  q(
    'featured-women-2',
    'women-in-islam',
    'Medium+',
    'Which wife of the Prophet ﷺ was the daughter of Abu Bakr and became one of the greatest narrators of hadith?',
    "Aishah (RA)",
    ['Hafsah (RA)', 'Umm Salamah (RA)', 'Sawdah (RA)', 'Zaynab bint Jahsh (RA)'],
    'Aishah (RA) was a major teacher of the ummah, known for sharp understanding, strong memory, and knowledge in many areas of religion.',
    'Sahih al-Bukhari; Sahih Muslim; accepted books of biography',
    'Many senior companions and later scholars learned from Aishah (RA).'
  ),
  q(
    'featured-women-3',
    'women-in-islam',
    'Challenging',
    "According to the Qur'an, who was appointed to care for Maryam (AS) when she was under special protection?",
    'Prophet Zakariyya (AS)',
    ['Prophet Yahya (AS)', 'Imran', 'Harun (brother of Musa)', 'A righteous unnamed woman'],
    "Allah placed Maryam (AS) in the care of Zakariyya (AS), and he found miraculous provision with her in her prayer place.",
    "Qur'an 3:37",
    "Maryam (AS) is the only woman mentioned by name in the Qur'an."
  ),
  q(
    'featured-manners-1',
    'islamic-manners',
    'Medium',
    'If someone forgets to say Bismillah before eating, what should they say when they remember?',
    'Bismillahi awwalahu wa akhirahu',
    ['SubhanAllahi wa bihamdih', 'Allahumma barik lana fihi', 'Astaghfirullaha Rabbi min kulli dhanb', 'La hawla wa la quwwata illa billah'],
    'The Prophet ﷺ taught this specific phrase to correct forgetting at the start of a meal and to keep eating connected to remembrance of Allah.',
    'Sunan Abi Dawud 3767; Jami at-Tirmidhi 1858',
    'Beginning food with the name of Allah is a simple sunnah that brings barakah into everyday life.'
  ),
  q(
    'featured-manners-2',
    'islamic-manners',
    'Medium+',
    'What did the Prophet ﷺ instruct a person to do when yawning?',
    'Suppress it as much as possible and cover the mouth',
    [
      'Yawning loudly to release tiredness',
      'Repeat the adhan softly',
      'Stand up immediately and walk in circles',
      'Say the talbiyah three times',
    ],
    'The Prophet ﷺ taught Muslims to avoid careless behavior and to maintain dignity and self-control even in small actions like yawning.',
    'Sahih al-Bukhari 6226; Sahih Muslim 2994',
    'Islamic manners often train the heart through everyday habits, not only through major acts of worship.'
  ),
  q(
    'featured-manners-3',
    'islamic-manners',
    'Challenging',
    'When three people are together, what did the Prophet ﷺ forbid two of them from doing?',
    'Speaking privately and excluding the third person',
    [
      'Reciting Qur’an aloud after Isha',
      'Walking too fast on a journey',
      'Sharing one water bottle',
      'Sitting in the shade after Asr',
    ],
    'The Prophet ﷺ forbade private whispering that leaves one person feeling isolated or hurt, showing how Islam protects emotions and brotherhood.',
    'Sahih al-Bukhari 6290; Sahih Muslim 2184',
    'Good manners in Islam include guarding people’s hearts from sadness, embarrassment, and suspicion.'
  ),
  q(
    'featured-duas-1',
    'duas',
    'Medium',
    'Which Qur’anic dua asks Allah to increase a person in knowledge?',
    'Rabbi zidni ilma',
    ['Rabbi hab li hukman', 'Rabbi yassir wa la tuassir', 'Rabbi inni maghloobun fantasir', 'Rabbi awwizni an ashkura nimatak'],
    "Allah commanded the Prophet ﷺ to ask for an increase in knowledge, showing that sacred learning is always worth seeking.",
    "Qur'an 20:114",
    'Knowledge that leads to humility and obedience is among the greatest blessings a Muslim can ask for.'
  ),
  q(
    'featured-duas-2',
    'duas',
    'Medium+',
    'Which prophet made the dua, "La ilaha illa Anta, subhanaka, inni kuntu minaz-zalimin"?',
    'Prophet Yunus (AS)',
    ['Prophet Ayyub (AS)', 'Prophet Nuh (AS)', 'Prophet Musa (AS)', 'Prophet Zakariyya (AS)'],
    'This was the supplication of Yunus (AS) in the darkness of the whale, combining tawhid, glorification of Allah, and confession of one’s own mistake.',
    "Qur'an 21:87-88",
    'The Prophet ﷺ taught that this dua is especially powerful in times of distress.'
  ),
  q(
    'featured-duas-3',
    'duas',
    'Challenging',
    'Which dua did Musa (AS) make before going to speak to Firawn?',
    'Rabbi ishrah li sadri wa yassir li amri',
    [
      'Rabbi inni lima anzalta ilayya min khayrin faqir',
      'Rabbi hab li min ladunka dhurriyyatan tayyibah',
      'Rabbana atina fid-dunya hasanah',
      'Rabbi la tadharnee fardan',
    ],
    'Musa (AS) asked Allah for an expanded chest, ease in his task, and clarity in speech before delivering a difficult message of truth.',
    "Qur'an 20:25-28",
    'This dua is beloved for speeches, teaching, interviews, and any task where clarity and courage are needed.'
  ),
  q(
    'featured-salah-1',
    'salah',
    'Medium',
    "According to authentic hadith, which prayer is the 'middle prayer' (as-salat al-wusta)?",
    'Asr prayer',
    ['Fajr prayer', 'Dhuhr prayer', 'Maghrib prayer', 'Tahajjud prayer'],
    'The Prophet ﷺ explained that the middle prayer mentioned in the Qur’an is Asr, which shows its great importance in the daily schedule of a Muslim.',
    "Qur'an 2:238; Sahih al-Bukhari 2931; Sahih Muslim 627",
    'Asr sits in the busy part of the day, so guarding it trains consistency and discipline.'
  ),
  q(
    'featured-salah-2',
    'salah',
    'Medium+',
    'If the iqamah is called while the imam is already in prayer, what should a latecomer do?',
    'Join the imam as they are and complete the missed part later',
    [
      'Wait for the next congregation even if the prayer is missed',
      'Pray alone in another corner immediately',
      'Repeat the adhan before entering',
      'Return home and pray only after everyone leaves',
    ],
    'The Prophet ﷺ taught worshippers to pray whatever they catch with the imam and complete what they missed afterward.',
    'Sahih al-Bukhari 636; Sahih Muslim 602',
    'Praying with the jamaah builds unity, and even joining late still has great reward.'
  ),
  q(
    'featured-salah-3',
    'salah',
    'Challenging',
    'In the hadith of the man who prayed badly, what essential quality did the Prophet ﷺ tell him to establish in every posture?',
    "Tranquillity and stillness (tuma'ninah)",
    ['Reciting long surahs in every rakah', 'Crying loudly in sujud', 'Changing clothes before every salah', 'Keeping the eyes closed throughout prayer'],
    "The Prophet ﷺ corrected the man's prayer by repeatedly teaching him to become settled in each position, showing that rushed movements do not fulfill proper salah.",
    'Sahih al-Bukhari 757; Sahih Muslim 397',
    "Tuma'ninah means your body settles in each position before moving on."
  ),
  q(
    'featured-fasting-1',
    'fasting',
    'Medium',
    'What meal did the Prophet ﷺ describe as blessed before the fast begins?',
    'Suhoor',
    ['Iftar', 'Walimah', 'Aqiqah', 'Tahajjud'],
    'The Prophet ﷺ taught that there is barakah in suhoor, even if it is only a sip of water.',
    'Sahih al-Bukhari 1923; Sahih Muslim 1095',
    'Suhoor helps the body and also separates the fasting of Muslims from other communities.'
  ),
  q(
    'featured-fasting-2',
    'fasting',
    'Medium+',
    'According to authentic hadith, when should people break the fast?',
    'As soon as sunset begins, without unnecessary delay',
    [
      'After the stars are clearly visible',
      'Only after praying Isha',
      'Exactly one hour after Maghrib',
      'After eating a full meal first',
    ],
    'The Prophet ﷺ praised those who hasten to break the fast at sunset, showing obedience and balance in worship.',
    'Sahih al-Bukhari 1957; Sahih Muslim 1098',
    'Breaking the fast promptly is a sunnah, while delaying suhoor is also a sunnah.'
  ),
  q(
    'featured-fasting-3',
    'fasting',
    'Challenging',
    'Besides food and drink, what serious behavior did the Prophet ﷺ warn could ruin the spirit of fasting?',
    'False speech and acting upon it',
    ['Smiling too much at friends', 'Reciting Qur’an after Fajr', 'Sleeping after school', 'Using miswak before Dhuhr'],
    'The Prophet ﷺ taught that fasting is not only hunger and thirst; it must also discipline speech and behavior.',
    'Sahih al-Bukhari 1903',
    'This hadith teaches that Ramadan is meant to reform character as well as habits.'
  ),
  q(
    'featured-hajj-1',
    'hajj-umrah',
    'Medium',
    'What is the name of the seven circuits made around the Kaabah?',
    'Tawaf',
    ['Sayi', 'Ramy', 'Talbiyah', 'Wuquf'],
    'Tawaf is one of the most recognizable acts of Hajj and Umrah, performed by circling the House of Allah in worship.',
    "Qur'an 22:29; accepted books of fiqh and manasik",
    'The Kaabah is a direction of worship for all Muslims, but it is not worshipped itself.'
  ),
  q(
    'featured-hajj-2',
    'hajj-umrah',
    'Medium+',
    'Between which two hills is the ritual of Sayi performed?',
    'Safa and Marwah',
    ['Arafah and Muzdalifah', 'Mina and Arafah', 'Uhud and Thawr', 'Quba and Uhud'],
    'Sayi between Safa and Marwah remembers the trust and effort of Hajar, the mother of Ismail (AS).',
    "Qur'an 2:158",
    'Hajar’s running in search of water became part of Muslim worship until the Last Day.'
  ),
  q(
    'featured-hajj-3',
    'hajj-umrah',
    'Challenging',
    'What is the name of the day of 9 Dhul-Hijjah, the central day of Hajj?',
    'The Day of Arafah',
    ['The Day of Tarwiyah', 'The Day of Tashriq', 'The Day of Ashura', 'The Night of Baraah'],
    'The Prophet ﷺ said, "Hajj is Arafah," showing the central importance of standing there on the ninth of Dhul-Hijjah.',
    'Jami at-Tirmidhi 889; Sunan an-Nasai 3016',
    'Fasting the Day of Arafah is highly rewarded for those who are not performing Hajj.'
  ),
  q(
    'featured-hadith-1',
    'hadith',
    'Medium',
    'In the hadith of Jibril, what is Ihsan?',
    'To worship Allah as though you see Him, and if not, know that He sees you',
    [
      'To memorize every hadith before adulthood',
      'To travel every year for knowledge',
      'To give all of one’s wealth away',
      'To lead every prayer in the masjid',
    ],
    'Ihsan is the highest level of worship, where the heart is full of awareness that Allah is always watching.',
    'Sahih Muslim 8',
    'The hadith of Jibril teaches Islam, Iman, and Ihsan in one gathering.'
  ),
  q(
    'featured-hadith-2',
    'hadith',
    'Medium+',
    'According to authentic hadith, which deeds are most beloved to Allah?',
    'Those done regularly, even if they are small',
    [
      'Only the longest deeds done once a year',
      'Deeds done publicly so others can copy them',
      'Only deeds done in Ramadan',
      'Deeds done without any planning or discipline',
    ],
    'The Prophet ﷺ praised consistency, teaching that steady worship shapes a believer more deeply than short bursts of enthusiasm.',
    'Sahih al-Bukhari 6464; Sahih Muslim 783',
    'Small daily worship can outlast large deeds that are difficult to maintain.'
  ),
  q(
    'featured-hadith-3',
    'hadith',
    'Challenging',
    "According to the Prophet ﷺ, who has the strongest right to a person's best companionship?",
    'His mother',
    ['His older brother', 'His teacher', 'His closest friend', 'His neighbor'],
    'When asked who deserved the best companionship, the Prophet ﷺ replied three times, "Your mother," and then "your father."',
    'Sahih al-Bukhari 5971; Sahih Muslim 2548',
    'This hadith shows the huge place of mothers in Islam and the importance of serving parents with excellence.'
  ),
  q(
    'featured-history-1',
    'islamic-history',
    'Medium',
    'Which treaty was signed between the Muslims and Quraysh in 6 AH and allowed the Muslims to return for Umrah the following year?',
    'The Treaty of Hudaybiyyah',
    ['The Constitution of Madinah', 'The Pledge of Aqabah', 'The Treaty of Taif', 'The Pact of Hilf al-Fudul'],
    'Although some companions found its terms difficult at first, Hudaybiyyah became a great opening that allowed Islam to spread peacefully.',
    "Qur'an 48:1; Sahih al-Bukhari; accepted books of Seerah",
    'Surah Al-Fath was revealed in connection with this treaty and called it a clear victory.'
  ),
  q(
    'featured-history-2',
    'islamic-history',
    'Medium+',
    'Which battle took place in Ramadan in 2 AH?',
    'The Battle of Badr',
    ['The Battle of Uhud', 'The Battle of Hunayn', 'The Battle of Tabuk', 'The Battle of Khandaq'],
    'Badr was the first major battle between the Muslims and Quraysh, and Allah granted a decisive victory despite the Muslims being fewer in number.',
    "Qur'an 3:123-125; accepted books of Seerah",
    'Many lessons of Badr are about sincerity, reliance on Allah, and obedience to the Prophet ﷺ.'
  ),
  q(
    'featured-history-3',
    'islamic-history',
    'Challenging',
    'Which caliph ordered the Qur’an to be collected into one compilation after the Battle of Yamamah, on Umar’s suggestion?',
    'Abu Bakr as-Siddiq (RA)',
    ['Uthman ibn Affan (RA)', 'Ali ibn Abi Talib (RA)', 'Muawiyah ibn Abi Sufyan (RA)', 'Abdullah ibn Zubayr (RA)'],
    'After many Qur’an memorizers were martyred, Abu Bakr (RA) accepted Umar’s suggestion and entrusted Zayd ibn Thabit (RA) with the compilation.',
    'Sahih al-Bukhari 4986',
    'Later, during the caliphate of Uthman (RA), copies of the mushaf were standardized and distributed.'
  ),
];
