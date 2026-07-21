export type TopicQuizDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Expert'

export interface TopicQuizQuestion {
  id: string
  question: string
  story?: string
  options: string[]
  correctAnswer: number
  difficulty: TopicQuizDifficulty
  category: string
  explanation: string
  didYouKnow?: string
  points?: number
}

export function tq(
  id: string,
  category: string,
  data: Omit<TopicQuizQuestion, 'id' | 'category' | 'points'>
): TopicQuizQuestion {
  return { id, category, points: 10, ...data }
}
