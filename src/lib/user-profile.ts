/**
 * Ensure user profile exists in Supabase (users + users_points).
 * Uses server-side admin API so new signups are not blocked by RLS.
 */
export async function ensureUserProfile(uid: string): Promise<boolean> {
  try {
    const res = await fetch('/api/user/ensure-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: uid }),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      console.error('[ensureUserProfile] API failed:', res.status, payload?.error || res.statusText);
      return false;
    }

    const data = await res.json();
    return Boolean(data?.ok);
  } catch (err) {
    console.error('[ensureUserProfile] Exception:', err);
    return false;
  }
}
