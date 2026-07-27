/**
 * End-to-end smoke test: build a 5-question topic quiz, submit via the same
 * session-record + attempt + points path the API uses, and prove it finishes.
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

function loadEnv() {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    const key = line.slice(0, i);
    const val = line.slice(i + 1).replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!;

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const email = `quiz-smoke-${Date.now()}@example.com`;
  const password = `SmokeTest!${randomUUID().slice(0, 8)}`;

  console.log('1) Creating temp auth user…');
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: 'Quiz Smoke', age: 10 },
  });
  if (created.error || !created.data.user) {
    throw new Error(created.error?.message || 'Could not create temp user');
  }
  const userId = created.data.user.id;
  console.log('   userId=', userId);

  try {
    const { createSessionQuizRecordId } = await import('../src/lib/topic-quiz-record.ts');
    const { resolveSubmittedTopicQuestions } = await import('../src/lib/quiz-topic-questions.ts');
    const { awardPointsWithDailyCapByUserId } = await import('../src/lib/server-points.ts');
    const { QUIZ_POINTS_PER_COMPLETION } = await import('../src/lib/points-policy.ts');
    const { ensureUserRecords } = await import('../src/lib/ensure-user-records.ts');

    console.log('2) Ensuring public.users + users_points…');
    const ensured = await ensureUserRecords(userId);
    if (!ensured.ok) throw new Error(ensured.error || 'ensureUserRecords failed');

    console.log('3) Building 5-question topic quiz (quran)…');
    const { getTopicQuizQuestions } = await import('../src/lib/quiz-topics.ts');
    const { getQuizQuestionPool } = await import('../src/lib/quiz-question-pool.ts');
    const pool = getQuizQuestionPool();
    const topicQuestions = getTopicQuizQuestions(pool, 'quran', `${userId}:smoke`, 5, {
      userId,
    });
    if (topicQuestions.length !== 5) {
      throw new Error(`Expected 5 questions, got ${topicQuestions.length}`);
    }
    const questionIds = topicQuestions.map((q) => String(q.id));
    const active = resolveSubmittedTopicQuestions('quran', questionIds);
    if (active.length !== 5) {
      throw new Error(`resolveSubmittedTopicQuestions returned ${active.length}`);
    }
    console.log(
      '   questions:',
      active.map((q) => q.id).join(', ')
    );

    const answers: Record<string, number> = {};
    for (const q of active) {
      answers[String(q.id)] = Number(q.correctAnswer);
    }

    console.log('4) createSessionQuizRecordId (this used to hang)…');
    const t0 = Date.now();
    const sessionQuizId = await Promise.race([
      createSessionQuizRecordId('quran', questionIds, `${userId}:quran:smoke:${randomUUID()}`),
      new Promise<string>((_, rej) => setTimeout(() => rej(new Error('TIMEOUT 10s on session record')), 10000)),
    ]);
    console.log('   quiz_id=', sessionQuizId, 'ms=', Date.now() - t0);

    console.log('5) Insert quiz_attempts…');
    const t1 = Date.now();
    const { data: attempt, error: attemptErr } = await admin
      .from('quiz_attempts')
      .insert({
        user_id: userId,
        quiz_id: sessionQuizId,
        topic: 'quran',
        question_ids: questionIds,
        score: 5,
        max_score: 5,
        duration_seconds: 42,
        is_perfect_score: true,
        is_flagged: false,
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (attemptErr) throw new Error(attemptErr.message);
    console.log('   attempt_id=', attempt.id, 'ms=', Date.now() - t1);

    console.log('6) Award quiz points via server-points…');
    const t2 = Date.now();
    const award = await awardPointsWithDailyCapByUserId(userId, QUIZ_POINTS_PER_COMPLETION, {
      successMessage: `Topic completed! +${QUIZ_POINTS_PER_COMPLETION} points`,
    });
    console.log('   award=', {
      success: award.success,
      reason: award.reason,
      pointsAwarded: award.pointsAwarded,
      todayPoints: award.todayPoints,
      totalPoints: award.totalPoints,
      ms: Date.now() - t2,
    });

    if (!award.success || award.pointsAwarded <= 0) {
      throw new Error(`Points not awarded: ${award.message} (${award.reason})`);
    }

    console.log('7) HTTP submit path against local API (optional)…');
    const anon = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const signedIn = await anon.auth.signInWithPassword({ email, password });
    const token = signedIn.data.session?.access_token;
    if (!token) {
      console.log('   skip HTTP (no session token):', signedIn.error?.message);
    } else {
      // Use a different topic so we don't hit duplicate day constraints hard
      const topic2Qs = getTopicQuizQuestions(pool, 'salah', `${userId}:smoke2`, 5, { userId });
      const ids2 = topic2Qs.map((q) => String(q.id));
      const answers2: Record<string, number> = {};
      for (const q of topic2Qs) answers2[String(q.id)] = Number(q.correctAnswer);

      const t3 = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);
      try {
        const res = await fetch('http://localhost:3000/api/quiz/daily/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId,
            quizId: `topic-salah-smoke-${Date.now()}`,
            answers: answers2,
            durationSeconds: 40,
            topic: 'salah',
            questionIds: ids2,
          }),
          signal: controller.signal,
        });
        const body = await res.json().catch(() => ({}));
        console.log('   HTTP status=', res.status, 'ms=', Date.now() - t3);
        console.log('   HTTP body=', {
          success: body.success,
          points: body.points,
          error: body.error,
          reason: body.reason,
          message: body.message,
        });
        if (res.status === 200 && body.success !== true && !body.duplicateAttempt) {
          throw new Error(`HTTP submit failed: ${body.error || JSON.stringify(body)}`);
        }
        if (!res.ok && res.status !== 409 && res.status !== 429) {
          throw new Error(`HTTP submit failed (${res.status}): ${body.error || JSON.stringify(body)}`);
        }
      } finally {
        clearTimeout(timer);
      }
    }

    console.log('\nPASS: 5-question quiz session + points path works.');
  } finally {
    console.log('8) Cleaning up temp user…');
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    await admin.from('quiz_attempts').delete().eq('user_id', userId);
    await admin.from('users_points').delete().eq('user_id', userId);
    await admin.from('users').delete().eq('uid', userId);
  }
}

main().catch((e) => {
  console.error('\nFAIL:', e?.message || e);
  process.exit(1);
});
