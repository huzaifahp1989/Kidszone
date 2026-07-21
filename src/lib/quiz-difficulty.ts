export type QuizDifficultyMode = 'younger' | 'older';

type DifficultyLabel = 'Easy' | 'Medium' | 'Hard' | 'Expert';

const DIFFICULTY_RANK: Record<DifficultyLabel, number> = {
  Easy: 0,
  Medium: 1,
  Hard: 2,
  Expert: 3,
};

function normalizeDifficulty(value: string | undefined | null): DifficultyLabel {
  const d = String(value || 'Medium') as DifficultyLabel;
  if (d in DIFFICULTY_RANK) return d;
  return 'Medium';
}

/** Filter and balance questions for younger vs older learners. */
export function applyDifficultyMode<T extends { difficulty?: string | null }>(
  questions: T[],
  mode: QuizDifficultyMode,
  count: number
): T[] {
  if (mode === 'older' || questions.length <= count) {
    return questions.slice(0, count);
  }

  const easyMedium = questions.filter((q) => {
    const rank = DIFFICULTY_RANK[normalizeDifficulty(q.difficulty)];
    return rank <= 1;
  });
  const hardExpert = questions.filter((q) => {
    const rank = DIFFICULTY_RANK[normalizeDifficulty(q.difficulty)];
    return rank >= 2;
  });

  const picked: T[] = [];
  const maxExpert = 1;

  for (const q of easyMedium) {
    if (picked.length >= count) break;
    picked.push(q);
  }

  let expertAdded = 0;
  for (const q of hardExpert) {
    if (picked.length >= count) break;
    const rank = DIFFICULTY_RANK[normalizeDifficulty(q.difficulty)];
    if (rank === 3 && expertAdded >= maxExpert) continue;
    if (picked.includes(q)) continue;
    picked.push(q);
    if (rank === 3) expertAdded += 1;
  }

  for (const q of questions) {
    if (picked.length >= count) break;
    if (!picked.includes(q)) picked.push(q);
  }

  return picked.slice(0, count);
}

export function difficultyModeFromAge(age: number | undefined | null): QuizDifficultyMode {
  if (typeof age === 'number' && Number.isFinite(age) && age > 0 && age <= 8) {
    return 'younger';
  }
  return 'older';
}
