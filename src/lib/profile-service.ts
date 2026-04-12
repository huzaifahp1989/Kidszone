import { supabase } from './supabase';

export interface KidProfile {
  uid: string;
  email: string;
  name: string;
  age: number;
  madrasahName?: string;
  contactNumber?: string;
  role: 'kid' | 'guardian' | 'admin';
  points: number;
  weeklyPoints: number;
  monthlyPoints: number;
  todayPoints?: number;
  dailyLimit?: number;
  badges: number;
  level: string;
  streak?: number;
  lastStreakUpdate?: string;
  isFlagged?: boolean;
  createdAt: string;
  updatedAt: string;
}

function mapUser(row: any, pointsRow?: any): KidProfile {
  const dailyLimit = 100;
  const todayPoints = pointsRow?.today_points ?? 0;

  const totalPoints = pointsRow?.total_points ?? row.points ?? 0;
  const weeklyPoints = pointsRow?.weekly_points ?? row.weeklyPoints ?? row.weeklypoints ?? 0;
  const monthlyPoints = pointsRow?.monthly_points ?? row.monthlyPoints ?? row.monthlypoints ?? 0;

  return {
    uid: row.uid,
    email: row.email,
    name: row.name,
    age: row.age,
    madrasahName: row.madrasahName ?? row.madrasahname ?? row.madrasah_name,
    contactNumber: row.contactNumber ?? row.contactnumber ?? row.contact_number,
    role: row.role,
    points: totalPoints,
    weeklyPoints,
    monthlyPoints,
    todayPoints,
    dailyLimit,
    badges: row.badges ?? 0,
    level: row.level ?? 'Beginner',
    streak: row.streak ?? 0,
    lastStreakUpdate: row.last_streak_update,
    isFlagged: row.is_flagged ?? false,
    createdAt: row.createdAt ?? row.createdat ?? '',
    updatedAt: row.updatedAt ?? row.updatedat ?? '',
  };
}

/**
 * Fetch user profile from Supabase
 */
export async function getProfile(uid: string): Promise<KidProfile | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('uid', uid)
      .maybeSingle();

    if (error) {
      console.error('[getProfile] Error fetching profile:', error);
      return null;
    }

    const { data: pointsRow, error: pointsError } = await supabase
      .from('users_points')
      .select('total_points, weekly_points, monthly_points, today_points')
      .eq('user_id', uid)
      .maybeSingle();

    if (pointsError) {
      console.warn('[getProfile] Could not fetch users_points row:', pointsError.message);
    }

    return data ? mapUser(data, pointsRow) : null;
  } catch (err) {
    console.error('[getProfile] Unexpected error:', err);
    return null;
  }
}

/**
 * Create user profile
 */
export async function createProfile(
  uid: string,
  email: string,
  name: string,
  age: number
): Promise<KidProfile | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert({
        uid,
        email,
        name,
        age,
        role: 'kid',
        points: 0,
        weeklypoints: 0,
        monthlypoints: 0,
        badges: 0,
        daily_games_played: 0,
        level: 'Beginner',
      }, { onConflict: 'uid', ignoreDuplicates: true })
      .select('uid,email,name,age,role,points,weeklypoints:weeklyPoints, monthlypoints:monthlyPoints, badges, daily_games_played, level, createdat:createdAt, updatedat:updatedAt')
      .single();

    if (error) {
      console.error('[createProfile] Error creating profile:', error);
      return null;
    }

    const { data: pointsRow, error: pointsError } = await supabase
      .from('users_points')
      .select('total_points, weekly_points, monthly_points, today_points')
      .eq('user_id', uid)
      .maybeSingle();

    if (pointsError) {
      console.warn('[createProfile] users_points row missing, will be auto-created on award:', pointsError.message);
    }

    console.log('[createProfile] Profile created successfully:', uid);
    return data ? mapUser(data, pointsRow) : null;
  } catch (err) {
    console.error('[createProfile] Unexpected error:', err);
    return null;
  }
}

/**
 * Update points for a user using RPC function with fallback
 */
export async function addPoints(uid: string, pointsToAdd: number): Promise<KidProfile | null> {
  try {
    console.log('[addPoints] Adding points via award_points:', { uid, pointsToAdd });

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user || user.id !== uid) {
      console.error('[addPoints] Auth mismatch or missing user for uid:', uid, authErr);
      return null;
    }

    const { data: rpcData, error: rpcError } = await supabase
      .rpc('award_points', { p_points: pointsToAdd });

    if (rpcError || !rpcData || rpcData.success === false) {
      console.error('[addPoints] award_points failed:', rpcError || rpcData);
      return null;
    }

    const profile = await getProfile(uid);
    return profile;
  } catch (err) {
    console.error('[addPoints] Unexpected error:', err);
    return null;
  }
}

/**
 * Update level based on points
 */
export function calculateLevel(points: number): string {
  if (points >= 1000) return 'Master';
  if (points >= 500) return 'Expert';
  if (points >= 250) return 'Advanced';
  if (points >= 100) return 'Intermediate';
  if (points >= 25) return 'Novice';
  return 'Beginner';
}

/**
 * Get leaderboard
 */
export async function getLeaderboard(period: 'weekly' | 'monthly' | 'all_time' = 'all_time') {
  try {
    let viewName = 'leaderboard_all_time';
    
    if (period === 'weekly') viewName = 'leaderboard_weekly';
    if (period === 'monthly') viewName = 'leaderboard_monthly';

    const { data, error } = await supabase
      .from(viewName)
      .select('*')
      .order('rank', { ascending: true })
      .limit(100);

    if (error) {
      console.error('[getLeaderboard] Error fetching leaderboard:', error);
      return [];
    }

    return data;
  } catch (err) {
    console.error('[getLeaderboard] Unexpected error:', err);
    return [];
  }
}

/**
 * Get user rank in leaderboard
 */
export async function getUserRank(
  uid: string,
  period: 'weekly' | 'monthly' | 'all_time' = 'all_time'
): Promise<number | null> {
  try {
    let viewName = 'leaderboard_all_time';
    
    if (period === 'weekly') viewName = 'leaderboard_weekly';
    if (period === 'monthly') viewName = 'leaderboard_monthly';

    const { data, error } = await supabase
      .from(viewName)
      .select('rank')
      .eq('uid', uid)
      .maybeSingle();

    if (error) {
      console.error('[getUserRank] Error fetching rank:', error);
      return null;
    }

    return data?.rank || null;
  } catch (err) {
    console.error('[getUserRank] Unexpected error:', err);
    return null;
  }
}
