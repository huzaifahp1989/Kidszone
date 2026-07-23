import { readStoredAccessToken, supabase } from '@/lib/supabase';

async function resolveAccessToken(timeoutMs = 2_500): Promise<string | null> {
  const stored = readStoredAccessToken();
  if (stored) return stored;

  try {
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    if (result && typeof result === 'object' && 'data' in result) {
      const token = result.data.session?.access_token ?? null;
      if (token) return token;
    }
  } catch {
    /* fall through */
  }

  return readStoredAccessToken();
}

export async function getAuthFetchHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const token = await resolveAccessToken();
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export type AuthJsonFetchOptions = RequestInit & {
  /** Abort the request after this many milliseconds (default 25s). */
  timeoutMs?: number;
};

export async function authJsonFetch(url: string, init: AuthJsonFetchOptions = {}): Promise<Response> {
  const { timeoutMs = 25_000, ...fetchInit } = init;
  const headers = await getAuthFetchHeaders({
    'Content-Type': 'application/json',
    ...(fetchInit.headers as Record<string, string> | undefined),
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response = await fetch(url, { ...fetchInit, headers, signal: controller.signal });

    // One retry after refresh when the session token expired.
    if (response.status === 401) {
      try {
        await supabase.auth.refreshSession();
        const retryHeaders = await getAuthFetchHeaders({
          'Content-Type': 'application/json',
          ...(fetchInit.headers as Record<string, string> | undefined),
        });
        response = await fetch(url, { ...fetchInit, headers: retryHeaders, signal: controller.signal });
      } catch {
        /* keep original 401 */
      }
    }

    return response;
  } finally {
    clearTimeout(timer);
  }
}

export async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = await getAuthFetchHeaders(init.headers as Record<string, string> | undefined);
  return fetch(url, { ...init, headers });
}
