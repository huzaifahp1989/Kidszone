import { supabase } from './supabase';

function isPlaceholderName(name: string | null | undefined): boolean {
  if (!name) return true;
  const trimmed = name.trim();
  if (!trimmed) return true;
  if (/^learner\b/i.test(trimmed)) return true;
  if (/^user[-_][a-z0-9]+$/i.test(trimmed)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) return true;
  return false;
}

/**
 * Ensure user profile exists in Supabase. 
 * Creates a profile if missing. For clients, email comes from the insert itself.
 */
export async function ensureUserProfile(uid: string): Promise<boolean> {
  try {
    console.log('[ensureUserProfile] Ensure for UID:', uid);

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr) {
      console.warn('[ensureUserProfile] Could not read auth user:', authErr.message);
    }
    const authUser = authData?.user;
    const preferredName =
      (authUser?.user_metadata as any)?.name ||
      (authUser?.user_metadata as any)?.full_name ||
      (authUser?.user_metadata as any)?.fullName ||
      '';
    const derivedName =
      typeof preferredName === 'string' && preferredName.trim()
        ? preferredName.trim()
        : (authUser?.email ? authUser.email.split('@')[0] : 'Friend');
    const derivedEmail = authUser?.email ?? `user-${uid.slice(0, 8)}@local`;

    // Avoid resetting points: only insert if missing
    const { data: existing, error: readErr } = await supabase
      .from('users')
      .select('uid,name,email')
      .eq('uid', uid)
      .maybeSingle();

    if (readErr) {
      console.error('[ensureUserProfile] Read failed:', readErr.code, readErr.message);
      return false;
    }

    if (existing?.uid) {
      // Ensure points row exists for first-time point awards.
      const { error: pointsUpsertErr } = await supabase
        .from('users_points')
        .upsert({
          user_id: uid,
          total_points: 0,
          weekly_points: 0,
          monthly_points: 0,
          today_points: 0,
          last_earned_date: new Date().toISOString().slice(0, 10),
        }, { onConflict: 'user_id', ignoreDuplicates: true });

      if (pointsUpsertErr) {
        console.warn('[ensureUserProfile] Could not ensure users_points row:', pointsUpsertErr.message);
      }

      if (isPlaceholderName(existing.name) && derivedName && !isPlaceholderName(derivedName)) {
        const { error: updateErr } = await supabase
          .from('users')
          .update({ name: derivedName, email: existing.email || derivedEmail })
          .eq('uid', uid);
        if (updateErr) {
          console.warn('[ensureUserProfile] Could not upgrade placeholder name:', updateErr.message);
        }
      }
      return true;
    }

    const { error: insertErr } = await supabase
      .from('users')
      .upsert({
        uid,
        role: 'kid',
        name: derivedName,
        age: 10,
        madrasahname: '',
        email: derivedEmail,
        points: 0,
        weeklypoints: 0,
        monthlypoints: 0,
        level: 'Beginner',
      }, { onConflict: 'uid', ignoreDuplicates: true });

    if (insertErr) {
      console.error('[ensureUserProfile] Insert failed:', insertErr.code, insertErr.message, insertErr.details);
      return false;
    }

    const { error: pointsUpsertErr } = await supabase
      .from('users_points')
      .upsert({
        user_id: uid,
        total_points: 0,
        weekly_points: 0,
        monthly_points: 0,
        today_points: 0,
        last_earned_date: new Date().toISOString().slice(0, 10),
      }, { onConflict: 'user_id', ignoreDuplicates: true });

    if (pointsUpsertErr) {
      console.warn('[ensureUserProfile] Could not create users_points row:', pointsUpsertErr.message);
    }

    console.log('[ensureUserProfile] Profile created:', uid);
    return true;
  } catch (err) {
    console.error('[ensureUserProfile] Exception:', err);
    return false;
  }
}
