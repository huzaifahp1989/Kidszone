import { NextResponse } from 'next/server';
import { getChallengeQuizConfig, CHALLENGE_TIMER_SECONDS } from '@/data/challenge-quizzes';
import { loadChallengeQuestions, shuffle } from '@/lib/challenge-quiz-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const quiz = searchParams.get('quiz') || '';
  const config = getChallengeQuizConfig(quiz);
  if (!config) {
    return NextResponse.json({ error: 'Unknown quiz' }, { status: 400 });
  }

  const { questions, source } = await loadChallengeQuestions(config.key);

  // Randomise the main questions per child; keep bonus question(s) at the end.
  const main = shuffle(questions.filter((q) => !q.isBonus));
  const bonus = questions.filter((q) => q.isBonus);
  const ordered = [...main, ...bonus];

  return NextResponse.json({
    quiz: {
      key: config.key,
      title: config.title,
      emoji: config.emoji,
      description: config.description,
      passScore: config.passScore,
      awardsBadge: config.awardsBadge,
      timerSeconds: CHALLENGE_TIMER_SECONDS,
      mainCount: main.length,
      bonusCount: bonus.length,
    },
    source,
    questions: ordered.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      isBonus: q.isBonus,
      points: q.points,
      answer: q.answer,
      acceptedAnswers: q.acceptedAnswers,
      explanation: q.explanation,
    })),
  });
}
