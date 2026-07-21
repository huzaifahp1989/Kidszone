import { SURAH_CATALOG, pickOtherSurahNames } from '@/data/quran-quiz/catalog'
import { CURATED_QURAN_QUESTIONS } from '@/data/quran-quiz/curated'
import type { QuranQuizQuestion, SurahCatalogEntry } from '@/data/quran-quiz/types'

function shuffleOptions(correctLabel: string, distractors: string[]): { options: string[]; correctAnswer: number } {
  const options = [correctLabel, ...distractors]
  let seed = correctLabel.length
  for (let i = options.length - 1; i > 0; i--) {
    seed = (seed * 1664525 + 1013904223) >>> 0
    const j = seed % (i + 1)
    ;[options[i], options[j]] = [options[j], options[i]]
  }
  return { options, correctAnswer: options.indexOf(correctLabel) }
}

function fromStory(entry: SurahCatalogEntry): QuranQuizQuestion | null {
  if (!entry.story) return null
  const correct = `Surah ${entry.name}`
  const { options, correctAnswer } = shuffleOptions(correct, pickOtherSurahNames(entry.name))
  return {
    id: `quran-gen-story-${entry.number}`,
    points: 10,
    story: entry.story,
    question: 'Which Surah contains this story or teaching?',
    options,
    correctAnswer,
    difficulty: entry.number <= 30 ? 'Easy' : 'Medium',
    quranCategory: 'Which Surah contains this story?',
    category: 'Quran',
    surah: correct,
    reference: entry.reference,
    explanation: `${correct} teaches important lessons about faith, trust in Allah, and righteous character.`,
    didYouKnow: entry.fact,
  }
}

function fromRevelation(entry: SurahCatalogEntry): QuranQuizQuestion {
  const correct = entry.revelation === 'Makki' ? 'Makki (revealed in Makkah)' : 'Madani (revealed in Madinah)'
  const wrong = entry.revelation === 'Makki' ? 'Madani (revealed in Madinah)' : 'Makki (revealed in Makkah)'
  const { options, correctAnswer } = shuffleOptions(correct, [
    wrong,
    'Revealed only after the conquest of Makkah',
    'Not known to scholars',
  ])
  return {
    id: `quran-gen-rev-${entry.number}`,
    points: 10,
    question: `Was Surah ${entry.name} mainly Makki or Madani?`,
    options,
    correctAnswer,
    difficulty: entry.number >= 78 ? 'Hard' : 'Medium',
    quranCategory: 'Makki vs Madani Surahs',
    category: 'Quran',
    surah: `Surah ${entry.name}`,
    reference: entry.reference,
    explanation: `${correct.replace(' (revealed in Makkah)', '').replace(' (revealed in Madinah)', '')} Surahs often focus on ${entry.revelation === 'Makki' ? 'faith, patience, and the Hereafter' : 'law, community life, and social guidance'}.`,
    didYouKnow: entry.fact,
  }
}

function fromFact(entry: SurahCatalogEntry): QuranQuizQuestion | null {
  if (!entry.fact) return null
  const correct = `Surah ${entry.name}`
  const { options, correctAnswer } = shuffleOptions(correct, pickOtherSurahNames(entry.name))
  return {
    id: `quran-gen-fact-${entry.number}`,
    points: 10,
    question: `Which Surah is linked to this fact: "${entry.fact}"`,
    options,
    correctAnswer,
    difficulty: 'Medium',
    quranCategory: 'Quran facts',
    category: 'Quran',
    surah: correct,
    reference: entry.reference,
    explanation: entry.fact,
    didYouKnow: entry.themes.length ? `Key themes include ${entry.themes.slice(0, 2).join(' and ')}.` : undefined,
  }
}

function fromProphet(entry: SurahCatalogEntry): QuranQuizQuestion | null {
  const prophet = entry.prophets?.[0]
  if (!prophet) return null
  const correct = `Surah ${entry.name}`
  const { options, correctAnswer } = shuffleOptions(correct, pickOtherSurahNames(entry.name))
  return {
    id: `quran-gen-prophet-${entry.number}-${prophet.toLowerCase()}`,
    points: 10,
    question: `Prophet ${prophet} (AS) is prominently mentioned in which Surah?`,
    options,
    correctAnswer,
    difficulty: 'Medium',
    quranCategory: 'Which Prophet is mentioned?',
    category: 'Quran',
    surah: correct,
    reference: entry.reference,
    explanation: `Surah ${entry.name} helps us learn from Prophet ${prophet} (AS) and his trust in Allah.`,
    didYouKnow: entry.fact,
  }
}

function fromTheme(entry: SurahCatalogEntry): QuranQuizQuestion | null {
  const theme = entry.themes[0]
  if (!theme) return null
  const correct = `Surah ${entry.name}`
  const { options, correctAnswer } = shuffleOptions(correct, pickOtherSurahNames(entry.name))
  return {
    id: `quran-gen-theme-${entry.number}`,
    points: 10,
    question: `Which Surah is especially known for teaching about ${theme.toLowerCase()}?`,
    options,
    correctAnswer,
    difficulty: 'Hard',
    quranCategory: 'Lessons from Surahs',
    category: 'Quran',
    surah: correct,
    reference: entry.reference,
    explanation: `${correct} guides believers toward ${theme.toLowerCase()} and stronger iman.`,
    didYouKnow: entry.fact,
  }
}

export function buildGeneratedQuranQuestions(): QuranQuizQuestion[] {
  const generated: QuranQuizQuestion[] = []
  const seenIds = new Set<string>()

  const add = (question: QuranQuizQuestion | null) => {
    if (!question || seenIds.has(question.id)) return
    seenIds.add(question.id)
    generated.push(question)
  }

  for (const entry of SURAH_CATALOG) {
    add(fromStory(entry))
    add(fromRevelation(entry))
    add(fromFact(entry))
    add(fromProphet(entry))
    add(fromTheme(entry))
  }

  return generated
}

export function buildQuranQuizQuestionPool(): QuranQuizQuestion[] {
  const combined = [...CURATED_QURAN_QUESTIONS, ...buildGeneratedQuranQuestions()]
  const byId = new Map<string, QuranQuizQuestion>()
  for (const question of combined) {
    byId.set(question.id, question)
  }
  return [...byId.values()]
}

export const quranQuizQuestions = buildQuranQuizQuestionPool()
