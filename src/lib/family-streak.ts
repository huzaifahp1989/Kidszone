import { supabaseAdmin } from '@/lib/supabase-admin';
import { normalizeFamilyEmail } from '@/lib/family-accounts';

function yesterdayKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

export type FamilyStreakSnapshot = {
  familyEmail: string;
  streak: number;
  lastMissionDate: string | null;
  creditedToday: boolean;
};

async function resolveFamilyEmail(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('users')
    .select('family_email, email')
    .eq('uid', userId)
    .maybeSingle();

  const familyEmail = normalizeFamilyEmail(
    String((data as { family_email?: string; email?: string } | null)?.family_email || '')
  );
  if (familyEmail) return familyEmail;

  const authEmail = normalizeFamilyEmail(String((data as { email?: string } | null)?.email || ''));
  return authEmail || null;
}

export async function getFamilyStreakForUser(userId: string): Promise<FamilyStreakSnapshot | null> {
  const familyEmail = await resolveFamilyEmail(userId);
  if (!familyEmail) return null;

  const todayKey = new Date().toISOString().slice(0, 10);

  try {
    const { data, error } = await supabaseAdmin
      .from('family_streaks')
      .select('streak, last_mission_date')
      .eq('family_email', familyEmail)
      .maybeSingle();

    if (error) {
      if (error.code === '42P01') return { familyEmail, streak: 0, lastMissionDate: null, creditedToday: false };
      throw error;
    }

    const lastMissionDate = data?.last_mission_date ? String(data.last_mission_date).slice(0, 10) : null;
    return {
      familyEmail,
      streak: Number(data?.streak ?? 0),
      lastMissionDate,
      creditedToday: lastMissionDate === todayKey,
    };
  } catch {
    return { familyEmail, streak: 0, lastMissionDate: null, creditedToday: false };
  }
}

/** Call when any family member completes all daily missions for the day. */
export async function tryBumpFamilyStreak(userId: string, dateKey: string): Promise<FamilyStreakSnapshot | null> {
  const familyEmail = await resolveFamilyEmail(userId);
  if (!familyEmail) return null;

  try {
    const { data: existing, error: readError } = await supabaseAdmin
      .from('family_streaks')
      .select('streak, last_mission_date')
      .eq('family_email', familyEmail)
      .maybeSingle();

    if (readError && readError.code !== '42P01') throw readError;
    if (readError?.code === '42P01') return null;

    const lastDate = existing?.last_mission_date ? String(existing.last_mission_date).slice(0, 10) : null;
    if (lastDate === dateKey) {
      return {
        familyEmail,
        streak: Number(existing?.streak ?? 0),
        lastMissionDate: lastDate,
        creditedToday: true,
      };
    }

    const prevStreak = Number(existing?.streak ?? 0);
    const nextStreak = lastDate === yesterdayKey(dateKey) ? prevStreak + 1 : 1;

    const { error: upsertError } = await supabaseAdmin.from('family_streaks').upsert(
      {
        family_email: familyEmail,
        streak: nextStreak,
        last_mission_date: dateKey,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'family_email' }
    );

    if (upsertError) throw upsertError;

    return {
      familyEmail,
      streak: nextStreak,
      lastMissionDate: dateKey,
      creditedToday: true,
    };
  } catch (err) {
    console.warn('[family-streak] bump failed:', err);
    return null;
  }
}
