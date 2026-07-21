/**
 * Points Service
 * Handles all points-related operations with the Supabase backend
 */

import { supabase } from './supabase'
import { POINTS_DAILY_CAP } from './points-policy'
import { ensureUserProfile } from './user-profile'
import { isTestModeEmail } from './test-mode'
import { getAuthFetchHeaders } from './auth-headers'

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
    const countTowardDailyLimit = options.countTowardDailyLimit !== false;
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

    // Let the server apply the daily cap (including partial awards).
    // Do not hard-block here when remaining < requested — that dropped valid points.

    try {
      const headers = await getAuthFetchHeaders({ 'Content-Type': 'application/json' })
      const apiRes = await fetch('/api/points/award', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: user.id,
          points,
          countTowardDailyLimit,
        }),
      })
      const apiData = await apiRes.json()
      if (apiRes.ok && apiData?.success) {
        await syncUserSnapshot(user.id, {
          total_points: apiData.total_points,
          weekly_points: apiData.weekly_points,
          monthly_points: apiData.monthly_points,
        })
        return {
          success: true,
          message: apiData.message || 'Points awarded successfully',
          points_awarded: Number(apiData.points_awarded || 0),
          total_points: apiData.total_points,
          today_points: apiData.today_points,
          weekly_points: apiData.weekly_points,
          monthly_points: apiData.monthly_points,
          badges: apiData.badges,
          level: apiData.level,
          badges_earned_now: undefined,
          daily_limit: apiData.daily_limit,
        }
      }
      if (apiData?.message || apiData?.error) {
        console.warn('[awardPoints] Server award declined:', apiData.message || apiData.error)
        return {
          success: false,
          message: apiData.message || apiData.error,
          points_awarded: 0,
          today_points: apiData.today_points,
          daily_limit: apiData.daily_limit ?? POINTS_DAILY_CAP,
        }
      }
    } catch (apiErr) {
      console.warn('[awardPoints] Server award route failed', apiErr)
    }

    return {
      success: false,
      message: 'Could not award points. Please try again.',
      points_awarded: 0,
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
      remaining: POINTS_DAILY_CAP,
      daily_limit: POINTS_DAILY_CAP,
    }
  }

  // Check if the last earned date was today (UTC)
  // If not, it means it's a new day and points should be 0
  const todayStr = new Date().toISOString().slice(0, 10)
  const isNewDay = userPoints.last_earned_date !== todayStr
  const actualTodayPoints = isNewDay ? 0 : userPoints.today_points

  return {
    today_points: actualTodayPoints,
    remaining: Math.max(0, POINTS_DAILY_CAP - actualTodayPoints),
    daily_limit: POINTS_DAILY_CAP,
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
