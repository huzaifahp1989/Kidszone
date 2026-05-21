/**
 * Points Service
 * Handles all points-related operations with the Supabase backend
 */

import { supabase } from './supabase'
import { ensureUserProfile } from './user-profile'
import { isTestModeEmail } from './test-mode'

async function syncUserSnapshot(userId: string, totals: {
  total_points?: number
  weekly_points?: number
  monthly_points?: number
}) {
  const total_points = totals.total_points ?? null
  const weekly_points = totals.weekly_points ?? null
  const monthly_points = totals.monthly_points ?? null

  if (total_points === null && weekly_points === null && monthly_points === null) {
    return
  }

  const updates: Record<string, number> = {}
  if (total_points !== null) updates.points = total_points
  if (weekly_points !== null) updates.weeklypoints = weekly_points
  if (monthly_points !== null) updates.monthlypoints = monthly_points

  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('uid', userId)

  if (error) {
    console.warn('[syncUserSnapshot] failed', error.message)
  }
}

export interface AwardPointsResponse {
  success: boolean
  message: string
  points_awarded: number
  total_points?: number
  today_points?: number
  weekly_points?: number
  monthly_points?: number
  badges?: number
  level?: number
  badges_earned_now?: number
  daily_limit?: number
}

type AwardPointsOptions = {
  countTowardDailyLimit?: boolean
}

export interface UserPoints {
  user_id: string
  total_points: number
  weekly_points: number
  monthly_points: number
  today_points: number
  badges: number
  level: number
  last_earned_date: string
}

/**
 * Award points to the current user
 * Increments: total_points, weekly_points, monthly_points, today_points
 *
 * @param points - Number of points to award (must be > 0)
 * @returns Response with success status and updated points
 */
export async function awardPoints(
  points: number,
  options: AwardPointsOptions = {}
): Promise<AwardPointsResponse> {
  try {
    const countTowardDailyLimit = options.countTowardDailyLimit !== false
    // CRITICAL: Verify user is authenticated BEFORE calling RPC
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log('[awardPoints] Starting:', { points, userId: user?.id, authError });

    if (authError || !user) {
      console.error('[awardPoints] ❌ Auth failed:', authError);
      console.error('[awardPoints] ⚠️ User must be logged in to award points');
      return {
        success: false,
        message: 'You are not logged in. Please sign in again.',
        points_awarded: 0,
      };
    }
    
    // Double-check session exists
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('[awardPoints] ❌ No active session found');
      return {
        success: false,
        message: 'Session expired. Please sign in again.',
        points_awarded: 0,
      };
    }
    
    console.log('[awardPoints] ✅ User authenticated:', user.id);

    if (isTestModeEmail(user.email)) {
      return {
        success: true,
        message: 'Test mode active for this account. Points are not added to leaderboard.',
        points_awarded: 0,
      }
    }

    // Validate points
    if (!points || points <= 0) {
      console.error('[awardPoints] Invalid points:', points)
      return {
        success: false,
        message: 'Points must be greater than 0',
        points_awarded: 0,
      }
    }

    // Ensure profile and points rows exist for new users before awarding.
    await ensureUserProfile(user.id)

    // STRICT LIMIT CHECK: Check daily allowance BEFORE calling RPC
    const allowance = await checkDailyAllowance()
    if (countTowardDailyLimit && allowance.remaining < points) {
      console.warn('[awardPoints] 🛑 Client-side limit check: Daily limit reached', allowance)
      return {
        success: false,
        message: 'No points can be awarded right now. Please try again later.',
        points_awarded: 0,
        today_points: allowance.today_points,
        daily_limit: 100,
      }
    }

    // Call the RPC function
    console.log('[awardPoints] Calling RPC award_points with:', { p_points: points })
    const { data, error } = await supabase.rpc('award_points', {
      p_points: points,
    })

    console.log('[awardPoints] RPC response:', { data, error: error?.message })

    if (!error && data) {
      if (data.success) {
        console.log('[awardPoints] RPC success, syncing users table')
        await syncUserSnapshot(user.id, {
          total_points: data.total_points,
          weekly_points: data.weekly_points,
          monthly_points: data.monthly_points,
        })
        return data as AwardPointsResponse
      } 
      
      // If RPC failed, check if it's the deprecated "game limit" error
      // If so, we ignore it and fall through to the direct upsert fallback
      const isGameLimit = data.message && (
        data.message.toLowerCase().includes('game limit') || 
        data.message.toLowerCase().includes('3 games')
      );
      
      if (!isGameLimit) {
        const currentToday = data.today_points ?? 0
        const currentLimit = data.daily_limit ?? 100
        const remaining = Math.max(0, currentLimit - currentToday)

        if (remaining > 0) {
          console.warn('[awardPoints] RPC denied but partial points possible. Forcing fallback to award remaining:', remaining)
          // Fall through to fallback logic
        } else if (!countTowardDailyLimit) {
          // Activity explicitly bypasses the daily cap (e.g. pledge/durood).
          // The RPC enforces the cap regardless, so fall through to the fallback
          // upsert which respects countTowardDailyLimit=false.
          console.warn('[awardPoints] Daily limit reached but countTowardDailyLimit=false — falling through to fallback to bypass cap')
          // Fall through to fallback logic
        } else {
          console.log('[awardPoints] RPC denied points (likely daily points limit):', data.message)
          return data as AwardPointsResponse
        }
      }
      
      console.warn('[awardPoints] RPC enforced deprecated game limit. Ignoring and using fallback upsert.');
    }

    // Fallback: direct upsert with daily cap
    console.warn('[awardPoints] RPC unavailable or failed, using fallback upsert', error?.message)

    const todayStr = new Date().toISOString().slice(0, 10)
    const dailyLimit = 100

    console.log('[awardPoints] Fallback: checking existing row for user:', user.id)
    // Ensure row exists
    const { data: existingRow, error: fetchErr } = await supabase
      .from('users_points')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    console.log('[awardPoints] Fallback: existing row:', { existingRow, fetchErr })

    if (fetchErr) {
      console.error('[awardPoints] fallback fetch error', fetchErr)
      return {
        success: false,
        message: fetchErr.message || 'Failed to award points',
        points_awarded: 0,
      }
    }

    const isNewDay = !existingRow?.last_earned_date || existingRow.last_earned_date !== todayStr
    const todayPoints = isNewDay ? 0 : existingRow?.today_points ?? 0

    let pointsToAward = points
    if (countTowardDailyLimit && todayPoints + pointsToAward > dailyLimit) {
      pointsToAward = Math.max(0, dailyLimit - todayPoints)
    }

    if (pointsToAward <= 0) {
      console.warn('[awardPoints] Fallback: daily limit reached (0 remaining)')
      return {
        success: false,
        message: 'No points can be awarded right now. Please try again later.',
        points_awarded: 0,
        today_points: todayPoints,
        daily_limit: dailyLimit,
      }
    }

    const newDailyTotal = countTowardDailyLimit ? todayPoints + pointsToAward : todayPoints
    console.log('[awardPoints] Fallback: daily check:', { isNewDay, todayPoints, newDailyTotal, dailyLimit, pointsToAward, countTowardDailyLimit })

    const total = (existingRow?.total_points ?? 0) + pointsToAward
    const weekly = (existingRow?.weekly_points ?? 0) + pointsToAward
    const monthly = (existingRow?.monthly_points ?? 0) + pointsToAward
    
    // Calculate badges/level for response purposes.
    const badges = Math.floor(total / 100)
    const level = 1 + Math.floor(badges / 5)
    const badgesEarnedNow = badges - Math.floor((existingRow?.total_points ?? 0) / 100)

    console.log('[awardPoints] Fallback: upserting with:', { user_id: user.id, total, weekly, monthly, today: newDailyTotal, badges, level })

    const { error: upsertErr } = await supabase
      .from('users_points')
      .upsert({
        user_id: user.id,
        total_points: total,
        weekly_points: weekly,
        monthly_points: monthly,
        today_points: newDailyTotal,
        last_earned_date: todayStr,
        badges: badges,
        level: level,
      }, { onConflict: 'user_id' })

    console.log('[awardPoints] Fallback: upsert result:', { upsertErr })

    if (upsertErr) {
      console.error('[awardPoints] fallback upsert error:', upsertErr)
      return {
        success: false,
        message: 'Could not update points. Please try again.',
        points_awarded: 0,
      }
    }

    console.log('[awardPoints] Fallback: syncing users table')
    await syncUserSnapshot(user.id, {
      total_points: total,
      weekly_points: weekly,
      monthly_points: monthly,
    })

    console.log('[awardPoints] Fallback: complete, returning success')
    return {
      success: true,
      message: countTowardDailyLimit ? 'Points awarded successfully' : 'Bonus points awarded successfully',
      points_awarded: pointsToAward,
      total_points: total,
      today_points: newDailyTotal,
      weekly_points: weekly,
      monthly_points: monthly,
      badges: badges,
      level: level,
      badges_earned_now: badgesEarnedNow,
      daily_limit: dailyLimit,
    }
  } catch (error) {
    console.error('[awardPoints] Exception caught:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      points_awarded: 0,
    }
  }
}

/**
 * Get current user's points
 * @returns User's points data or null if not found
 */
export async function getUserPoints(): Promise<UserPoints | null> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return null
    }

    const { data, error } = await supabase
      .from('users_points')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching user points:', error)
      return null
    }

    return data as UserPoints
  } catch (error) {
    console.error('Error in getUserPoints:', error)
    return null
  }
}

/**
 * Get points by user ID (for leaderboard or admin view)
 * Note: RLS will only allow viewing own points or public data
 * @param userId - The user ID to fetch points for
 * @returns User's points data or null if not found/allowed
 */
export async function getUserPointsById(
  userId: string
): Promise<UserPoints | null> {
  try {
    const { data, error } = await supabase
      .from('users_points')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('Error fetching user points:', error)
      return null
    }

    return data as UserPoints
  } catch (error) {
    console.error('Error in getUserPointsById:', error)
    return null
  }
}

/**
 * Check if user has daily allowance remaining
 * Handles date checking to ensure daily reset is respected
 * @returns Object with today_points and daily_limit
 */
export async function checkDailyAllowance(): Promise<{
  today_points: number
  remaining: number
  daily_limit: number
}> {
  const userPoints = await getUserPoints()

  if (!userPoints) {
    return {
      today_points: 0,
      remaining: 100,
      daily_limit: 100,
    }
  }

  // Check if the last earned date was today (UTC)
  // If not, it means it's a new day and points should be 0
  const todayStr = new Date().toISOString().slice(0, 10)
  const isNewDay = userPoints.last_earned_date !== todayStr
  const actualTodayPoints = isNewDay ? 0 : userPoints.today_points

  return {
    today_points: actualTodayPoints,
    remaining: Math.max(0, 100 - actualTodayPoints),
    daily_limit: 100,
  }
}

/**
 * Award points and handle the response
 * Returns a human-readable message for the UI
 *
 * @param points - Points to award
 * @returns Object with success status and message
 */
export async function awardPointsWithMessage(
  points: number,
  options: AwardPointsOptions = {}
): Promise<{ success: boolean; message: string; data?: AwardPointsResponse }> {
  const response = await awardPoints(points, options)

  if (!response.success) {
    return {
      success: false,
      message: response.message,
      data: response,
    }
  }

  return {
    success: true,
    message: `🎉 +${response.points_awarded} points! Total: ${response.total_points}`,
    data: response,
  }
}
