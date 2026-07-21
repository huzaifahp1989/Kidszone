import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getPassStatus, getSeerahChapter, scoreSeerahAnswers } from '@/lib/seerah-course';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = String(body?.userId || '').trim();
    const userName = String(body?.userName || '').trim();
    const email = String(body?.email || '').trim();
    const chapterNumber = Number(body?.chapterNumber || 0);
    const answers = Array.isArray(body?.answers) ? body.answers.map((a: any) => String(a || '').trim()) : [];

    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    if (chapterNumber < 1 || chapterNumber > 5) return NextResponse.json({ error: 'Invalid chapter number' }, { status: 400 });

    const chapter = getSeerahChapter(chapterNumber);
    if (!chapter) return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });

    if (answers.length !== chapter.quizQuestions.length) {
      return NextResponse.json({ error: `Exactly ${chapter.quizQuestions.length} answers are required.` }, { status: 400 });
    }

    if (answers.some((a: string) => !a)) {
      return NextResponse.json({ error: 'Please answer every question before submitting.' }, { status: 400 });
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('seerah_quiz_submissions')
      .select('id')
      .eq('user_id', userId)
      .eq('chapter_number', chapterNumber)
      .maybeSingle();

    if (existingError && existingError.code !== '42P01') {
      throw existingError;
    }

    if (existing) {
      return NextResponse.json({
        error: 'You have already submitted this chapter. Only one attempt is allowed.',
      }, { status: 409 });
    }

    const auto = scoreSeerahAnswers(chapterNumber, answers);
    const finalScore = auto.total;
    const status = getPassStatus(finalScore);

    const { data, error } = await supabaseAdmin
      .from('seerah_quiz_submissions')
      .insert({
        user_id: userId,
        user_name: userName || null,
        email: email || null,
        chapter_number: chapterNumber,
        answers,
        auto_marks: auto.marks,
        auto_score: auto.total,
        final_score: finalScore,
        status,
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ error: 'Seerah tables are missing. Run migration first.' }, { status: 503 });
      }
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Only one submission is allowed for this chapter.' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      submission: data,
      score: finalScore,
      status,
      message: status === 'passed' ? 'Passed' : 'Needs Improvement',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
