import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getStaticQuiz } from '@/lib/quiz-generator';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, quizId, answers, durationSeconds } = body;

    if (!userId || !quizId || !answers) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Handle Fallback Quiz (Offline/Static Mode)
    if (quizId.startsWith('fallback-')) {
       const date = quizId.replace('fallback-', '');
       const staticQuiz = getStaticQuiz(date);
       const questions = staticQuiz.questions; // These are from src/data/quizzes.ts
       
       let correctCount = 0;
       const questionMap = new Map(questions.map(q => [q.id, q]));

       for (const [qId, ansIdx] of Object.entries(answers)) {
          const q = questionMap.get(qId);
          // @ts-ignore
          if (q && q.correctAnswer === ansIdx) {
             correctCount++;
          }
       }

       const score = correctCount * 10;
       const maxScore = questions.length * 10;
       const isPerfect = score === maxScore;

       // We cannot save to DB reliably without service role key or foreign key in daily_quizzes
       // So we just return success.
       return NextResponse.json({
         success: true,
         score,
         maxScore,
         points: score,
         message: 'Practice mode completed',
         isFallback: true
       });
    }

    // 1. Fetch Quiz and Questions (Standard Mode)
    const { data: quiz, error: quizError } = await supabaseAdmin
      .from('daily_quizzes')
      .select('question_ids')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
    }

    const questionIds = quiz.question_ids as string[];
    const { data: questions, error: qError } = await supabaseAdmin
      .from('questions')
      .select('id, correct_answer_index')
      .in('id', questionIds);

    if (qError || !questions) {
      return NextResponse.json({ error: 'Questions not found' }, { status: 500 });
    }

    // 2. Calculate Score
    let correctCount = 0;
    const questionMap = new Map(questions.map(q => [q.id, q.correct_answer_index]));

    for (const [qId, ansIdx] of Object.entries(answers)) {
      if (questionMap.get(qId) === ansIdx) {
        correctCount++;
      }
    }

    const score = correctCount * 10;
    const maxScore = questionIds.length * 10;
    const isPerfect = score === maxScore;

    // 3. Anti-Cheat & Validation
    let isFlagged = false;
    if (durationSeconds < 20) {
      isFlagged = true;
      // Log flag
      console.warn(`User ${userId} flagged: Duration ${durationSeconds}s`);
    }

    // 4. Check for existing attempt
    const { data: existingAttempt } = await supabaseAdmin
      .from('quiz_attempts')
      .select('id')
      .eq('user_id', userId)
      .eq('quiz_id', quizId)
      .single();

    if (existingAttempt) {
      return NextResponse.json({ error: 'You have already attempted this quiz.' }, { status: 400 });
    }

    // 5. Record Attempt
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('quiz_attempts')
      .insert({
        user_id: userId,
        quiz_id: quizId,
        score: score,
        max_score: maxScore,
        duration_seconds: durationSeconds,
        is_perfect_score: isPerfect,
        is_flagged: isFlagged
      })
      .select()
      .single();

    if (attemptError) {
      throw attemptError;
    }

    // 6. Calculate Points & Bonuses
    let totalPoints = score;
    const bonuses = [];

    // Completion Bonus
    if (Object.keys(answers).length === questionIds.length) {
      totalPoints += 20;
      bonuses.push({ amount: 20, reason: 'completion_bonus' });
    }

    // 7. Award Points (Server-side logic)
    const todayStr = new Date().toISOString().slice(0, 10);
    const dailyLimit = 100;
    let finalPointsAwarded = 0;

    // Fetch existing points
    const { data: userPointsRow, error: pointsFetchError } = await supabaseAdmin
      .from('users_points')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!pointsFetchError && userPointsRow) {
      const isNewDay = userPointsRow.last_earned_date !== todayStr;
      const currentTodayPoints = isNewDay ? 0 : (userPointsRow.today_points || 0);
      
      // Calculate how many points we can award
      let pointsToAward = totalPoints;
      if (currentTodayPoints + pointsToAward > dailyLimit) {
        pointsToAward = Math.max(0, dailyLimit - currentTodayPoints);
      }

      if (pointsToAward > 0) {
        const newTotal = (userPointsRow.total_points || 0) + pointsToAward;
        const newWeekly = (userPointsRow.weekly_points || 0) + pointsToAward;
        const newMonthly = (userPointsRow.monthly_points || 0) + pointsToAward;
        const newToday = currentTodayPoints + pointsToAward;

        // Update users_points
        const { error: updateError } = await supabaseAdmin
          .from('users_points')
          .update({
            total_points: newTotal,
            weekly_points: newWeekly,
            monthly_points: newMonthly,
            today_points: newToday,
            last_earned_date: todayStr
          })
          .eq('user_id', userId);

        if (!updateError) {
          finalPointsAwarded = pointsToAward;
          
        // Sync users table snapshot (optional, keep column names consistent)
        await supabaseAdmin.from('users').update({
          points: newTotal,
          weeklypoints: newWeekly,
          monthlypoints: newMonthly
        }).eq('uid', userId);
        } else {
          console.error('Failed to update points:', updateError);
        }
      }
    } else if (!userPointsRow) {
      // First time user points entry
      const pointsToAward = Math.min(totalPoints, dailyLimit);
      const { error: insertError } = await supabaseAdmin
        .from('users_points')
        .insert({
          user_id: userId,
          total_points: pointsToAward,
          weekly_points: pointsToAward,
          monthly_points: pointsToAward,
          today_points: pointsToAward,
          last_earned_date: todayStr
        });

      if (!insertError) {
        finalPointsAwarded = pointsToAward;
        // Sync users table snapshot
        await supabaseAdmin.from('users').update({
          points: pointsToAward,
          weeklypoints: pointsToAward,
          monthlypoints: pointsToAward
        }).eq('uid', userId);
      } else {
        console.error('Failed to insert points:', insertError);
      }
    }

    return NextResponse.json({
      success: true,
      score,
      maxScore,
      points: finalPointsAwarded, // Return actual points awarded
      totalPossiblePoints: totalPoints, // The raw score before cap
      attemptId: attempt.id
    });

  } catch (err: any) {
    console.error('Submit error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
