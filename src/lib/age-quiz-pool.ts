import { AGE_GROUPS, type AgeGroup, type QuizQuestion } from '@/data/age-specific-content';

export function ageGroupFromAge(age: number | undefined | null): AgeGroup {
  const n = typeof age === 'number' ? age : Number(age);
  if (!Number.isFinite(n) || n <= 0) return '9-11';
  if (n <= 8) return '6-8';
  if (n <= 11) return '9-11';
  return '12-14';
}

function mapAgeQuizzes(group: AgeGroup) {
  const quizzes: QuizQuestion[] = AGE_GROUPS[group]?.quizzes || [];
  const difficulty =
    group === '6-8' ? 'Easy' : group === '9-11' ? 'Medium' : 'Hard';

  return quizzes.map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    category: q.category,
    difficulty,
    points: 10,
  }));
}

/** Map age-specific quizzes into the shared topic quiz question shape. */
export function getAgeSpecificQuizPool(age: number | undefined | null) {
  return mapAgeQuizzes(ageGroupFromAge(age));
}

/** All age-band questions (for validating submitted quiz ids). */
export function getAllAgeSpecificQuizPools() {
  return (Object.keys(AGE_GROUPS) as AgeGroup[]).flatMap((group) => mapAgeQuizzes(group));
}
