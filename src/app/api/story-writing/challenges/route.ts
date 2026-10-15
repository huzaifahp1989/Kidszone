import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { ageGroupFromAge, challengeMatchesAgeGroup } from '@/lib/story-writing';
import { isMissingTableError } from '@/lib/story-writing-server';

export const dynamic = 'force-dynamic';

/** Active writing challenges that apply to the signed-in child's age group. */
export async function GET(request: Request) {
  const user = await getAuthenticatedRequestUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = new Date().toISOString().slice(0, 10);
  const [{ data, error }, { data: profile }] = await Promise.all([
    supabaseAdmin
      .from('story_challenges')
      .select('id, title, description, age_group, start_date, end_date, bonus_points')
      .eq('is_active', true)
      .lte('start_date', today)
      .gte('end_date', today)
      .order('end_date', { ascending: true }),
    supabaseAdmin.from('users').select('age').eq('uid', user.id).maybeSingle(),
  ]);

  if (error) {
    const missing = isMissingTableError(error);
    return NextResponse.json({ error: error.message, setupRequired: missing }, { status: missing ? 503 : 500 });
  }

  const ageGroup = ageGroupFromAge(profile?.age);
  const challenges = (data || [])
    .filter((row) => challengeMatchesAgeGroup(row.age_group, ageGroup))
    .map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      ageGroup: row.age_group,
      startDate: row.start_date,
      endDate: row.end_date,
      bonusPoints: row.bonus_points,
    }));
  return NextResponse.json({ challenges });
}
