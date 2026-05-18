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