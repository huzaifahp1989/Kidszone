export type StoryQuizOptionKey = 'A' | 'B' | 'C' | 'D';

export type StoryQuizQuestion = {
  question: string;
  options: Record<StoryQuizOptionKey, string>;
  correct_answer: StoryQuizOptionKey;
};

export type StoryQuizBand = 'younger' | 'older';

export type StoryQuiz = {
  engagement_message: string;
  quiz: StoryQuizQuestion[];
  /** Optional harder set for older learners (9+). */
  olderQuiz?: StoryQuizQuestion[];
};

const YOUNGER_GENERIC: StoryQuizQuestion[] = [
  {
    question: 'Who should we always ask for help?',
    options: {
      A: 'Only our friends',
      B: 'Allah',
      C: 'Toys',
      D: 'Nobody',
    },
    correct_answer: 'B',
  },
  {
    question: 'What do good stories from Islam teach us?',
    options: {
      A: 'To be kind and patient',
      B: 'To be angry',
      C: 'To give up',
      D: 'To hide from everyone',
    },
    correct_answer: 'A',
  },
  {
    question: 'When we make a mistake, what should we do?',
    options: {
      A: 'Say sorry and turn back to Allah',
      B: 'Never try again',
      C: 'Blame others',
      D: 'Ignore it forever',
    },
    correct_answer: 'A',
  },
];

const OLDER_GENERIC: StoryQuizQuestion[] = [
  {
    question: 'What is a key lesson from Islamic stories of the prophets?',
    options: {
      A: 'Trust in Allah and stay patient in hardship',
      B: 'Success comes only from wealth',
      C: 'Never ask for forgiveness',
      D: 'Avoid helping others',
    },
    correct_answer: 'A',
  },
  {
    question: 'Why do we read stories of the prophets?',
    options: {
      A: 'For entertainment only',
      B: 'To learn faith, manners, and how to live for Allah',
      C: 'To copy every detail without thinking',
      D: 'To argue with others',
    },
    correct_answer: 'B',
  },
  {
    question: 'When a prophet faced difficulty, what did they usually do first?',
    options: {
      A: 'Give up hope',
      B: 'Turn to Allah with dua and patience',
      C: 'Blame their people forever',
      D: 'Hide the truth',
    },
    correct_answer: 'B',
  },
];

export const storyQuizzesByTitle: Record<string, StoryQuiz> = {
  'Prophet Yunus (Jonah) and the Rescue from Darkness': {
    engagement_message: 'Answer 3 questions about the story!',
    quiz: [
      {
        question: 'Where was Prophet Yunus when he needed Allah’s help?',
        options: {
          A: 'Inside a big fish in the dark',
          B: 'On a mountain',
          C: 'In a garden',
          D: 'At school',
        },
        correct_answer: 'A',
      },
      {
        question: 'What did Yunus say in his dua?',
        options: {
          A: 'That he never needed help',
          B: 'That he was among the wrongdoers',
          C: 'That he was always right',
          D: 'That he wanted treasure',
        },
        correct_answer: 'B',
      },
      {
        question: 'What is the main lesson?',
        options: {
          A: 'Never travel by ship',
          B: 'Give up when things are hard',
          C: 'Return to Allah with humility and patience',
          D: 'Hide your mistakes',
        },
        correct_answer: 'C',
      },
    ],
    olderQuiz: [
      {
        question: 'Why did Prophet Yunus (peace be upon him) need Allah’s help the most?',
        options: {
          A: 'He was in darkness inside a fish and could not escape',
          B: 'He wanted to become the captain of the ship',
          C: 'He was building a house by the sea',
          D: 'He was looking for treasure underwater',
        },
        correct_answer: 'A',
      },
      {
        question: 'What did Yunus admit in his dua to Allah?',
        options: {
          A: 'That he was always correct',
          B: 'That he was among the wrongdoers',
          C: 'That he never needed help',
          D: 'That he was afraid of water',
        },
        correct_answer: 'B',
      },
      {
        question: 'How did Allah respond to Yunus’s sincere dua?',
        options: {
          A: 'Allah rescued him and brought him safely to shore',
          B: 'Allah left him in the sea forever',
          C: 'Allah turned the ship into a mountain',
          D: 'Allah made the storm stronger',
        },
        correct_answer: 'A',
      },
    ],
  },
};

export function getStoryQuizForTitle(
  title: string | null | undefined,
  band: StoryQuizBand
): { engagement_message: string; quiz: StoryQuizQuestion[] } {
  const entry = title ? storyQuizzesByTitle[title] : undefined;
  if (entry) {
    const quiz =
      band === 'older' && entry.olderQuiz?.length
        ? entry.olderQuiz.slice(0, 3)
        : entry.quiz.slice(0, 3);
    return {
      engagement_message: entry.engagement_message,
      quiz,
    };
  }

  return {
    engagement_message:
      band === 'younger'
        ? 'Quick questions after your story!'
        : 'Reflect on the story with these questions.',
    quiz: band === 'younger' ? YOUNGER_GENERIC : OLDER_GENERIC,
  };
}
