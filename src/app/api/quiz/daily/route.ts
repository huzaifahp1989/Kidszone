import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateDailyQuiz, getStaticQuiz } from '@/lib/quiz-generator';

const UUID_V4_OR_V5_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET() {
  const today = new Date().toISOString().split('T')[0];

  try {
    // 1. Get Daily Quiz ID
    let { data: quiz } = await supabaseAdmin
      .from('daily_quizzes')
      .select('id, question_ids')
      .eq('quiz_date', today)
      .single();

    if (!quiz) {
      // Lazy Create if it doesn't exist
      try {
        const result = await generateDailyQuiz(today);
        quiz = result.quiz;
      } catch (err) {
        console.error('Failed to lazy generate quiz:', err);
        // Fallback to static quiz
        const staticQuiz = getStaticQuiz(today);
        return NextResponse.json(staticQuiz);
      }
    }

    if (!quiz) {
       // Should be covered by fallback, but just in case
       const staticQuiz = getStaticQuiz(today);
       return NextResponse.json(staticQuiz);
    }

    const questionIds = Array.isArray(quiz.question_ids) ? (quiz.question_ids as string[]) : [];

    // Some older rows stored static IDs (e.g. "salah-1") while DB questions.id is UUID.
    // Avoid invalid UUID SQL errors by falling back to static quiz generation.
    const hasNonUuidQuestionId = questionIds.some((id) => !UUID_V4_OR_V5_REGEX.test(String(id)));
    if (hasNonUuidQuestionId) {
      const staticQuiz = getStaticQuiz(today);
      return NextResponse.json(staticQuiz);
    }

    // 2. Fetch Questions (Sanitized)
    const { data: questions, error } = await supabaseAdmin
      .from('questions')
      .select('id, category, question_text, options, difficulty')
      .in('id', questionIds);

    if (error || !questions || questions.length === 0) {
      console.error('Error fetching questions or empty:', error);
       // Fallback to static quiz if DB fetch fails
       const staticQuiz = getStaticQuiz(today);
       return NextResponse.json(staticQuiz);
    }

    // Sort questions to match the order in question_ids (optional but good)
    const questionMap = new Map(questions?.map(q => [q.id, q]) || []);
    const orderedQuestions = questionIds.map(id => questionMap.get(id)).filter(Boolean);

    return NextResponse.json({
      quizId: quiz.id,
      date: today,
      questions: orderedQuestions
    });

  } catch (err: any) {
    console.error('API Error:', err);
    // Ultimate fallback
    const staticQuiz = getStaticQuiz(today);
    return NextResponse.json(staticQuiz);
  }
}
