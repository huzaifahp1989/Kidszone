import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const uid = '34220508-20f0-4bc0-b8e9-a3ae917f58c1';
  const { getWeeklyScoresForUsers } = await import('../src/lib/weekly-score');
  const { getScoreWeekRangeUtc } = await import('../src/lib/weekly-score-core');
  const { supabaseAdmin } = await import('../src/lib/supabase-admin');

  const week = getScoreWeekRangeUtc();
  const scores = await getWeeklyScoresForUsers([uid]);
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('uid, name, email, points, weeklypoints, monthlypoints')
    .eq('uid', uid)
    .maybeSingle();
  const { data: up } = await supabaseAdmin
    .from('users_points')
    .select('*')
    .eq('user_id', uid)
    .maybeSingle();

  console.log(
    JSON.stringify(
      {
        week,
        weeklyScore: scores.get(uid) ?? 0,
        user,
        usersPoints: up,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
