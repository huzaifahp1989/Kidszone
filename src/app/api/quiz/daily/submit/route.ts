import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getStaticQuiz } from '@/lib/quiz-generator';
import { quizzes } from '@/data/quizzes';
import { filterQuestionsByTopic, getTopicQuizQuestions } from '@/lib/quiz-topics';
import { isTestModeUserId } from '@/lib/test-mode-server';

const MAX_DAILY_QUIZ_ATTEMPTS = 2;

function getUtcDayWindow() {
  const now = new Date();
  const dayStart = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0,
    0,
    0,
    0
  ));
  const nextDayStart = new Date(dayStart);
  nextDayStart.setUTCDate(nextDayStart.getUTCDate() + 1);

  return {
    dayStartIso: dayStart.toISOString(),
    nextDayStartIso: nextDayStart.toISOString(),
    nextDayStartMs: nextDayStart.getTime(),
  };
}

async function enforceDailyQuizAttemptLimit(userId: string) {
  const { dayStartIso, nextDayStartIso, nextDayStartMs } = getUtcDayWindow();
  const { data, count, error } = await supabaseAdmin
    .from('quiz_attempts')
    .select('score, completed_at', { count: 'exact' })
    .eq('user_id', userId)
    .gte('completed_at', dayStartIso)
    .lt('completed_at', nextDayStartIso)
    .order('completed_at', { ascending: false })
    .limit(1);

  if (error) {
    throw error;
  }

  const attemptsToday = Number(count || 0);
  if (attemptsToday >= MAX_DAILY_QUIZ_ATTEMPTS) {
    const timeRemaining = Math.max(0, Math.ceil((nextDayStartMs - Date.now()) / 1000));
    const lastScore = Array.isArray(data) && data[0] ? Number((data[0] as any).score ?? 0) : null;
    return NextResponse.json(
      {
        error: `You have already completed ${MAX_DAILY_QUIZ_ATTEMPTS} quizzes today. Come back tomorrow for more points.`,
        locked: true,
        lockedUntil: nextDayStartMs,
        lastScore,
        attemptsToday,
        maxDailyAttempts: MAX_DAILY_QUIZ_ATTEMPTS,
        timeRemaining,
      },
      { status: 429 }
    );
  }

  return null;
}

async function getTodaysQuizAttemptSummary(userId: string) {
  const { dayStartIso, nextDayStartIso, nextDayStartMs } = getUtcDayWindow();
  const { count, error } = await supabaseAdmin
    .from('quiz_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('completed_at', dayStartIso)
    .lt('completed_at', nextDayStartIso);

  if (error) {
    throw error;
  }

  const attemptsToday = Number(count || 0);
  return {
    attemptsToday,
    maxDailyAttempts: MAX_DAILY_QUIZ_ATTEMPTS,
    remainingDailyAttempts: Math.max(0, MAX_DAILY_QUIZ_ATTEMPTS - attemptsToday),
    lockedUntil: nextDayStartMs,
  };
}

async function ensureFallbackDailyQuizId(date: string, questionIds: string[]): Promise<string> {
  const { data: existing, error: existingErr } = await supabaseAdmin
    .from('daily_quizzes')
    .select('id')
    .eq('quiz_date', date)
    .maybeSingle();

  if (!existingErr && existing?.id) return existing.id;

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('daily_quizzes')
    .insert({
      quiz_date: date,
      question_ids: questionIds,
      is_published: false,
    })
    .select('id')
    .single();

  if (!insertErr && inserted?.id) return inserted.id;

  const { data: reread, error: rereadErr } = await supabaseAdmin
    .from('daily_quizzes')
    .select('id')
    .eq('quiz_date', date)
    .single();

  if (rereadErr || !reread?.id) {
    throw new Error(insertErr?.message || rereadErr?.message || 'Could not resolve fallback quiz ID');
  }

  return reread.id;
}

async function awardPointsWithDailyCap(userId: string, totalPoints: number) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const dailyLimit = 100;

  let finalPointsAwarded = 0;
  let reason: string | null = null;
  let currentTodayPoints = 0;

  const { data: userPointsRow, error: pointsFetchError } = await supabaseAdmin
    .from('users_points')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!pointsFetchError && userPointsRow) {
    const isNewDay = userPointsRow.last_earned_date !== todayStr;
    currentTodayPoints = isNewDay ? 0 : (userPointsRow.today_points || 0);

    let pointsToAward = totalPoints;
    if (currentTodayPoints + pointsToAward > dailyLimit) {
      pointsToAward = Math.max(0, dailyLimit - currentTodayPoints);
    }

    if (pointsToAward > 0) {
      const newTotal = (userPointsRow.total_points || 0) + pointsToAward;
      const newWeekly = (userPointsRow.weekly_points || 0) + pointsToAward;
      const newMonthly = (userPointsRow.monthly_points || 0) + pointsToAward;
      const newToday = currentTodayPoints + pointsToAward;

      const { error: updateError } = await supabaseAdmin
        .from('users_points')
        .update({
          total_points: newTotal,
          weekly_points: newWeekly,
          monthly_points: newMonthly,
          today_points: newToday,
          last_earned_date: todayStr,
        })
        .eq('user_id', userId);

      if (!updateError) {
        finalPointsAwarded = pointsToAward;
        await supabaseAdmin
          .from('users')
          .update({ points: newTotal, weeklypoints: newWeekly, monthlypoints: newMonthly })
          .eq('uid', userId);
      } else {
        console.error('Failed to update points:', updateError);
        reason = 'update_failed';
      }
    } else {
      reason = 'daily_limit_reached';
    }
  } else if (!userPointsRow) {
    const pointsToAward = Math.min(totalPoints, dailyLimit);
    const { error: insertError } = await supabaseAdmin
      .from('users_points')
      .insert({
        user_id: userId,
        total_points: pointsToAward,
        weekly_points: pointsToAward,
        monthly_points: pointsToAward,
        today_points: pointsToAward,
        last_earned_date: todayStr,
      });

    if (!insertError) {
      finalPointsAwarded = pointsToAward;
      await supabaseAdmin
        .from('users')
        .update({ points: pointsToAward, weeklypoints: pointsToAward, monthlypoints: pointsToAward })
        .eq('uid', userId);
    } else {
      console.error('Failed to insert points:', insertError);
      reason = 'insert_failed';
    }
  }

  return {
    pointsAwarded: finalPointsAwarded,
    reason,
    todayPoints: currentTodayPoints,
    dailyLimit,
  };
}

function successNoPoints(score: number, maxScore: number, totalPossiblePoints: number, flags?: Record<string, unknown>) {
  return {
    success: true,
    score,
    maxScore,
    points: 0,
    totalPossiblePoints,
    message: 'Test mode active. Retry accepted without leaderboard points.',
    reason: 'test_mode_retry',
    todayPoints: 0,
    dailyLimit: 100,
    ...flags,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, quizId, answers, durationSeconds, topic, questionIds: submittedQuestionIds } = body;

    if (!userId || !quizId || !answers) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const isTestMode = await isTestModeUserId(userId);

    const { data: userRow } = await supabaseAdmin.from('users').select('uid').eq('uid', userId).maybeSingle();
    if (!userRow) {
      const { error: createUserErr } = await supabaseAdmin
        .from('users')
        .upsert(
          {
            uid: userId,
            role: 'kid',
            name: `Learner-${userId.slice(0, 8)}`,
            age: 10,
            email: `user-${userId.slice(0, 8)}@local`,
            points: 0,
            weeklypoints: 0,
            monthlypoints: 0,
            level: 'Beginner',
          },
          { onConflict: 'uid' }
        );

      if (createUserErr) {
        console.error('Failed to ensure users row for quiz submit:', createUserErr);
        return NextResponse.json({ error: 'Could not prepare user profile for quiz submission.' }, { status: 500 });
      }
    }

    if (quizId.startsWith('topic-')) {
      const parsed = String(quizId).split('-');
      const topicFromId = parsed.length >= 3 ? parsed[1] : topic;
      const weekSeedFromId = parsed.length >= 4 ? parsed.slice(2).join('-') : new Date().toISOString().split('T')[0];
      const todayDate = new Date().toISOString().split('T')[0];

      const topicQuestions = getTopicQuizQuestions((quizzes as any[]).filter((q) => q && q.id), topicFromId, weekSeedFromId, 5);
      if (!topicQuestions.length) {
        return NextResponse.json({ error: 'No questions available for this topic.' }, { status: 400 });
      }

      const allowedQuestionIds = new Set(
        Array.isArray(submittedQuestionIds) && submittedQuestionIds.length > 0
          ? submittedQuestionIds.map((id: string) => String(id))
          : topicQuestions.map((q: any) => String(q.id))
      );

      const activeQuestions = topicQuestions.filter((q: any) => allowedQuestionIds.has(String(q.id)));
      if (!activeQuestions.length) {
        return NextResponse.json({ error: 'No questions available for this topic.' }, { status: 400 });
      }

      if (!isTestMode) {
        const limitResponse = await enforceDailyQuizAttemptLimit(userId);
        if (limitResponse) {
          return limitResponse;
        }
      }

      const fallbackDailyQuizId = await ensureFallbackDailyQuizId(
        todayDate,
        activeQuestions.map((q: any) => String(q.id))
      );

      let correctCount = 0;
      const questionMap = new Map(activeQuestions.map((q: any) => [String(q.id), q]));
      for (const [qId, ansIdx] of Object.entries(answers)) {
        if (!allowedQuestionIds.has(String(qId))) continue;
        const q = questionMap.get(String(qId));
        if (q && Number(q.correctAnswer) === Number(ansIdx)) correctCount++;
      }

      const score = correctCount * 10;
      const maxScore = activeQuestions.length * 10;
      const isCompletedTopic = activeQuestions.every((q: any) => Object.prototype.hasOwnProperty.call(answers, String(q.id)));
      const totalPoints = isCompletedTopic ? 50 : 0;

      const { error: attemptError } = await supabaseAdmin.from('quiz_attempts').insert({
        user_id: userId,
        quiz_id: fallbackDailyQuizId,
        score,
        max_score: maxScore,
        duration_seconds: durationSeconds,
        is_perfect_score: score === maxScore,
        is_flagged: durationSeconds < 20,
        completed_at: new Date().toISOString(),
      });

      if (attemptError) {
        if (isTestMode && attemptError.code === '23505') {
          return NextResponse.json(successNoPoints(score, maxScore, totalPoints, { isTopicQuiz: true }));
        }
        throw attemptError;
      }

      const awardResult = isTestMode
        ? { pointsAwarded: 0, reason: 'test_mode', todayPoints: 0, dailyLimit: 100 }
        : await awardPointsWithDailyCap(userId, totalPoints);

      const finalPointsAwarded = awardResult.pointsAwarded;
      const attemptSummary = await getTodaysQuizAttemptSummary(userId);
      const awardMessage = isTestMode
        ? 'Test mode active. Quiz recorded, but no leaderboard points were added.'
        : finalPointsAwarded > 0
          ? 'Topic completed! 50 points added to leaderboard.'
          : awardResult.reason === 'daily_limit_reached'
            ? 'You have reached today\'s 100-point limit. Quiz completed, but no points were added.'
            : 'Quiz completed, but points could not be added right now.';

      return NextResponse.json({
        success: true,
        score,
        maxScore,
        points: finalPointsAwarded,
        totalPossiblePoints: totalPoints,
        message: awardMessage,
        reason: awardResult.reason,
        todayPoints: awardResult.todayPoints,
        dailyLimit: awardResult.dailyLimit,
        isTopicQuiz: true,
        attemptsToday: attemptSummary.attemptsToday,
        maxDailyAttempts: attemptSummary.maxDailyAttempts,
        remainingDailyAttempts: attemptSummary.remainingDailyAttempts,
        lockedUntil: attemptSummary.lockedUntil,
      });
    }

    if (quizId.startsWith('fallback-')) {
      if (!isTestMode) {
        const limitResponse = await enforceDailyQuizAttemptLimit(userId);
        if (limitResponse) {
          return limitResponse;
        }
      }

      const date = quizId.replace('fallback-', '');
      const staticQuiz = getStaticQuiz(date);
      const questions = staticQuiz.questions;
      const topicScopedQuestions = filterQuestionsByTopic(questions, topic);
      const activeQuestions = topicScopedQuestions.length > 0 ? topicScopedQuestions : questions;

      const allowedQuestionIds = new Set(
        Array.isArray(submittedQuestionIds) && submittedQuestionIds.length > 0
          ? submittedQuestionIds.map((id: string) => String(id))
          : activeQuestions.map((q: any) => String(q.id))
      );

      const scoredQuestions = activeQuestions.filter((q: any) => allowedQuestionIds.has(String(q.id)));
      if (!scoredQuestions.length) {
        return NextResponse.json({ error: 'No questions available for this topic.' }, { status: 400 });
      }

      const fallbackDailyQuizId = await ensureFallbackDailyQuizId(
        date,
        scoredQuestions.map((q: any) => String(q.id))
      );

      let correctCount = 0;
      const questionMap = new Map(scoredQuestions.map((q: any) => [String(q.id), q]));
      for (const [qId, ansIdx] of Object.entries(answers)) {
        if (!allowedQuestionIds.has(String(qId))) continue;
        const q = questionMap.get(String(qId));
        if (q && Number(q.correctAnswer) === Number(ansIdx)) correctCount++;
      }

      const score = correctCount * 10;
      const maxScore = scoredQuestions.length * 10;
      const isCompletedTopic = scoredQuestions.every((q: any) => Object.prototype.hasOwnProperty.call(answers, String(q.id)));
      const totalPoints = isCompletedTopic ? 50 : 0;

      const { error: attemptError } = await supabaseAdmin.from('quiz_attempts').insert({
        user_id: userId,
        quiz_id: fallbackDailyQuizId,
        score,
        max_score: maxScore,
        duration_seconds: durationSeconds,
        is_perfect_score: score === maxScore,
        is_flagged: false,
        completed_at: new Date().toISOString(),
      });

      if (attemptError) {
        if (isTestMode && attemptError.code === '23505') {
          return NextResponse.json(successNoPoints(score, maxScore, totalPoints, { isFallback: true }));
        }
        throw attemptError;
      }

      const awardResult = isTestMode
        ? { pointsAwarded: 0, reason: 'test_mode', todayPoints: 0, dailyLimit: 100 }
        : await awardPointsWithDailyCap(userId, totalPoints);

      const finalPointsAwarded = awardResult.pointsAwarded;
      const attemptSummary = await getTodaysQuizAttemptSummary(userId);
      const awardMessage = isTestMode
        ? 'Test mode active. Quiz recorded, but no leaderboard points were added.'
        : finalPointsAwarded > 0
          ? 'Topic completed! 50 points added to leaderboard.'
          : awardResult.reason === 'daily_limit_reached'
            ? 'You have reached today\'s 100-point limit. Quiz completed, but no points were added.'
            : 'Quiz completed, but points could not be added right now.';

      return NextResponse.json({
        success: true,
        score,
        maxScore,
        points: finalPointsAwarded,
        totalPossiblePoints: totalPoints,
        message: awardMessage,
        reason: awardResult.reason,
        todayPoints: awardResult.todayPoints,
        dailyLimit: awardResult.dailyLimit,
        isFallback: true,
        attemptsToday: attemptSummary.attemptsToday,
        maxDailyAttempts: attemptSummary.maxDailyAttempts,
        remainingDailyAttempts: attemptSummary.remainingDailyAttempts,
        lockedUntil: attemptSummary.lockedUntil,
      });
    }

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
      .select('id, category, correct_answer_index')
      .in('id', questionIds);

    if (qError || !questions) {
      return NextResponse.json({ error: 'Questions not found' }, { status: 500 });
    }

    const topicScopedQuestions = filterQuestionsByTopic(questions, topic);
    const candidateQuestions = topicScopedQuestions.length > 0 ? topicScopedQuestions : questions;
    const allowedQuestionIds = new Set(
      Array.isArray(submittedQuestionIds) && submittedQuestionIds.length > 0
        ? submittedQuestionIds.map((id: string) => String(id))
        : candidateQuestions.map((q) => String(q.id))
    );

    const activeQuestionIds = candidateQuestions
      .map((q) => String(q.id))
      .filter((id) => allowedQuestionIds.has(id));

    if (!activeQuestionIds.length) {
      return NextResponse.json({ error: 'No questions available for this topic.' }, { status: 400 });
    }

    let correctCount = 0;
    const questionMap = new Map(questions.map((q) => [String(q.id), q.correct_answer_index]));
    for (const [qId, ansIdx] of Object.entries(answers)) {
      if (!allowedQuestionIds.has(String(qId))) continue;
      if (questionMap.get(String(qId)) === Number(ansIdx)) correctCount++;
    }

    const score = correctCount * 10;
    const maxScore = activeQuestionIds.length * 10;
    const isPerfect = score === maxScore;
    const isFlagged = Number(durationSeconds) < 20;

    if (!isTestMode) {
      const limitResponse = await enforceDailyQuizAttemptLimit(userId);
      if (limitResponse) {
        return limitResponse;
      }
    }

    const { data: existingAttempt } = await supabaseAdmin
      .from('quiz_attempts')
      .select('id')
      .eq('user_id', userId)
      .eq('quiz_id', quizId)
      .maybeSingle();

    if (!isTestMode && existingAttempt) {
      return NextResponse.json({ error: 'You have already attempted this quiz.' }, { status: 400 });
    }

    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('quiz_attempts')
      .insert({
        user_id: userId,
        quiz_id: quizId,
        score,
        max_score: maxScore,
        duration_seconds: durationSeconds,
        is_perfect_score: isPerfect,
        is_flagged: isFlagged,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    const isCompletedTopic = activeQuestionIds.every((id) => Object.prototype.hasOwnProperty.call(answers, id));
    const totalPoints = isCompletedTopic ? 50 : 0;

    if (attemptError) {
      if (isTestMode && attemptError.code === '23505') {
        return NextResponse.json(successNoPoints(score, maxScore, totalPoints, { attemptId: null }));
      }
      throw attemptError;
    }

    const awardResult = isTestMode
      ? { pointsAwarded: 0, reason: 'test_mode', todayPoints: 0, dailyLimit: 100 }
      : await awardPointsWithDailyCap(userId, totalPoints);

    const finalPointsAwarded = awardResult.pointsAwarded;
    const attemptSummary = await getTodaysQuizAttemptSummary(userId);
    const awardMessage = isTestMode
      ? 'Test mode active. Quiz recorded, but no leaderboard points were added.'
      : finalPointsAwarded > 0
        ? 'Topic completed! 50 points added to leaderboard.'
        : awardResult.reason === 'daily_limit_reached'
          ? 'You have reached today\'s 100-point limit. Quiz completed, but no points were added.'
          : 'Quiz completed, but points could not be added right now.';

    return NextResponse.json({
      success: true,
      score,
      maxScore,
      points: finalPointsAwarded,
      totalPossiblePoints: totalPoints,
      message: awardMessage,
      reason: awardResult.reason,
      todayPoints: awardResult.todayPoints,
      dailyLimit: awardResult.dailyLimit,
      attemptId: attempt.id,
      attemptsToday: attemptSummary.attemptsToday,
      maxDailyAttempts: attemptSummary.maxDailyAttempts,
      remainingDailyAttempts: attemptSummary.remainingDailyAttempts,
      lockedUntil: attemptSummary.lockedUntil,
    });
  } catch (err: any) {
    console.error('Submit error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
