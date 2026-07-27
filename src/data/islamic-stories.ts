// Islamic stories for kids with daily rotation
export interface IslamicStory {
  id: string;
  title: string;
  narrative: string;
  lesson: string;
  characters: string[];
  questions: Array<{
    id: string;
    question: string;
    options?: string[];
    correctAnswer?: number | string;
    type: 'multiple-choice' | 'true-false' | 'open';
  }>;
}

export const islamicStoriesList: IslamicStory[] = [
  {
    id: 'story-1',
    title: 'The Boy Who Shared His Meal',
    narrative:
      'There was a boy named Zayn who lived in a small village. One day, he was eating his lunch under a tree when he saw an old man walking slowly, looking very tired and hungry. Zayn remembered what his mother taught him about helping others. Without hesitation, he called the old man and shared his meal with him. The old man ate and thanked Zayn with a smile. Later, Zayn learned that the old man was a traveler who had walked many miles. Many people had passed by him, but only Zayn had shown kindness.',
    lesson: 'Sharing with others and showing kindness to strangers is a beautiful act that Allah loves. Even small acts of generosity can bring great joy.',
    characters: ['Zayn', 'Old Man'],
    questions: [
      {
        id: 'q1',
        question: 'Why did Zayn share his meal with the old man?',
        options: [
          'Because his mother taught him to help others',
          'Because the old man was his friend',
          'Because he had too much food',
          'Because the old man asked him loudly',
        ],
        correctAnswer: 0,
        type: 'multiple-choice',
      },
      {
        id: 'q2',
        question: 'What did the old man do after eating?',
        options: ['He said thank you', 'He gave Zayn money', 'He left quickly', 'He asked for more food'],
        correctAnswer: 0,
        type: 'multiple-choice',
      },
      {
        id: 'q3',
        question: 'True or False: Many people had stopped to help the old man before Zayn.',
        options: ['True', 'False'],
        correctAnswer: 1,
        type: 'true-false',
      },
    ],
  },
  {
    id: 'story-2',
    title: 'Ants in Paradise',
    narrative:
      'There was a man named Abdullah who saw an ant struggling to carry a grain of wheat. The ant was carrying something much heavier than itself. Abdullah watched as the ant tried again and again, never giving up. He was amazed at the ant\'s determination and hard work. Abdullah realized that even the smallest creatures work hard and have purpose. He thought about how Allah has given every living thing its role. From that day on, Abdullah respected all of Allah\'s creation and never hurt any insect. He taught his children the same lesson.',
    lesson: 'Every creature has purpose and dignity in Allah\'s creation. Hard work and perseverance are virtues that even the smallest creatures teach us.',
    characters: ['Abdullah', 'Ant'],
    questions: [
      {
        id: 'q1',
        question: 'What was the ant carrying?',
        options: ['A grain of wheat', 'A piece of bread', 'Water', 'A seed'],
        correctAnswer: 0,
        type: 'multiple-choice',
      },
      {
        id: 'q2',
        question: 'What did Abdullah learn from watching the ant?',
        options: [
          'Determination and hard work',
          'How to build an anthill',
          'That ants are lazy',
          'How to farm',
        ],
        correctAnswer: 0,
        type: 'multiple-choice',
      },
      {
        id: 'q3',
        question: 'True or False: Abdullah started hurting insects after this experience.',
        options: ['True', 'False'],
        correctAnswer: 1,
        type: 'true-false',
      },
    ],
  },
  {
    id: 'story-3',
    title: 'The Honest Shepherd',
    narrative:
      'A young shepherd named Bilal watched over his flock in the desert. One day, a wolf came and tried to attack the sheep. Bilal bravely scared the wolf away with rocks and shouting. He could have run away, but instead he protected the animals he was responsible for. His honesty and dedication to his duty made him trustworthy. Years later, people remembered Bilal as someone who could always be counted on. He never shirked his responsibility, no matter how difficult or dangerous.',
    lesson: 'Honesty, courage, and being faithful to your duties are qualities that make people respect and trust you.',
    characters: ['Bilal', 'Wolf', 'Sheep'],
    questions: [
      {
        id: 'q1',
        question: 'What attacked the flock?',
        options: ['A wolf', 'A lion', 'A snake', 'A hyena'],
        correctAnswer: 0,
        type: 'multiple-choice',
      },
      {
        id: 'q2',
        question: 'How did Bilal protect the sheep?',
        options: [
          'He scared the wolf away with rocks and shouting',
          'He ran away',
          'He called for help',
          'He hid the sheep',
        ],
        correctAnswer: 0,
        type: 'multiple-choice',
      },
      {
        id: 'q3',
        question: 'What quality made Bilal trustworthy?',
        options: [
          'His honesty and dedication to duty',
          'His strength',
          'His wealth',
          'His family name',
        ],
        correctAnswer: 0,
        type: 'multiple-choice',
      },
    ],
  },
  {
    id: 'story-4',
    title: 'The Grateful Daughter',
    narrative:
      'Fatima had elderly parents who loved her dearly. When she grew up, she remembered all the sacrifices they made for her. She cooked for them, helped them walk, and listened to their stories with patience and joy. She never got angry when they repeated themselves or needed help multiple times a day. Her siblings sometimes complained about caring for their parents, but Fatima saw it as an honor. She knew Allah was watching and that serving parents is one of the greatest acts of worship. Because of Fatima\'s kindness, her parents lived their final years feeling loved and valued.',
    lesson: 'Honoring and serving your parents is a beautiful responsibility. Allah rewards those who treat their parents with kindness and patience.',
    characters: ['Fatima', 'Mother', 'Father'],
    questions: [
      {
        id: 'q1',
        question: 'How did Fatima show respect to her parents?',
        options: [
          'By cooking for them, helping them walk, and listening patiently',
          'By giving them money',
          'By visiting them once a year',
          'By complaining about them',
        ],
        correctAnswer: 0,
        type: 'multiple-choice',
      },
      {
        id: 'q2',
        question: 'What did Fatima never do when caring for her parents?',
        options: ['Get angry', 'Help them', 'Listen to them', 'Cook for them'],
        correctAnswer: 0,
        type: 'multiple-choice',
      },
      {
        id: 'q3',
        question: 'True or False: Fatima saw caring for parents as a burden.',
        options: ['True', 'False'],
        correctAnswer: 1,
        type: 'true-false',
      },
    ],
  },
  {
    id: 'story-5',
    title: 'The Truthful Boy',
    narrative:
      'A boy named Hasan was playing with his friends when his mother\'s expensive vase was accidentally broken. His friends urged him to hide it and blame it on someone else. For a moment, Hasan was scared about what his mother would think. But he remembered his grandfather\'s words: "Truth may hurt at first, but it sets you free." Hasan went to his mother and told her the truth. Instead of being very angry, his mother hugged him and said she was proud of his courage. She said that honesty was worth more than any vase. Hasan learned that telling the truth, even when scared, brings peace to your heart.',
    lesson: 'Being truthful, even when it\'s difficult, brings true peace and earns the respect of those who love you.',
    characters: ['Hasan', 'Mother', 'Friends'],
    questions: [
      {
        id: 'q1',
        question: 'What happened in the story?',
        options: [
          'A vase was broken',
          'A cup was broken',
          'A plate was broken',
          'A window was broken',
        ],
        correctAnswer: 0,
        type: 'multiple-choice',
      },
      {
        id: 'q2',
        question: 'What did Hasan\'s friends want him to do?',
        options: [
          'Blame someone else for the broken vase',
          'Tell his mother the truth',
          'Help him glue it',
          'Buy a new one',
        ],
        correctAnswer: 0,
        type: 'multiple-choice',
      },
      {
        id: 'q3',
        question: 'What was his mother proud of?',
        options: ['His courage to tell the truth', 'His strength', 'His intelligence', 'His friendship'],
        correctAnswer: 0,
        type: 'multiple-choice',
      },
    ],
  },
  {
    id: 'story-6',
    title: 'The Patient Student',
    narrative:
      'Amira was learning to read the Quran from her teacher. Some letters were difficult for her, and she stumbled over words. Other students in the class seemed to learn faster. Amira felt discouraged and wanted to quit. But her teacher told her a story about a student who took years to memorize the Quran. She said, "Every step forward is progress. Allah values your effort, not just your speed." Amira took these words to heart. She practiced every day, and slowly, her reading improved. Years later, when she finally finished reading the entire Quran beautifully, she felt a joy that no quick achievement could have brought.',
    lesson: 'Patience and consistent effort lead to beautiful results. Allah appreciates your sincere dedication, no matter how long the journey takes.',
    characters: ['Amira', 'Teacher'],
    questions: [
      {
        id: 'q1',
        question: 'What was Amira learning to do?',
        options: ['Read the Quran', 'Write Arabic', 'Memorize hadith', 'Speak Arabic'],
        correctAnswer: 0,
        type: 'multiple-choice',
      },
      {
        id: 'q2',
        question: 'What did her teacher tell her about effort?',
        options: [
          'Allah values your effort, not just your speed',
          'Speed is the only thing that matters',
          'Effort does not matter',
          'Give up if it is hard',
        ],
        correctAnswer: 0,
        type: 'multiple-choice',
      },
      {
        id: 'q3',
        question: 'True or False: Amira quit after finding it difficult.',
        options: ['True', 'False'],
        correctAnswer: 1,
        type: 'true-false',
      },
    ],
  },
  {
    id: 'story-7',
    title: 'The Generous Merchant',
    narrative:
      'A wealthy merchant named Omar had a beautiful shop filled with goods. One day, a widow came to his shop looking very sad. She needed fabric to make clothes to sell, but she had very little money. Omar could have turned her away, but instead he gave her high-quality fabric at a price he knew she could afford. The widow was shocked by his kindness. She thanked him many times. Years later, this widow became successful because she had quality products to work with. She always remembered Omar\'s kindness and told everyone about his generosity. Soon, many people came to Omar\'s shop because they knew he was kind and fair.',
    lesson: 'Generosity and fairness in business bring blessings and respect. Helping others often leads to unexpected goodness in return.',
    characters: ['Omar', 'Widow'],
    questions: [
      {
        id: 'q1',
        question: 'What kind of shop did Omar own?',
        options: ['A shop selling fabric and goods', 'A restaurant', 'A bookstore', 'A toy shop'],
        correctAnswer: 0,
        type: 'multiple-choice',
      },
      {
        id: 'q2',
        question: 'Why did the widow come to Omar\'s shop?',
        options: [
          'She needed fabric to make clothes to sell',
          'She wanted to buy a dress',
          'She wanted to work there',
          'She was looking for her friend',
        ],
        correctAnswer: 0,
        type: 'multiple-choice',
      },
      {
        id: 'q3',
        question: 'What happened after Omar helped the widow?',
        options: [
          'Many people came to his shop because of his kindness',
          'He lost his business',
          'The widow forgot him',
          'His shop closed',
        ],
        correctAnswer: 0,
        type: 'multiple-choice',
      },
    ],
  },
  {
    id: 'story-8',
    title: 'The Humble Scholar',
    narrative:
      'Dr. Hassan was a famous scholar who knew many things about Islam and the sciences. Despite his knowledge and fame, he remained very humble. When young students asked him questions, he listened carefully and treated their questions with respect. If he didn\'t know the answer, he would say honestly, "I don\'t know, but let us find out together." Many scholars were proud and dismissive of simple questions, but Hassan was different. His humility made students love learning. They wanted to sit with him and ask questions. Hassan believed that true knowledge comes with humility, and the moment you think you know everything, you stop learning.',
    lesson: 'True knowledge brings humility, not pride. The wisest people are always willing to learn and help others understand.',
    characters: ['Dr. Hassan', 'Students'],
    questions: [
      {
        id: 'q1',
        question: 'Was Dr. Hassan proud of his knowledge?',
        options: ['No, he was humble', 'Yes, very proud', 'Sometimes proud', 'He did not care'],
        correctAnswer: 0,
        type: 'multiple-choice',
      },
      {
        id: 'q2',
        question: 'What did Hassan do when he didn\'t know an answer?',
        options: [
          'He said honestly he did not know and suggested finding out together',
          'He pretended to know',
          'He ignored the question',
          'He got angry',
        ],
        correctAnswer: 0,
        type: 'multiple-choice',
      },
      {
        id: 'q3',
        question: 'True or False: Hassan thought he knew everything.',
        options: ['True', 'False'],
        correctAnswer: 1,
        type: 'true-false',
      },
    ],
  },
  {
    id: 'story-9',
    title: 'The Lost Coin',
    narrative:
      'A little girl named Layla found a coin on the street. It was valuable, and she could have bought candy with it. Instead, she looked around to see if anyone had lost it. She asked shopkeepers if anyone had reported losing a coin. An old man who owned the shop said yes, a poor woman had lost a coin that morning. Layla gave him the coin to return to the woman. When the woman received her coin, she cried with joy because it was all the money she had to buy food that day. Layla\'s honesty had saved her from going hungry. That night, Layla\'s mother hugged her and said Allah was pleased with her choice.',
    lesson: 'Honesty and returning what belongs to others, even when no one is watching, is deeply rewarded by Allah.',
    characters: ['Layla', 'Old Man', 'Poor Woman'],
    questions: [
      {
        id: 'q1',
        question: 'What did Layla find?',
        options: ['A coin', 'A ring', 'A watch', 'A necklace'],
        correctAnswer: 0,
        type: 'multiple-choice',
      },
      {
        id: 'q2',
        question: 'Why was the coin important to the poor woman?',
        options: [
          'It was all the money she had to buy food',
          'It was valuable jewelry',
          'It was a gift',
          'It was old and rare',
        ],
        correctAnswer: 0,
        type: 'multiple-choice',
      },
      {
        id: 'q3',
        question: 'What did Layla learn from this experience?',
        options: [
          'That honesty brings joy to others and pleases Allah',
          'That it is better to keep found things',
          'That poor people do not deserve help',
          'That shopkeepers are not honest',
        ],
        correctAnswer: 0,
        type: 'multiple-choice',
      },
    ],
  },
  {
    id: 'story-10',
    title: 'The Two Friends',
    narrative:
      'Ahmed and Khalid were best friends. One day, Ahmed made a mistake that got Khalid in trouble at school. Khalid could have stayed angry forever, or he could have told everyone that Ahmed had made the mistake, not him. But Khalid thought about his friendship with Ahmed. He knew Ahmed had not done it on purpose. Khalid went to Ahmed and said, "I forgive you, but please be more careful." Ahmed felt so grateful for Khalid\'s forgiveness that he worked hard to be a better friend. Because of Khalid\'s mercy and forgiveness, their friendship became even stronger. They learned that true friendship means forgiving mistakes when your friend is sorry.',
    lesson: 'Forgiving friends when they make mistakes shows true friendship. Mercy and patience strengthen bonds between people.',
    characters: ['Ahmed', 'Khalid'],
    questions: [
      {
        id: 'q1',
        question: 'What happened between Ahmed and Khalid?',
        options: [
          'Ahmed made a mistake that got Khalid in trouble',
          'Khalid made a mistake',
          'They had a big fight',
          'They stopped being friends',
        ],
        correctAnswer: 0,
        type: 'multiple-choice',
      },
      {
        id: 'q2',
        question: 'What did Khalid choose to do?',
        options: [
          'Forgive Ahmed and strengthen their friendship',
          'Tell everyone Ahmed was wrong',
          'Never speak to Ahmed again',
          'Report him to the teacher',
        ],
        correctAnswer: 0,
        type: 'multiple-choice',
      },
      {
        id: 'q3',
        question: 'True or False: Their friendship got weaker after the mistake.',
        options: ['True', 'False'],
        correctAnswer: 1,
        type: 'true-false',
      },
    ],
  },
];

export function getStoriesForDay(date = new Date()): IslamicStory[] {
  if (!islamicStoriesList.length) {
    throw new Error('No stories available');
  }

  const dayIndex = Math.floor(date.getTime() / 86_400_000);
  const index = dayIndex % islamicStoriesList.length;
  return [islamicStoriesList[index]];
}

export function getStoryById(id: string): IslamicStory | undefined {
  return islamicStoriesList.find((s) => s.id === id);
}
