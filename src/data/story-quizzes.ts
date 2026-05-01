export type StoryQuizOptionKey = 'A' | 'B' | 'C' | 'D';

export type StoryQuizQuestion = {
  question: string;
  options: Record<StoryQuizOptionKey, string>;
  correct_answer: StoryQuizOptionKey;
};

export type StoryQuiz = {
  engagement_message: string;
  quiz: StoryQuizQuestion[];
  points_per_question: 20;
  total_points: 100;
  daily_limit: 2;
};

export const storyQuizzesByTitle: Record<string, StoryQuiz> = {
  'Prophet Yunus (Jonah) and the Rescue from Darkness': {
    engagement_message: 'Complete the quiz to earn 100 points!',
    points_per_question: 20,
    total_points: 100,
    daily_limit: 2,
    quiz: [
      {
        question: 'Why did Prophet Yunus (peace be upon him) need Allah’s help the most?',
        options: {
          A: 'He was in darkness inside a fish and could not escape',
          B: 'He wanted to become the captain of the ship',
          C: 'He was building a house by the sea',
          D: 'He was looking for treasure underwater'
        },
        correct_answer: 'A'
      },
      {
        question: 'What happened on the ship during the storm?',
        options: {
          A: 'Everyone fell asleep immediately',
          B: 'The passengers drew lots and Yunus was chosen',
          C: 'The ship reached land safely right away',
          D: 'The storm stopped because of a loud drum'
        },
        correct_answer: 'B'
      },
      {
        question: 'What did Yunus admit in his dua to Allah?',
        options: {
          A: 'That he was always correct',
          B: 'That he was among the wrongdoers',
          C: 'That he never needed help',
          D: 'That he was afraid of water'
        },
        correct_answer: 'B'
      },
      {
        question: 'How did Allah respond to Yunus’s sincere dua?',
        options: {
          A: 'Allah rescued him and brought him safely to shore',
          B: 'Allah left him in the sea forever',
          C: 'Allah turned the ship into a mountain',
          D: 'Allah made the storm stronger'
        },
        correct_answer: 'A'
      },
      {
        question: 'What is the main lesson of this story?',
        options: {
          A: 'Never travel by ship',
          B: 'Despair when you make a mistake',
          C: 'Return to Allah with humility and patience',
          D: 'Hide your mistakes from everyone'
        },
        correct_answer: 'C'
      }
    ]
  }
};

