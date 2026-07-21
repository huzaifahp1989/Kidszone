import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const nameQuery = (process.argv[2] || 'Hammad Mohammed Iqbal').trim();
  const { supabaseAdmin } = await import('../src/lib/supabase-admin');
  const { summarizeTodayActivity, getUtcDayBounds } = await import('../src/lib/points-repair');

  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('uid, name, email, age, points, weeklypoints, monthlypoints')
    .ilike('name', `%${nameQuery}%`)
    .limit(20);

  if (error) {
    console.error('users lookup failed:', error.message);
    process.exit(1);
  }

  if (!users?.length) {
    console.log(JSON.stringify({ found: [], message: `No users matching "${nameQuery}"` }, null, 2));
    process.exit(0);
  }

  const { dayKey } = getUtcDayBounds();
  const results = [];

  for (const u of users) {
    const uid = String(u.uid);
    const { data: points } = await supabaseAdmin
      .from('users_points')
      .select('total_points, weekly_points, monthly_points, today_points, last_earned_date, badges, level')
      .eq('user_id', uid)
      .maybeSingle();

    const todaySummary = await summarizeTodayActivity(uid);
    results.push({
      uid,
      name: u.name,
      email: u.email,
      age: u.age,
      usersTable: {
        points: u.points,
        weeklypoints: u.weeklypoints,
        monthlypoints: u.monthlypoints,
      },
      usersPoints: points,
      todayUtc: dayKey,
      todayActivity: todaySummary,
      gap:
        todaySummary.cappedTodayPoints -
        (points?.last_earned_date === dayKey ? Number(points?.today_points ?? 0) : 0),
    });
  }

  console.log(JSON.stringify({ found: results.length, results }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
