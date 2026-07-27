import { NextResponse } from 'next/server';
import {
  FEATURED_DAILY_CHALLENGE_QUESTION_COUNT,
  resolveFeaturedDailyChallenge,
} from '@/lib/featured-daily-challenge';
import { getDailyTopicSeed } from '@/lib/quiz-topics';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  const daySeed = getDailyTopicSeed();
  const quiz = await resolveFeaturedDailyChallenge(userId, daySeed);

  if (quiz.questions.length < FEATURED_DAILY_CHALLENGE_QUESTION_COUNT) {
    return NextResponse.json(
      {
        error: 'Not enough featured challenge questions are available right now.',
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    quizId: quiz.quizId,
    daySeed: quiz.daySeed,
    questions: quiz.questions,
    questionIds: quiz.questionIds,
    categoriesUsed: quiz.categoriesUsed,
    attemptsToday: quiz.attemptsToday,
    title: 'Featured Daily Islamic Challenge',
    subtitle: '10 authentic questions from 10 different Islamic topics',
    questionsRefreshNote:
      'Fresh categories and answer choices every day. Correctly answered featured questions stay out of your future challenge pool.',
  });
}
