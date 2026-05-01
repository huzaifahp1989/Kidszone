import { supabaseAdmin } from '@/lib/supabase-admin'
import { isTestModeEmail } from '@/lib/test-mode'

export async function isTestModeUserId(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('email')
    .eq('uid', userId)
    .maybeSingle()

  if (error) {
    console.warn('[isTestModeUserId] failed to fetch user email:', error.message)
    return false
  }

  return isTestModeEmail(data?.email)
}
