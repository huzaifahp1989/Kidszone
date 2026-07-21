export type SeerahQuizQuestion = {
  id: string;
  question: string;
  expectedKeywords: string[];
};

export type SeerahChapter = {
  chapterNumber: number;
  slug: string;
  title: string;
  subtitle: string;
  content: string[];
  references: string[];
  quizQuestions: SeerahQuizQuestion[];
};

export const TOTAL_SEERAH_CHAPTERS = 5;

export const SEERAH_CHAPTERS: SeerahChapter[] = [
  {
    chapterNumber: 1,
    slug: 'birth-and-early-life',
    title: 'The Birth and Early Life of Prophet Muhammad ﷺ',
    subtitle: 'Arabia before Islam, lineage, childhood, and Al-Ameen',
    content: [
      'Before Islam, much of Arabia was living in spiritual darkness. Many tribes worshipped idols, oppression was common, and the weak were often ignored. Yet Allah had already planned guidance for humanity through His final Messenger. In this environment, Prophet Muhammad ﷺ was born as a mercy for the world and a light for hearts.',
      'Prophet Muhammad ﷺ was born in Makkah in the Year of the Elephant. His father, Abdullah, had passed away before his birth, so he entered life as an orphan. His mother, Aminah, cared for him with tenderness, but this stage was short, and Allah was preparing him through early trials that would grow his compassion for every orphan and needy person.',
      'As was Arab custom, he spent part of his early childhood with Halimah al-Sadiyyah in the desert, where children learned strong Arabic and healthy discipline. Barakah was seen in Halimah\'s home while he lived with them. These years helped shape his noble speech, patience, and calm nature.',
      'When he was still young, his mother Aminah passed away on the way back from Madinah. He then came under the care of his grandfather Abdul Muttalib, who loved him deeply. After Abdul Muttalib passed away, his uncle Abu Talib became his guardian and protected him with loyalty and sacrifice for many years.',
      'As he grew, people in Makkah saw unmatched honesty and trust in him. He never joined idol worship and did not engage in the harmful habits of society. Because of his truthfulness and reliability, people called him Al-Ameen, the trustworthy. This reputation was established before revelation and became one of the clearest signs of his truth.',
      'In youth, he worked as a shepherd and later joined trade journeys. Shepherding taught responsibility and gentleness, while trade taught fairness, careful speech, and honoring agreements. Every part of his life was preparing him for leadership rooted in mercy, justice, and wisdom.',
      'This chapter teaches that Allah prepared His Messenger ﷺ step by step: through hardship, protection, honorable work, and pure character. The story of his early life shows that true greatness begins with sincerity, patience, and trust in Allah before public success appears.',
    ],
    references: [
      'Qur\'an 105:1-5 (Surah Al-Fil)',
      'Qur\'an 93:6-11 (Surah Ad-Duha)',
      'Sahih al-Bukhari: Prophets herded sheep',
      'Ar-Raheeq Al-Makhtum, early Makkah period',
    ],
    quizQuestions: [
      { id: 'c1q1', question: 'In which year-event and city was Prophet Muhammad ﷺ born?', expectedKeywords: ['year of the elephant', 'makkah', 'mecca'] },
      { id: 'c1q2', question: 'Who cared for the Prophet ﷺ after the death of his mother, and who cared for him after that?', expectedKeywords: ['abdul muttalib', 'abu talib'] },
      { id: 'c1q3', question: 'What title did the people of Makkah give him, and why?', expectedKeywords: ['al-ameen', 'trustworthy', 'honesty', 'truthful'] },
      { id: 'c1q4', question: 'Name one lesson the Prophet ﷺ learned from shepherding or trade in his youth.', expectedKeywords: ['patience', 'responsibility', 'fairness', 'trust', 'agreements'] },
      { id: 'c1q5', question: 'How did early hardships in his childhood help shape his character?', expectedKeywords: ['compassion', 'mercy', 'orphans', 'patience', 'trust in allah'] },
    ],
  },
  {
    chapterNumber: 2,
    slug: 'prophethood-and-early-call',
    title: 'Prophethood and the Early Call to Islam',
    subtitle: 'Hira, first revelation, first believers, and persecution',
    content: [
      'When Prophet Muhammad ﷺ approached the age of forty, he would withdraw to the Cave of Hira to reflect and worship Allah away from the idolatry of Makkah. His heart was already pure and searching for truth, and Allah was preparing him for the greatest mission in human history.',
      'In Ramadan, Angel Jibreel came to him in Hira and commanded, "Iqra" (Read/Recite). The first verses of Surah Al-Alaq were revealed, opening the era of final revelation. The Prophet ﷺ returned home shaken by the weight of this experience, carrying the trust of guidance for all humanity.',
      'Khadijah (RA) comforted him with wisdom and love. She reminded him of his noble character: that he helped relatives, supported the weak, honored guests, and stood with the oppressed. She became the first believer in Islam, showing that strong faith in the home gives strength to the mission outside.',
      'At first, da\'wah was private and focused on building sincere believers. Early Muslims included Khadijah, Ali, Zayd, and Abu Bakr (may Allah be pleased with them). After this foundation grew, the call became public: worship Allah alone, leave idols, and prepare for accountability in the Hereafter.',
      'Quraysh opposed Islam because Tawhid challenged their social and economic power. Their identity and influence were tied to idol worship, and Islam called all people to equality before Allah. They used mockery, pressure, boycott, and torture to stop the message.',
      'Despite severe persecution, believers remained patient. They knew that truth is not measured by comfort, but by obedience to Allah. This period built a generation of strong faith, sincere intention, and sacrifice for the sake of Allah.',
      'This chapter teaches that revelation began with knowledge, faith, and character. It also teaches that every reform starts by building hearts first, then communities. The early Makkan period remains a school of courage, conviction, and trust in Allah.',
    ],
    references: [
      'Qur\'an 96:1-5 (Surah Al-Alaq)',
      'Qur\'an 74:1-7 (Surah Al-Muddaththir)',
      'Sahih al-Bukhari, beginning of revelation',
      'Ar-Raheeq Al-Makhtum, first revelation and early da\'wah',
    ],
    quizQuestions: [
      { id: 'c2q1', question: 'Where did the first revelation come, and what was the first command?', expectedKeywords: ['cave of hira', 'hira', 'iqra', 'read', 'recite'] },
      { id: 'c2q2', question: 'How did Khadijah (RA) support the Prophet ﷺ after the first revelation?', expectedKeywords: ['comforted', 'supported', 'believed', 'first believer', 'noble character'] },
      { id: 'c2q3', question: 'Name two early Muslims mentioned in this chapter.', expectedKeywords: ['khadijah', 'ali', 'zayd', 'abu bakr'] },
      { id: 'c2q4', question: 'Why did Quraysh strongly oppose the message of Islam?', expectedKeywords: ['tawhid', 'idols', 'power', 'economy', 'status'] },
      { id: 'c2q5', question: 'What key lesson did the early persecution period teach the believers?', expectedKeywords: ['patience', 'steadfastness', 'sacrifice', 'faith', 'trust in allah'] },
    ],
  },
  {
    chapterNumber: 3,
    slug: 'hijrah-and-madinah',
    title: 'The Hijrah and Building of Madinah',
    subtitle: 'Boycott, migration, mosque, and community-building',
    content: [
      'As Islam spread, Quraysh increased pressure on Muslims through social and economic boycott. Believers endured hunger, fear, and isolation but did not leave their faith. This period trained the community in collective patience and unwavering trust in Allah.',
      'When opposition became severe, Allah opened a new stage through Hijrah. The Prophet ﷺ and his companions migrated from Makkah to Madinah, not as escape from duty, but as movement toward building a just community rooted in revelation.',
      'During the migration, the Prophet ﷺ and Abu Bakr (RA) stayed in Cave Thawr while enemies searched for them. At this tense moment, the Prophet ﷺ reminded Abu Bakr, "Do not grieve, indeed Allah is with us." This scene became one of the clearest lessons in tawakkul: planning with effort and trusting Allah with the result.',
      'On arrival near Madinah, Masjid Quba was established, followed by Masjid al-Nabawi. These were not only places of prayer; they became centers of education, leadership, social support, and unity.',
      'The Prophet ﷺ then created brotherhood between Muhajirun and Ansar. This was practical mercy: sharing wealth, homes, and emotional support so that no believer felt abandoned. Islam replaced tribal division with the bond of iman.',
      'The Constitution of Madinah introduced a framework of rights, responsibilities, justice, and cooperation between different groups in society. It showed that prophetic leadership combines worship with social order and fairness.',
      'This chapter teaches that Hijrah is transformation: from hardship to constructive action, from weakness to organized community, and from fear to principled leadership under Allah\'s guidance.',
    ],
    references: [
      'Qur\'an 17:1 (Isra)',
      'Qur\'an 9:40 (Cave of Thawr)',
      'Sahih al-Bukhari and Sahih Muslim, narrations of Hijrah',
      'Ar-Raheeq Al-Makhtum, Hijrah chapters',
    ],
    quizQuestions: [
      { id: 'c3q1', question: 'What major change did Hijrah represent besides physical migration?', expectedKeywords: ['transformation', 'community building', 'justice', 'new society', 'faith in action'] },
      { id: 'c3q2', question: 'What happened in Cave Thawr, and what lesson came from it?', expectedKeywords: ['abu bakr', 'allah is with us', 'tawakkul', 'trust', 'planning'] },
      { id: 'c3q3', question: 'Name the two mosques established in the early Madinah phase and their role.', expectedKeywords: ['masjid quba', 'masjid al-nabawi', 'worship', 'learning', 'community'] },
      { id: 'c3q4', question: 'How did brotherhood between Muhajirun and Ansar help society?', expectedKeywords: ['sharing', 'support', 'unity', 'wealth', 'homes'] },
      { id: 'c3q5', question: 'What principles were introduced through the Constitution of Madinah?', expectedKeywords: ['justice', 'rights', 'responsibilities', 'cooperation', 'order'] },
    ],
  },
  {
    chapterNumber: 4,
    slug: 'character-of-the-prophet',
    title: 'The Character of Prophet Muhammad ﷺ',
    subtitle: 'Mercy, honesty, patience, humility, and justice in daily life',
    content: [
      'Allah praised Prophet Muhammad ﷺ in the Qur\'an: "Indeed, you are of great moral character" (68:4). This was not a single quality but a complete personality guided by revelation. His character made the message of Islam visible in real life.',
      'He was described as a mercy to the worlds (21:107). He showed mercy to children, smiled at them, carried them, and cared for their feelings. He cared for the poor and weak, visited the sick, and taught that true strength is gentleness with people for the sake of Allah.',
      'Truthfulness and trust were constant in his life. Even before revelation, people trusted him with their valuables and disputes. He fulfilled trusts, kept promises, and spoke with clarity and honesty. This is why his call to faith was credible and deeply respected.',
      'His patience was visible in every stage: during insult, boycott, loss, leadership pressure, and victory. He did not react from ego. He forgave when forgiveness brought reform, and he stood firm when Allah\'s commands were violated. His patience was balanced, principled, and wise.',
      'Humility was central to his life. Although he was the Messenger of Allah, he lived simply, sat with ordinary people, helped at home, and disliked praise that led to arrogance. He taught that honor is in taqwa, not status.',
      'His justice was fair to all. He did not favor wealthy or powerful people over others. He taught that rights must be protected and wrongdoing corrected regardless of a person\'s social position. This made his society morally strong and trustworthy.',
      'When correcting mistakes, he often used gentle language and wise teaching instead of humiliating individuals. This method protected dignity while maintaining clear standards of right and wrong.',
      'This chapter teaches that loving the Prophet ﷺ is not only by words, but by copying his manners: honesty in speech, mercy in relationships, fairness in decisions, patience in hardship, and humility in daily life.',
    ],
    references: [
      'Qur\'an 68:4 (Great character)',
      'Qur\'an 21:107 (Mercy to the worlds)',
      'Sahih Muslim: Aishah (RA) on prophetic character',
      'Sahih al-Bukhari and Sahih Muslim, narrations on manners and mercy',
      'Riyad as-Salihin, chapters on character',
    ],
    quizQuestions: [
      { id: 'c4q1', question: 'Which two Qur\'an references in this chapter describe the Prophet\'s character and mercy?', expectedKeywords: ['68:4', '21:107', 'great moral character', 'mercy to the worlds'] },
      { id: 'c4q2', question: 'Give one example from the chapter of how the Prophet ﷺ treated children or weak people.', expectedKeywords: ['kindness', 'gentle', 'carried', 'smiled', 'cared', 'visited sick'] },
      { id: 'c4q3', question: 'Why was the title Al-Ameen important for his mission?', expectedKeywords: ['trust', 'truthful', 'credible', 'honesty', 'people trusted him'] },
      { id: 'c4q4', question: 'How did the Prophet ﷺ combine patience with principles?', expectedKeywords: ['forgave', 'stood firm', 'commands of allah', 'wisdom', 'not ego'] },
      { id: 'c4q5', question: 'Mention two manners from this chapter that Muslims should apply daily.', expectedKeywords: ['honesty', 'mercy', 'justice', 'humility', 'patience', 'good manners'] },
    ],
  },
  {
    chapterNumber: 5,
    slug: 'final-years-and-legacy',
    title: 'The Final Years and Legacy',
    subtitle: 'Farewell Pilgrimage, Final Sermon, and enduring guidance',
    content: [
      'In the final years of his life, Prophet Muhammad ﷺ completed his mission with clarity and mercy. In 10 AH, he performed the Farewell Pilgrimage and taught the Ummah the rituals of Hajj in a practical, complete way, reminding people to learn directly from his example.',
      'During this Hajj, he delivered the Final Sermon at Arafah. He emphasized the sanctity of life, honor, and property; warned against oppression and injustice; and reminded believers that they would answer to Allah. This sermon remains one of the most powerful ethical addresses in human history.',
      'He also taught equality: no Arab is superior to a non-Arab, and no non-Arab is superior to an Arab, except by taqwa. This message broke the pride of race and tribe and established dignity based on piety and character.',
      'Allah revealed in this period: "Today I have perfected for you your religion..." (Qur\'an 5:3). The companions understood that the message had reached completion and that preserving revelation and prophetic guidance would now be the Ummah\'s responsibility.',
      'During his final illness, the Prophet ﷺ remained concerned for prayer and for the unity of the community. He instructed Abu Bakr (RA) to lead the prayer, showing both the urgency of salah and the need for responsible leadership.',
      'When the Prophet ﷺ passed away, the companions were deeply shaken. Abu Bakr (RA) stood firm and reminded people with Qur\'an 3:144 that Muhammad is a Messenger, and messengers before him had passed away. Worship belongs to Allah alone, and the mission continues through obedience.',
      'This chapter teaches that the Prophet\'s legacy is a complete way of life: worship, justice, mercy, family rights, social responsibility, and sincere service to Allah. Loving him truly means following his Sunnah with knowledge, adab, and consistency.',
    ],
    references: [
      'Qur\'an 5:3 (Completion of religion)',
      'Qur\'an 3:144 (Messenger has passed)',
      'Sahih Muslim, Book of Hajj',
      'Sahih al-Bukhari, final illness narrations',
    ],
    quizQuestions: [
      { id: 'c5q1', question: 'What key themes did the Prophet ﷺ emphasize in the Final Sermon?', expectedKeywords: ['sanctity of life', 'justice', 'rights', 'no oppression', 'accountability'] },
      { id: 'c5q2', question: 'What equality principle did he teach at Arafah?', expectedKeywords: ['no arab over non-arab', 'taqwa', 'equality', 'piety'] },
      { id: 'c5q3', question: 'Which Qur\'an verse in this chapter mentions completion of religion?', expectedKeywords: ['5:3', 'today i have perfected', 'surah al maidah'] },
      { id: 'c5q4', question: 'Why was Abu Bakr (RA) leading prayer during the Prophet\'s final illness significant?', expectedKeywords: ['prayer', 'leadership', 'community order', 'responsibility'] },
      { id: 'c5q5', question: 'After the Prophet ﷺ passed away, what reminder did Abu Bakr (RA) give to the Ummah?', expectedKeywords: ['worship allah alone', '3:144', 'messenger has passed', 'continue mission'] },
    ],
  },
];

export const getSeerahChapter = (chapterNumber: number) => {
  return SEERAH_CHAPTERS.find((chapter) => chapter.chapterNumber === chapterNumber) || null;
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9:\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function scoreSeerahAnswers(chapterNumber: number, answers: string[]) {
  const chapter = getSeerahChapter(chapterNumber);
  if (!chapter) {
    return {
      marks: [0, 0, 0, 0, 0],
      total: 0,
    };
  }

  const marks: number[] = chapter.quizQuestions.map((question, index) => {
    const answer = normalize(String(answers[index] || ''));
    if (!answer) return 0;

    const keywordMatches = question.expectedKeywords.filter((kw) => answer.includes(normalize(kw))).length;
    if (keywordMatches === 0) return 0;

    return keywordMatches >= 2 ? 20 : 10;
  });

  const total = marks.reduce((sum: number, mark: number) => sum + mark, 0);
  return { marks, total };
}

export const getPassStatus = (score: number) => (score >= 70 ? 'passed' : 'needs_improvement');
