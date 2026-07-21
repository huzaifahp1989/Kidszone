import { NextResponse } from 'next/server'
import { getTopicById, getDailyTopicSeed, type QuizTopicId } from '@/lib/quiz-topics'
import { resolveTopicQuizQuestions } from '@/lib/quiz-topic-questions'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const topic = searchParams.get('topic')
  const userId = searchParams.get('userId')

  if (!topic || !userId) {
    return NextResponse.json({ error: 'topic and userId are required' }, { status: 400 })
  }

  const topicInfo = getTopicById(topic)
  if (!topicInfo) {
    return NextResponse.json({ error: 'Invalid topic' }, { status: 400 })
  }

  const daySeed = getDailyTopicSeed()
  const quiz = await resolveTopicQuizQuestions(topic as QuizTopicId, userId, daySeed)

  if (!quiz.questions.length) {
    return NextResponse.json({ error: 'No questions available for this topic.' }, { status: 404 })
  }

  return NextResponse.json({
    topic: topicInfo.id,
    topicLabel: topicInfo.label,
    daySeed: quiz.daySeed,
    weekSeed: quiz.daySeed,
    quizId: quiz.quizId,
    questions: quiz.questions,
    questionIds: quiz.questionIds,
    questionsRefreshNote: 'Fresh random questions every day. Your two daily quizzes never repeat the same questions.',
  })
}
