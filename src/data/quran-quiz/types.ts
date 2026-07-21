export type QuranQuizDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Expert'

export interface QuranQuizQuestion {
  id: string
  question: string
  story?: string
  options: string[]
  correctAnswer: number
  difficulty: QuranQuizDifficulty
  /** Detailed learning category shown in the quiz UI */
  quranCategory: string
  /** Topic bucket used by the quiz selector */
  category: 'Quran'
  surah?: string
  reference?: string
  explanation: string
  didYouKnow?: string
  points?: number
}

export interface SurahCatalogEntry {
  number: number
  name: string
  revelation: 'Makki' | 'Madani'
  themes: string[]
  story?: string
  prophets?: string[]
  people?: string[]
  places?: string[]
  animals?: string[]
  reference?: string
  fact?: string
}
