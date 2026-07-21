export type JuzAmmaSurahMeta = {
  number: number;
  arabicName: string;
  englishName: string;
  ayahCount: number;
  revelation: 'Makki' | 'Madani';
  theme: string;
  mainLesson: string;
  fullMeaning: string;
  facts: string[];
};

/** Juz 30 (Juz Amma) — Surahs 78 to 114 */
export const JUZ_AMMA_SURAH_LIST: JuzAmmaSurahMeta[] = [
  {
    number: 78,
    arabicName: 'النبأ',
    englishName: 'An-Naba (The Great News)',
    ayahCount: 40,
    revelation: 'Makki',
    theme: 'Day of Judgment',
    mainLesson: 'The Day of Judgment is real — prepare by doing good deeds.',
    fullMeaning:
      'Allah asks if we know about the great news of Judgment Day that people argue about. On that day, the mountains will become like dust and the sky will split. The wrongdoers will face a painful punishment in Hell, while the righteous will have gardens and blessings. This surah reminds us that this life is a test and the next life is forever.',
    facts: ['One of the early surahs about Akhirah', 'Mentions gardens of delight for the righteous'],
  },
  {
    number: 79,
    arabicName: 'النازعات',
    englishName: "An-Nazi'at (Those Who Pull Out)",
    ayahCount: 46,
    revelation: 'Makki',
    theme: 'Resurrection & Pharaoh',
    mainLesson: 'Allah can bring the dead back to life — be humble like Musa, not proud like Pharaoh.',
    fullMeaning:
      'Allah describes angels who take souls at death. He reminds us that one day the earth will shake and people will come out of their graves. The story of Musa (AS) and Pharaoh is told — Pharaoh was arrogant and drowned, but his body was saved as a sign. Allah is able to recreate us after death just as He created us the first time.',
    facts: ['Tells the story of Musa and Pharaoh', 'Shows that arrogant tyrants cannot defeat Allah'],
  },
  {
    number: 80,
    arabicName: 'عبس',
    englishName: 'Abasa (He Frowned)',
    ayahCount: 42,
    revelation: 'Makki',
    theme: 'Kindness & the Hereafter',
    mainLesson: 'Treat every person with respect — Allah values sincere seekers of truth.',
    fullMeaning:
      'This surah teaches that the Prophet (peace be upon him) should not turn away from a blind believer who wanted to learn, even when busy with leaders. Allah reminds us that guidance is in His hands. Seeds, rain, and food show Allah\'s power. On Judgment Day, every person will remember what they did. The believer will be happy; the one who ignored faith will wish they had listened.',
    facts: ['Teaches us to be kind to everyone who wants to learn', 'Shows signs of Allah in nature'],
  },
  {
    number: 81,
    arabicName: 'التكوير',
    englishName: 'At-Takwir (The Overthrowing)',
    ayahCount: 29,
    revelation: 'Makki',
    theme: 'Signs of Judgment Day',
    mainLesson: 'When the world ends, only your good deeds will help you.',
    fullMeaning:
      'Allah describes shocking events on Judgment Day: the sun will be wrapped up, stars will fall, mountains will move, and the sky will break. Every soul will know what it brought forward. People will be asked about their blessings and their deeds. The Quran is a true message from a noble angel. This surah wakes us up to remember Allah before it is too late.',
    facts: ['Very powerful description of the Last Day', 'The Quran is described as the word of a noble messenger'],
  },
  {
    number: 82,
    arabicName: 'الانفطار',
    englishName: 'Al-Infitar (The Cleaving)',
    ayahCount: 19,
    revelation: 'Makki',
    theme: 'Judgment & recording of deeds',
    mainLesson: 'Angels write everything you do — choose good actions.',
    fullMeaning:
      'The sky will split open on Judgment Day. Angels Kiraman Katibin (the noble recorders) write down everything we do — good and bad. On that day, no one can help another. The righteous will be in bliss, and the wicked will burn in Hell. Allah created us perfectly and can bring us back to life for judgment.',
    facts: ['Mentions the angels who record our deeds', 'Only 19 ayahs — good for memorization practice'],
  },
  {
    number: 83,
    arabicName: 'المطففين',
    englishName: 'Al-Mutaffifin (The Defrauders)',
    ayahCount: 36,
    revelation: 'Makki',
    theme: 'Honesty in trade & Judgment',
    mainLesson: 'Be honest when weighing and measuring — cheating is a serious sin.',
    fullMeaning:
      'Allah warns people who cheat others by giving less than they should in business. Such people think they will never be raised again, but they will stand before Allah. The record of the wicked is in Sijjin (a register of the doomed), while the record of the righteous is in Illiyyin (the highest place). On Judgment Day, the righteous will enjoy Paradise while cheaters face punishment.',
    facts: ['Teaches honesty in buying and selling', 'Mentions Sijjin and Illiyyin — registers of deeds'],
  },
  {
    number: 84,
    arabicName: 'الانشقاق',
    englishName: 'Al-Inshiqaq (The Splitting Open)',
    ayahCount: 25,
    revelation: 'Makki',
    theme: 'Sky splitting & accountability',
    mainLesson: 'You will receive your book of deeds — strive for a happy meeting with Allah.',
    fullMeaning:
      'The sky will split and obey its Lord. The earth will throw out what is inside it. Every person will receive their record — those given it in their right hand will have an easy reckoning and return joyfully to their family. Those given it behind their back will call for destruction. Allah created us in stages and can resurrect us. He is forgiving to those who believe and do good.',
    facts: ['Describes receiving your book of deeds on Judgment Day', 'Allah created humans step by step in the womb'],
  },
  {
    number: 85,
    arabicName: 'البروج',
    englishName: 'Al-Buruj (The Constellations)',
    ayahCount: 22,
    revelation: 'Makki',
    theme: 'Martyrs & Allah\'s power',
    mainLesson: 'Allah sees oppression — stay firm in faith even when tested.',
    fullMeaning:
      'Allah swears by the sky with its constellations. The people of the ditch who burned believers are mentioned — they were punished for their cruelty. Allah is the Lord of the mighty throne and does what He wills. He destroyed Pharaoh and Thamud. The Quran is preserved in the Lauh Mahfuz (Protected Tablet). Trust Allah when people hurt you for your faith.',
    facts: ['Tells about believers who were thrown into a fire', 'The Quran is protected by Allah forever'],
  },
  {
    number: 86,
    arabicName: 'الطارق',
    englishName: "At-Tariq (The Night-Comer)",
    ayahCount: 17,
    revelation: 'Makki',
    theme: 'Allah watches over us',
    mainLesson: 'Allah sees everything you do — guard your heart and actions.',
    fullMeaning:
      'Allah swears by the sky and the night star. Every soul has a guardian watching over it. Humans were created from a drop of fluid. Allah knows the secrets of the heart. On Judgment Day, there will be no power or helper except Allah. The sky will crack open. This surah reminds us that Allah is always aware of us.',
    facts: ['Every person has angels guarding them', 'Allah knows what is hidden in the chest'],
  },
  {
    number: 87,
    arabicName: 'الأعلى',
    englishName: "Al-A'la (The Most High)",
    ayahCount: 19,
    revelation: 'Makki',
    theme: 'Praising Allah & purification',
    mainLesson: 'Remember Allah, keep yourself clean, and prefer the Hereafter.',
    fullMeaning:
      'Glorify the name of your Lord, the Most High, who created and guided. The Prophet (peace be upon him) is told to prefer the Hereafter over this world. Those who purify themselves, remember Allah, and establish prayer will succeed. The people of the past who rejected truth were destroyed, but the remembrance of Allah remains. The Quran is easy to remember.',
    facts: ['The Prophet (SAW) loved this surah in prayer', 'Teaches taharah (purification) and dhikr'],
  },
  {
    number: 88,
    arabicName: 'الغاشية',
    englishName: 'Al-Ghashiyah (The Overwhelming)',
    ayahCount: 26,
    revelation: 'Makki',
    theme: 'Two groups on Judgment Day',
    mainLesson: 'Work hard in this life so you are among the happy ones on Judgment Day.',
    fullMeaning:
      'Some faces on Judgment Day will be humbled and tired from Hell, while others will be happy in Paradise enjoying gardens and flowing springs. Allah points to camels, mountains, and the earth as signs of His power. The disbelievers are warned, but the Prophet is only a reminder — he cannot force people to believe. Everyone will return to Allah.',
    facts: ['Compares faces of people in Hell and Paradise', 'Nature shows Allah\'s greatness'],
  },
  {
    number: 89,
    arabicName: 'الفجر',
    englishName: 'Al-Fajr (The Dawn)',
    ayahCount: 30,
    revelation: 'Makki',
    theme: 'Destroyed nations & the soul',
    mainLesson: 'Do not be greedy — be good to orphans, poor people, and your soul.',
    fullMeaning:
      'Allah swears by the dawn and peaceful nights. Nations like Aad, Thamud, and Pharaoh were destroyed for arrogance and evil. People who hoard wealth and are unkind to orphans are warned. When a person dies, they will wish they had done more good. On Judgment Day, Allah will say: "My servant, I gave you health, wealth, and a spouse — what did you do?" The peaceful soul enters Paradise; the regretful soul enters Hell.',
    facts: ['Mentions destroyed nations as lessons', 'Famous ayah about the peaceful soul (nafs mutma\'innah)'],
  },
  {
    number: 90,
    arabicName: 'البلد',
    englishName: 'Al-Balad (The City)',
    ayahCount: 20,
    revelation: 'Makki',
    theme: 'The steep path of good deeds',
    mainLesson: 'Free the neck (help others), feed the poor, and be patient — that is the hard path to success.',
    fullMeaning:
      'Allah swears by Makkah, where the Prophet (peace be upon him) grew up. Humans think they are self-sufficient, but they face hardship. Allah shows the two paths: the steep path of good deeds — freeing slaves, feeding the hungry, caring for orphans and the poor — and the path of those who deny and turn away. Those who do good with patience will be among the people of the right hand (Paradise).',
    facts: ['Mentions Makkah (Al-Balad Al-Amin — the secure city)', 'Teaches helping orphans and the poor'],
  },
  {
    number: 91,
    arabicName: 'الشمس',
    englishName: 'Ash-Shams (The Sun)',
    ayahCount: 15,
    revelation: 'Makki',
    theme: 'Purifying the soul',
    mainLesson: 'Clean your heart (nafs) through faith and good deeds, like Thamud failed to do.',
    fullMeaning:
      'Allah swears by the sun, moon, day, night, sky, and earth. He created the soul and taught it right from wrong. Successful is the one who purifies their soul; failed is the one who hides it in sin. The people of Thamud killed the she-camel sent as a sign and were destroyed. This surah teaches that success means purifying your inner self.',
    facts: ['Famous ayah: successful is one who purifies the soul', 'Story of the she-camel of Thamud'],
  },
  {
    number: 92,
    arabicName: 'الليل',
    englishName: 'Al-Layl (The Night)',
    ayahCount: 21,
    revelation: 'Makki',
    theme: 'Two types of people',
    mainLesson: 'Give in charity and fear Allah — that leads to ease and Paradise.',
    fullMeaning:
      'Allah swears by the night and day. He created male and female and two paths. Whoever gives charity, fears Allah, and believes in the best reward — Allah will make their path easy and they will be satisfied. Whoever is greedy and thinks he is self-sufficient and denies truth — Allah will make their path hard and their wealth will not help on Judgment Day. Guidance is from Allah alone.',
    facts: ['Shows two different outcomes based on how we live', 'Charity and taqwa bring ease'],
  },
  {
    number: 93,
    arabicName: 'الضحى',
    englishName: 'Ad-Duha (The Morning Hours)',
    ayahCount: 11,
    revelation: 'Makki',
    theme: 'Comfort to the Prophet',
    mainLesson: 'Allah never abandons you — help orphans and be grateful.',
    fullMeaning:
      'Allah comforts the Prophet (peace be upon him) after a pause in revelation: your Lord has not forsaken you nor hates you. The future will be better than the past. Allah found you an orphan and gave you shelter, found you lost and guided you, and found you poor and made you rich. So do not oppress orphans, do not drive away beggars, and speak about Allah\'s blessings.',
    facts: ['Revealed to comfort the Prophet (SAW)', 'Teaches kindness to orphans and the poor'],
  },
  {
    number: 94,
    arabicName: 'الشرح',
    englishName: 'Ash-Sharh (The Relief)',
    ayahCount: 8,
    revelation: 'Makki',
    theme: 'Ease after hardship',
    mainLesson: 'After every difficulty comes ease — turn to Allah in prayer.',
    fullMeaning:
      'Allah opened the Prophet\'s chest and removed his burden. He raised his mention so Muslims praise him in the adhan and salah. With hardship comes ease — repeated twice for emphasis. When you finish your tasks, strive hard for Allah and turn to Him alone in worship.',
    facts: ['"With hardship comes ease" is repeated twice', 'Very short and beloved surah'],
  },
  {
    number: 95,
    arabicName: 'التين',
    englishName: 'At-Tin (The Fig)',
    ayahCount: 8,
    revelation: 'Makki',
    theme: 'Best form of creation',
    mainLesson: 'Believe and do good — Allah created you in the best shape.',
    fullMeaning:
      'Allah swears by the fig, olive, Mount Sinai, and the secure city of Makkah. He created humans in the best form, then reduced them to the lowest if they reject faith — except those who believe and do righteous deeds; they will have endless reward. Judgment Day will be a day of truth when no one can deny it.',
    facts: ['Says humans are created in the best form (ahsani taqwim)', 'Only 8 ayahs'],
  },
  {
    number: 96,
    arabicName: 'العلق',
    englishName: 'Al-Alaq (The Clot)',
    ayahCount: 19,
    revelation: 'Makki',
    theme: 'First revelation & humility',
    mainLesson: 'Read and learn — the first word revealed was "Iqra" (Read)!',
    fullMeaning:
      'The first revelation: Read in the name of your Lord who created. He created humans from a clot of blood. He taught by the pen and taught humans what they did not know. Yet humans become arrogant when they have wealth. The surah warns those who try to stop others from praying. Prostrate and draw close to Allah. This is where the Quran began!',
    facts: ['First surah revealed to the Prophet (SAW)', 'First command: Iqra (Read)!'],
  },
  {
    number: 97,
    arabicName: 'القدر',
    englishName: 'Al-Qadr (The Power / Night of Decree)',
    ayahCount: 5,
    revelation: 'Makki',
    theme: 'Laylatul Qadr',
    mainLesson: 'Worship on the Night of Qadr is better than 1000 months!',
    fullMeaning:
      'Allah sent the Quran down on the Night of Qadr (Laylatul Qadr). What can make you know how great that night is? Worship on that night is better than a thousand months. Angels and Jibreel descend with peace until dawn. Seek this night in the last ten nights of Ramadan!',
    facts: ['Laylatul Qadr is better than 1000 months', 'Only 5 ayahs — essential to memorize'],
  },
  {
    number: 98,
    arabicName: 'البينة',
    englishName: 'Al-Bayyinah (The Clear Proof)',
    ayahCount: 8,
    revelation: 'Madani',
    theme: 'Clear messenger & religion',
    mainLesson: 'Follow the Prophet (SAW) and worship Allah sincerely.',
    fullMeaning:
      'The People of the Book and polytheists would not leave their ways until clear proof came — a messenger from Allah reciting pure scriptures. They were commanded to worship Allah alone with sincere religion and establish prayer and zakah. That is the true religion. The worst people are disbelievers who will be in Hell forever. The best are those who believe and do good — their reward with Allah is eternal gardens.',
    facts: ['One of the few Madani surahs in Juz Amma', 'Describes the "clear proof" — the Prophet and Quran'],
  },
  {
    number: 99,
    arabicName: 'الزلزلة',
    englishName: 'Az-Zalzalah (The Earthquake)',
    ayahCount: 8,
    revelation: 'Madani',
    theme: 'Earth revealing deeds',
    mainLesson: 'Even the smallest good or bad deed will be shown on Judgment Day.',
    fullMeaning:
      'When the earth is shaken with its final earthquake and throws out its burdens, people will ask what is wrong with it. It will speak because your Lord commanded it. On that day, people will come out in groups to see their deeds. Whoever does an atom\'s weight of good will see it; whoever does an atom\'s weight of evil will see it. No deed is too small!',
    facts: ['Even tiny deeds will be counted', 'The earth will "speak" on Judgment Day'],
  },
  {
    number: 100,
    arabicName: 'العاديات',
    englishName: 'Al-Adiyat (The Courser)',
    ayahCount: 11,
    revelation: 'Makki',
    theme: 'Ingratitude of humans',
    mainLesson: 'Be grateful to Allah — He knows what is hidden in your chest.',
    fullMeaning:
      'Allah swears by war horses charging into battle. Humans are ungrateful to their Lord — they love wealth too much. Do they not know that when graves are opened and secrets are examined, their Lord is fully aware? This surah warns against greed and ingratitude.',
    facts: ['Describes horses running into battle', 'Warns that Allah knows secret thoughts'],
  },
  {
    number: 101,
    arabicName: 'القارعة',
    englishName: "Al-Qari'ah (The Striking Calamity)",
    ayahCount: 11,
    revelation: 'Makki',
    theme: 'Day of Judgment',
    mainLesson: 'Judgment Day will sort people like light dust — aim to be among the heavy good deeds.',
    fullMeaning:
      'What is the Striking Calamity? What will make you know what it is? On that day, people will be like scattered moths and mountains like carded wool. Those whose scales are heavy with good deeds will live a happy life. Those whose scales are light will fall into a blazing fire. Your good deeds are your weight on the Scale!',
    facts: ['Mentions scales (mizan) of deeds', 'Mountains will become like soft wool'],
  },
  {
    number: 102,
    arabicName: 'التكاثر',
    englishName: 'At-Takathur (The Rivalry in Increase)',
    ayahCount: 8,
    revelation: 'Makki',
    theme: 'Distraction by worldly life',
    mainLesson: 'Do not let money and counting wealth distract you from the Hereafter.',
    fullMeaning:
      'Competition in piling up worldly things distracts you until you visit the graves. Soon you will know! If you knew with certainty, you would see Hell. You will see it with the eye of certainty. Then you will be asked that Day about every blessing you enjoyed.',
    facts: ['Warns against being busy only with dunya', 'We will be questioned about our blessings'],
  },
  {
    number: 103,
    arabicName: 'العصر',
    englishName: 'Al-Asr (The Time)',
    ayahCount: 3,
    revelation: 'Makki',
    theme: 'Success formula',
    mainLesson: 'Faith + good deeds + truth + patience = success!',
    fullMeaning:
      'By time! All people are in loss except those who believe, do righteous deeds, encourage truth, and encourage patience. This tiny surah is the whole plan for success in life!',
    facts: ['Imam Shafi\'i said this surah alone would be enough', 'Only 3 ayahs — first surah many kids memorize'],
  },
  {
    number: 104,
    arabicName: 'الهمزة',
    englishName: 'Al-Humazah (The Slanderer)',
    ayahCount: 9,
    revelation: 'Makki',
    theme: 'Gossip and mockery',
    mainLesson: 'Do not make fun of people or gossip — it destroys your Hereafter.',
    fullMeaning:
      'Woe to every backbiter and mocker who collects wealth and counts it, thinking it will make him immortal. He will be thrown into Hutamah — a crushing fire that leaps over hearts. It will close in on them in extended columns. Gossip and making fun of others is a serious sin.',
    facts: ['Warns against humiliating and backbiting others', 'Wealth cannot save you from Allah'],
  },
  {
    number: 105,
    arabicName: 'الفيل',
    englishName: 'Al-Fil (The Elephant)',
    ayahCount: 5,
    revelation: 'Makki',
    theme: 'Kaaba protected',
    mainLesson: 'Allah protects His sacred house — no army can defeat Him.',
    fullMeaning:
      'Have you not seen how your Lord dealt with the army of the elephant? Did He not make their plan go wrong and send birds in flocks throwing stones of baked clay, leaving them like eaten straw? This happened in the year the Prophet (peace be upon him) was born — Abrahah tried to destroy the Kaaba but Allah protected it.',
    facts: ['Year of the Elephant = birth year of the Prophet (SAW)', 'Birds called Ababil destroyed the army'],
  },
  {
    number: 106,
    arabicName: 'قريش',
    englishName: 'Quraysh',
    ayahCount: 4,
    revelation: 'Makki',
    theme: 'Gratitude for safety',
    mainLesson: 'Thank Allah for safe travel and food — worship the Lord of the Kaaba.',
    fullMeaning:
      'For the familiarity of Quraysh — their safe winter and summer journeys for trade. Let them worship the Lord of this House who fed them against hunger and made them safe from fear. Allah gave Quraysh safety and provision so they should worship Him alone.',
    facts: ['Often recited together with Surah Al-Fil', 'Teaches gratitude for safety and food'],
  },
  {
    number: 107,
    arabicName: 'الماعون',
    englishName: "Al-Ma'un (Small Kindnesses)",
    ayahCount: 7,
    revelation: 'Makki',
    theme: 'Hypocrisy & neglecting prayer',
    mainLesson: 'Pray on time and help others with small acts of kindness.',
    fullMeaning:
      'Have you seen the one who denies Judgment? That is the one who pushes away the orphan and does not encourage feeding the poor. Woe to those who pray but are heedless — showing off and refusing small kindness like lending items to neighbours. Real faith shows in prayer and helping others.',
    facts: ['Teaches helping orphans and the poor', 'Warns against careless prayer'],
  },
  {
    number: 108,
    arabicName: 'الكوثر',
    englishName: 'Al-Kawthar (Abundance)',
    ayahCount: 3,
    revelation: 'Makki',
    theme: 'Great blessing to the Prophet',
    mainLesson: 'Pray and sacrifice for Allah — He gave the Prophet Al-Kawthar.',
    fullMeaning:
      'Indeed, We have given you Al-Kawthar — a river in Paradise and abundant good. So pray to your Lord and sacrifice. It is your enemies who will be cut off, not you. The shortest surah with a powerful message of hope.',
    facts: ['Al-Kawthar is a river in Paradise for the Prophet (SAW)', 'Only 3 ayahs'],
  },
  {
    number: 109,
    arabicName: 'الكافرون',
    englishName: 'Al-Kafirun (The Disbelievers)',
    ayahCount: 6,
    revelation: 'Makki',
    theme: 'Religious tolerance & firm faith',
    mainLesson: 'You have your way and I have mine — stay firm on Islam with respect.',
    fullMeaning:
      'Say: O disbelievers, I do not worship what you worship, and you do not worship what I worship. I will never worship what you worship, and you will never worship what I worship. For you is your religion, and for me is my religion. This surah teaches polite but firm belief.',
    facts: ['Recited for religious freedom with respect', '6 ayahs — easy to memorize'],
  },
  {
    number: 110,
    arabicName: 'النصر',
    englishName: 'An-Nasr (The Divine Support)',
    ayahCount: 3,
    revelation: 'Madani',
    theme: 'Victory & gratitude',
    mainLesson: 'When Allah gives success, glorify Him and seek forgiveness.',
    fullMeaning:
      'When the victory of Allah comes and people enter Islam in crowds, glorify your Lord with praise and seek His forgiveness. He is ever Accepting. This was one of the last surahs revealed — it signaled the mission was complete and taught humility even in victory.',
    facts: ['Among the last surahs revealed', 'Teaches istighfar even after success'],
  },
  {
    number: 111,
    arabicName: 'المسد',
    englishName: 'Al-Masad (The Palm Fibre)',
    ayahCount: 5,
    revelation: 'Makki',
    theme: 'Consequences of harming the Prophet',
    mainLesson: 'Those who hurt the Prophet (SAW) and block Islam will not succeed.',
    fullMeaning:
      'May the hands of Abu Lahab be ruined — he was the Prophet\'s uncle who hated Islam. His wealth will not help him. He will burn in a fire of flames, and his wife who used to spread thorns will carry firewood with a rope of palm fibre around her neck. A lesson that opposing Allah\'s message has consequences.',
    facts: ['Abu Lahab is named in the Quran', 'Only surah where specific enemies are named'],
  },
  {
    number: 112,
    arabicName: 'الإخلاص',
    englishName: 'Al-Ikhlas (The Sincerity)',
    ayahCount: 4,
    revelation: 'Makki',
    theme: 'Oneness of Allah',
    mainLesson: 'Allah is One — unique, eternal, with no partner or equal.',
    fullMeaning:
      'Say: He is Allah, the One. Allah, the Eternal Refuge (As-Samad — everyone needs Him, He needs no one). He neither begets nor is born. There is nothing comparable to Him. This surah equals one-third of the Quran in meaning. It is pure Tawheed — the foundation of Islam.',
    facts: ['Equals one-third of the Quran in reward', 'One of the first surahs children learn'],
  },
  {
    number: 113,
    arabicName: 'الفلق',
    englishName: 'Al-Falaq (The Daybreak)',
    ayahCount: 5,
    revelation: 'Makki',
    theme: 'Seeking protection',
    mainLesson: 'Ask Allah to protect you from evil, darkness, and jealousy.',
    fullMeaning:
      'Say: I seek refuge in the Lord of the daybreak from the evil of what He created, from the darkness when it settles, from those who blow on knots (magic), and from the envier when he envies. Recite every morning for protection.',
    facts: ['One of the two protection surahs (Muawwidhatayn)', 'Recited in morning and evening adhkar'],
  },
  {
    number: 114,
    arabicName: 'الناس',
    englishName: 'An-Nas (Mankind)',
    ayahCount: 6,
    revelation: 'Makki',
    theme: 'Protection from whispers',
    mainLesson: 'Ask Allah to protect you from Shaytan\'s whispers in your heart.',
    fullMeaning:
      'Say: I seek refuge in the Lord of mankind, the King of mankind, the God of mankind, from the evil of the retreating whisperer who whispers in the hearts of people — from among jinn and mankind. The last surah of the Quran! Recite with Al-Falaq for complete protection.',
    facts: ['The final surah of the Holy Quran', 'Protects from waswas (whispers of Shaytan)'],
  },
];

export function getJuzAmmaSurah(number: number): JuzAmmaSurahMeta | undefined {
  return JUZ_AMMA_SURAH_LIST.find((s) => s.number === number);
}

export const JUZ_AMMA_LABEL = 'Juz Amma (Juz 30)';
export const JUZ_AMMA_RANGE = 'Surahs 78 – 114';
