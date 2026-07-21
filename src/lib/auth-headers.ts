import { supabase } from '@/lib/supabase';

export async function getAuthFetchHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function authJsonFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = await getAuthFetchHeaders({
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  });
  return fetch(url, { ...init, headers });
}
