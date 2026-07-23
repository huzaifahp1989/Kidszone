import { authJsonFetch } from '@/lib/auth-headers';

export async function tryUnlockStickersClient(userId: string, triggers: string[]): Promise<string[]> {
  try {
    const res = await authJsonFetch('/api/kids-zone/stickers/unlock', {
      method: 'POST',
      body: JSON.stringify({ userId, triggers }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return [];
    return Array.isArray(data?.unlocked) ? data.unlocked.map(String) : [];
  } catch {
    return [];
  }
}
