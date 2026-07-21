import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

/**
 * Admin credit: add 2 full days of points (2 × daily cap) for Hammad Mohammed Iqbal.
 *
 * Usage: npx tsx scripts/backfill-hammad-two-days.mts
 */
async function main() {
  const { supabaseAdmin } = await import('../src/lib/supabase-admin');
  const { awardPointsWithDailyCapByUserId } = await import('../src/lib/server-points');
  const { POINTS_DAILY_CAP } = await import('../src/lib/points-policy');

  const nameQuery = 'Hammad Mohammed Iqbal';
  const days = 2;
  const pointsToAdd = POINTS_DAILY_CAP * days; // 200 × 2 = 400

  const { data: users, error } = await supabaseAdmin
    .from('users')
    .select('uid, name, email, points, weeklypoints, monthlypoints')
    .ilike('name', `%${nameQuery}%`)
    .limit(5);

  if (error) throw error;
  if (!users?.length) {
    console.error(`No user found for "${nameQuery}"`);
    process.exit(1);
  }

  const user = users[0];
  const uid = String(user.uid);

  const { data: before } = await supabaseAdmin
    .from('users_points')
    .select('total_points, weekly_points, monthly_points, today_points, last_earned_date, badges, level')
    .eq('user_id', uid)
    .maybeSingle();

  console.log(
    JSON.stringify(
      {
        user: { uid, name: user.name, email: user.email },
        before,
        credit: { days, pointsToAdd, dailyCap: POINTS_DAILY_CAP },
      },
      null,
      2
    )
  );

  const result = await awardPointsWithDailyCapByUserId(uid, pointsToAdd, {
    countTowardDailyLimit: false,
    successMessage: `Admin credit: +${pointsToAdd} points for ${days} days (${POINTS_DAILY_CAP}/day).`,
  });

  if (!result.success || result.pointsAwarded <= 0) {
    console.error('Award failed:', result);
    process.exit(1);
  }

  // Keep last_earned_date / today_points as-is for "today" display;
  // this credit is historical and should not inflate today's bar.
  const { data: after } = await supabaseAdmin
    .from('users_points')
    .select('total_points, weekly_points, monthly_points, today_points, last_earned_date, badges, level')
    .eq('user_id', uid)
    .maybeSingle();

  console.log(JSON.stringify({ award: result, after }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
