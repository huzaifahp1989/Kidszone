import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export type AuthenticatedRequestUser = {
  id: string;
  email: string | null;
};

export async function getAuthenticatedRequestUser(request: Request): Promise<AuthenticatedRequestUser | null> {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;

  return {
    id: data.user.id,
    email: data.user.email ?? null,
  };
}

export type AuthCheckResult =
  | { ok: true; user: AuthenticatedRequestUser; userId: string }
  | { ok: false; response: NextResponse };

/** Require Bearer session and that the supplied userId matches the authenticated user. */
export async function requireMatchingUser(
  request: Request,
  bodyUserId: string
): Promise<AuthCheckResult> {
  const user = await getAuthenticatedRequestUser(request);
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const userId = String(bodyUserId || '').trim();
  if (!userId) {
    return { ok: false, response: NextResponse.json({ error: 'userId is required' }, { status: 400 }) };
  }

  if (userId !== user.id) {
    return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { ok: true, user, userId };
}