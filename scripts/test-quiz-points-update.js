require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { randomUUID } = require('crypto');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceRole, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function pickUserId() {
  const preferred = [
    '45adf717-4bd2-429b-bd4f-23c7c6b97263',
    '3e886a7d-a291-4930-a130-ed379210f36a',
    'fe6fe460-5994-422a-8921-eda6c2146355',
  ];

  const preferredRes = await supabase
    .from('users')
    .select('uid, email, name')
    .in('uid', preferred)
    .limit(1);

  if (!preferredRes.error && preferredRes.data && preferredRes.data.length > 0) {
    return preferredRes.data[0];
  }

  const fallbackRes = await supabase
    .from('users')
    .select('uid, email, name')
    .eq('role', 'kid')
    .limit(1);

  if (fallbackRes.error || !fallbackRes.data || fallbackRes.data.length === 0) {
    throw new Error(fallbackRes.error?.message || 'No user found for testing');
  }

  return fallbackRes.data[0];
}

async function getPointsSnapshot(userId) {
  const [pointsRowRes, userRowRes] = await Promise.all([
    supabase
      .from('users_points')
      .select('total_points, weekly_points, monthly_points, today_points, last_earned_date')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('users')
      .select('points, weeklypoints, monthlypoints')
      .eq('uid', userId)
      .maybeSingle(),
  ]);

  if (pointsRowRes.error) throw new Error('users_points read failed: ' + pointsRowRes.error.message);
  if (userRowRes.error) throw new Error('users mirror read failed: ' + userRowRes.error.message);

  return {
    users_points: pointsRowRes.data,
    users_mirror: userRowRes.data,
  };
}

function getSyntheticQuizDate(seed) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const dayOffset = (hash >>> 0) % (365 * 218);
  const d = new Date(Date.UTC(2100, 0, 1));
  d.setUTCDate(d.getUTCDate() + dayOffset);
  return d.toISOString().slice(0, 10);
}

async function createSessionDailyQuizId(topicId, questionIds) {
  let lastMessage = 'Could not create quiz session row';

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const sessionKey = randomUUID();
    const quizDate = getSyntheticQuizDate(`${sessionKey}:${attempt}`);
    const taggedQuestionIds = [
      `topic:${topicId}`,
      `session:${sessionKey}`,
      ...questionIds.map(String),
    ];

    const { data, error } = await supabase
      .from('daily_quizzes')
      .insert({
        quiz_date: quizDate,
        question_ids: taggedQuestionIds,
        is_published: false,
      })
      .select('id')
      .single();

    if (!error && data?.id) return data.id;
    if (error?.code === '23505') {
      lastMessage = error.message;
      continue;
    }
    throw new Error('daily_quizzes insert failed: ' + (error?.message || lastMessage));
  }

  throw new Error(lastMessage);
}

async function insertQuizAttempt(userId, quizId) {
  const payload = {
    user_id: userId,
    quiz_id: quizId,
    topic: 'automation_test_topic',
    score: 80,
    max_score: 100,
    duration_seconds: 45,
    is_perfect_score: false,
    is_flagged: false,
    completed_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('quiz_attempts').insert(payload);
  if (error) {
    throw new Error('quiz_attempts insert failed: ' + error.message);
  }
}

async function awardQuizPoints(userId) {
  const requestedPoints = 25;
  const { data, error } = await supabase.rpc('award_points_capped', {
    p_user_id: userId,
    p_points: requestedPoints,
    p_daily_cap: 200,
    p_count_toward_daily: true,
  });

  if (error) throw new Error('award_points_capped failed: ' + error.message);

  const row = Array.isArray(data) ? data[0] : data;
  return row || null;
}

(async function run() {
  try {
    console.log('--- Quiz points update test (Supabase simulation) ---');

    const user = await pickUserId();
    console.log('Using user:', {
      uid: user.uid,
      email: user.email,
      name: user.name,
    });

    const before = await getPointsSnapshot(user.uid);
    console.log('Before:', JSON.stringify(before, null, 2));

    const quizId = await createSessionDailyQuizId('automation_test_topic', ['q1', 'q2', 'q3']);
    console.log('Using quiz_id:', quizId);

    await insertQuizAttempt(user.uid, quizId);
    console.log('Quiz attempt inserted.');

    const award = await awardQuizPoints(user.uid);
    console.log('RPC award result:', JSON.stringify(award, null, 2));

    const after = await getPointsSnapshot(user.uid);
    console.log('After:', JSON.stringify(after, null, 2));

    const beforeTotal = Number(before.users_points?.total_points || 0);
    const afterTotal = Number(after.users_points?.total_points || 0);
    const delta = afterTotal - beforeTotal;

    const mirrorMatches =
      Number(after.users_points?.total_points || 0) === Number(after.users_mirror?.points || 0) &&
      Number(after.users_points?.weekly_points || 0) === Number(after.users_mirror?.weeklypoints || 0) &&
      Number(after.users_points?.monthly_points || 0) === Number(after.users_mirror?.monthlypoints || 0);

    console.log('Summary:', JSON.stringify({
      awarded_delta_total_points: delta,
      mirror_synced: mirrorMatches,
    }, null, 2));
  } catch (err) {
    console.error('Test failed:', err.message || err);
    process.exit(1);
  }
})();
