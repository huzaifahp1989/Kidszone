import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const uid = process.argv[2]?.trim() || '34220508-20f0-4bc0-b8e9-a3ae917f58c1';
  const { supabaseAdmin } = await import('../src/lib/supabase-admin');
  const { getUtcDayBounds } = await import('../src/lib/points-repair');
  const { dayStartIso, dayEndIso, dayKey } = getUtcDayBounds();

  console.log({ uid, dayKey, dayStartIso, dayEndIso });

  const tables = await Promise.all([
    supabaseAdmin
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', uid)
      .gte('completed_at', dayStartIso)
      .lt('completed_at', dayEndIso),
    supabaseAdmin
      .from('game_progress')
      .select('*')
      .eq('uid', uid)
      .gte('playedat', dayStartIso)
      .lt('playedat', dayEndIso),
    supabaseAdmin
      .from('pledges')
      .select('*')
      .eq('user_id', uid)
      .gte('created_at', dayStartIso)
      .lt('created_at', dayEndIso),
    supabaseAdmin
      .from('daily_checklist')
      .select('*')
      .eq('user_id', uid)
      .eq('date', dayKey),
    supabaseAdmin
      .from('salah_entries')
      .select('*')
      .eq('user_id', uid)
      .gte('created_at', dayStartIso)
      .lt('created_at', dayEndIso),
    supabaseAdmin
      .from('users_points')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle(),
  ]);

  const labels = [
    'quiz_attempts',
    'game_progress',
    'pledges',
    'daily_checklist',
    'salah_entries',
    'users_points',
  ];

  for (let i = 0; i < tables.length; i++) {
    const res = tables[i] as { data: unknown; error: { message: string; code?: string } | null };
    console.log(`\n=== ${labels[i]} ===`);
    if (res.error) console.log('ERROR', res.error.code, res.error.message);
    else console.log(JSON.stringify(res.data, null, 2));
  }

  // Also try alternate date columns / table names
  const alt = await Promise.all([
    supabaseAdmin.from('quiz_attempts').select('*').eq('user_id', uid).order('completed_at', { ascending: false }).limit(10),
    supabaseAdmin.from('game_progress').select('*').eq('uid', uid).order('playedat', { ascending: false }).limit(15),
    supabaseAdmin.from('pledges').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('daily_activity_log').select('*').eq('user_id', uid).gte('created_at', dayStartIso).lt('created_at', dayEndIso),
    supabaseAdmin.from('activity_completions').select('*').eq('user_id', uid).gte('created_at', dayStartIso).lt('created_at', dayEndIso),
    supabaseAdmin.from('story_completions').select('*').eq('user_id', uid).gte('created_at', dayStartIso).lt('created_at', dayEndIso),
  ]);

  const altLabels = [
    'recent_quiz_attempts',
    'recent_game_progress',
    'recent_pledges',
    'daily_activity_log',
    'activity_completions',
    'story_completions',
  ];
  for (let i = 0; i < alt.length; i++) {
    const res = alt[i] as { data: unknown; error: { message: string; code?: string } | null };
    console.log(`\n=== ${altLabels[i]} ===`);
    if (res.error) console.log('ERROR', res.error.code, res.error.message);
    else console.log(JSON.stringify(res.data, null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
