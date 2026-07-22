import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  getAvailableRewardKeys,
  getCurrentSpinWeekStart,
  getSpinWheelReward,
  pickRandomReward,
  SPIN_WHEEL_REWARDS,
} from '@/lib/spin-wheel';
import { grantSpinWheelVoucher } from '@/lib/spin-wheel-vouchers';

export async function isSpinWheelWinner(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('featured_winners')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (error.code === '42P01') return false;
    throw error;
  }

  return Boolean(data?.user_id);
}

export async function getSpinClaimCounts(weekStartDate: string): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const reward of SPIN_WHEEL_REWARDS) {
    counts[reward.key] = 0;
  }

  const { data, error } = await supabaseAdmin
    .from('spin_wheel_spins')
    .select('reward_key')
    .eq('week_start_date', weekStartDate);

  if (error) {
    if (error.code === '42P01') return counts;
    throw error;
  }

  for (const row of data || []) {
    const key = String((row as any).reward_key || '');
    if (key) counts[key] = (counts[key] || 0) + 1;
  }

  return counts;
}

export async function getUserSpinForWeek(userId: string, weekStartDate: string) {
  const { data, error } = await supabaseAdmin
    .from('spin_wheel_spins')
    .select('id, reward_key, reward_label, created_at, week_start_date')
    .eq('user_id', userId)
    .eq('week_start_date', weekStartDate)
    .maybeSingle();

  if (error) {
    if (error.code === '42P01') return null;
    throw error;
  }

  return data;
}

export async function getSpinWheelStatus(userId: string) {
  const weekStartDate = getCurrentSpinWeekStart();
  const isWinner = await isSpinWheelWinner(userId);
  const existingSpin = await getUserSpinForWeek(userId, weekStartDate);
  const claimCounts = await getSpinClaimCounts(weekStartDate);
  const availableRewards = getAvailableRewardKeys(claimCounts);

  return {
    weekStartDate,
    isWinner,
    canSpin: isWinner && !existingSpin && availableRewards.length > 0,
    hasSpun: Boolean(existingSpin),
    spin: existingSpin
      ? {
          rewardKey: existingSpin.reward_key,
          rewardLabel: existingSpin.reward_label,
          createdAt: existingSpin.created_at,
        }
      : null,
    rewards: SPIN_WHEEL_REWARDS.map((reward) => ({
      key: reward.key,
      label: reward.label,
      color: reward.color,
      weeklyLimit: reward.weeklyLimit,
      claimedCount: claimCounts[reward.key] ?? 0,
      remaining: Math.max(0, reward.weeklyLimit - (claimCounts[reward.key] ?? 0)),
      available: (claimCounts[reward.key] ?? 0) < reward.weeklyLimit,
    })),
  };
}

export async function performSpinWheel(userId: string) {
  const weekStartDate = getCurrentSpinWeekStart();
  const isWinner = await isSpinWheelWinner(userId);

  if (!isWinner) {
    return { ok: false as const, error: 'Only admin-selected winners can spin the wheel this week.' };
  }

  const existingSpin = await getUserSpinForWeek(userId, weekStartDate);
  if (existingSpin) {
    return {
      ok: false as const,
      error: 'You have already spun the wheel this week.',
      spin: {
        rewardKey: existingSpin.reward_key,
        rewardLabel: existingSpin.reward_label,
      },
    };
  }

  const claimCounts = await getSpinClaimCounts(weekStartDate);
  const availableRewards = getAvailableRewardKeys(claimCounts);

  if (!availableRewards.length) {
    return { ok: false as const, error: 'All rewards have been claimed for this week. Please check back next week.' };
  }

  const selected = pickRandomReward(availableRewards);
  if (!selected) {
    return { ok: false as const, error: 'No rewards available right now.' };
  }

  const { data, error } = await supabaseAdmin
    .from('spin_wheel_spins')
    .insert({
      user_id: userId,
      week_start_date: weekStartDate,
      reward_key: selected.key,
      reward_label: selected.label,
    })
    .select('id, reward_key, reward_label, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { ok: false as const, error: 'You have already spun the wheel this week.' };
    }
    if (error.code === '42P01') {
      return { ok: false as const, error: 'Spin wheel is not set up yet. Run migration 20260629_create_spin_wheel.sql.' };
    }
    throw error;
  }

  let voucherGranted = false;
  try {
    const grant = await grantSpinWheelVoucher({
      userId,
      rewardKey: selected.key,
      rewardLabel: selected.label,
    });
    voucherGranted = grant.ok;
  } catch (grantError) {
    console.warn('[spin-wheel] voucher grant failed:', grantError);
  }

  return {
    ok: true as const,
    spin: {
      rewardKey: data.reward_key,
      rewardLabel: data.reward_label,
      color: getSpinWheelReward(data.reward_key)?.color ?? '#0d9488',
      createdAt: data.created_at,
      voucherGranted,
    },
  };
}

export async function listSpinWheelSpinsForWeek(weekStartDate?: string) {
  const week = weekStartDate || getCurrentSpinWeekStart();

  const { data: spins, error } = await supabaseAdmin
    .from('spin_wheel_spins')
    .select('id, user_id, reward_key, reward_label, created_at, week_start_date')
    .eq('week_start_date', week)
    .order('created_at', { ascending: false });

  if (error) {
    if (error.code === '42P01') {
      return { weekStartDate: week, spins: [], claimCounts: {} };
    }
    throw error;
  }

  const userIds = [...new Set((spins || []).map((row: any) => String(row.user_id)).filter(Boolean))];
  const usersById = new Map<string, { name: string; email: string | null; madrasahName: string; city: string }>();

  if (userIds.length > 0) {
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('*')
      .in('uid', userIds);

    for (const user of users || []) {
      const uid = String((user as any).uid);
      usersById.set(uid, {
        name: String((user as any).name || 'Friend'),
        email: (user as any).email ?? null,
        madrasahName: String(
          (user as any).madrasahName || (user as any).madrasahname || (user as any).madrasah_name || ''
        ),
        city: String((user as any).city || (user as any).town || (user as any).location || ''),
      });
    }
  }

  const claimCounts = await getSpinClaimCounts(week);

  return {
    weekStartDate: week,
    claimCounts,
    spins: (spins || []).map((row: any) => {
      const profile = usersById.get(String(row.user_id)) || {
        name: 'Friend',
        email: null,
        madrasahName: '',
        city: '',
      };
      return {
        id: row.id,
        userId: row.user_id,
        userName: profile.name,
        userEmail: profile.email,
        madrasahName: profile.madrasahName,
        city: profile.city,
        rewardKey: row.reward_key,
        rewardLabel: row.reward_label,
        createdAt: row.created_at,
      };
    }),
    rewards: SPIN_WHEEL_REWARDS.map((reward) => ({
      key: reward.key,
      label: reward.label,
      weeklyLimit: reward.weeklyLimit,
      claimedCount: claimCounts[reward.key] ?? 0,
      remaining: Math.max(0, reward.weeklyLimit - (claimCounts[reward.key] ?? 0)),
    })),
  };
}

function userMatchesQuery(user: any, query: string): boolean {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return false;

  const searchable = [
    user?.name,
    user?.email,
    user?.parent_email,
    user?.parentEmail,
    user?.guardianEmail,
    user?.contact_number,
    user?.contactnumber,
    user?.contactNumber,
    user?.madrasahName,
    user?.madrasahname,
    user?.madrasah_name,
    user?.city,
    user?.town,
    user?.location,
    user?.uid,
  ]
    .map((v) => String(v ?? '').toLowerCase())
    .join(' ');

  return tokens.every((token) => searchable.includes(token));
}

function mapUserProfile(user: any) {
  return {
    name: String(user?.name || 'Friend'),
    email: user?.email ?? null,
    madrasahName: String(user?.madrasahName || user?.madrasahname || user?.madrasah_name || ''),
    city: String(user?.city || user?.town || user?.location || ''),
  };
}

export async function listSpinWheelSelectedWinners() {
  const weekStartDate = getCurrentSpinWeekStart();

  const { data: winnerRows, error } = await supabaseAdmin
    .from('featured_winners')
    .select('user_id, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    if (error.code === '42P01') {
      return { weekStartDate, winners: [] };
    }
    throw error;
  }

  const userIds = (winnerRows || []).map((row: any) => String(row.user_id)).filter(Boolean);
  if (!userIds.length) {
    return { weekStartDate, winners: [] };
  }

  const [{ data: users }, spinsThisWeek] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('*')
      .in('uid', userIds),
    supabaseAdmin
      .from('spin_wheel_spins')
      .select('user_id, reward_label, created_at')
      .eq('week_start_date', weekStartDate)
      .in('user_id', userIds),
  ]);

  const usersById = new Map<string, ReturnType<typeof mapUserProfile>>();
  for (const user of users || []) {
    usersById.set(String((user as any).uid), mapUserProfile(user));
  }

  const spinByUser = new Map<string, { rewardLabel: string; createdAt: string }>();
  for (const row of spinsThisWeek.data || []) {
    spinByUser.set(String((row as any).user_id), {
      rewardLabel: String((row as any).reward_label || ''),
      createdAt: String((row as any).created_at || ''),
    });
  }

  return {
    weekStartDate,
    winners: (winnerRows || []).map((row: any) => {
      const uid = String(row.user_id);
      const profile = usersById.get(uid) || {
        name: 'Friend',
        email: null,
        madrasahName: '',
        city: '',
      };
      const spin = spinByUser.get(uid);
      return {
        userId: uid,
        name: profile.name,
        email: profile.email,
        madrasahName: profile.madrasahName,
        city: profile.city,
        selectedAt: row.created_at,
        hasSpunThisWeek: Boolean(spin),
        spinReward: spin?.rewardLabel || null,
        spunAt: spin?.createdAt || null,
      };
    }),
  };
}

export async function searchUsersForSpinWheel(query: string, limit = 15) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const { data: featuredRows } = await supabaseAdmin.from('featured_winners').select('user_id');
  const selectedIds = new Set((featuredRows || []).map((row: any) => String(row.user_id)));

  const { data, error } = await supabaseAdmin.from('users').select('*');
  if (error) throw error;

  return (data || [])
    .filter((user: any) => user?.uid && userMatchesQuery(user, trimmed) && !selectedIds.has(String(user.uid)))
    .slice(0, limit)
    .map((user: any) => {
      const profile = mapUserProfile(user);
      return {
        userId: String(user.uid),
        name: profile.name,
        email: profile.email,
        madrasahName: profile.madrasahName,
        city: profile.city,
      };
    });
}

export async function addSpinWheelWinner(userId: string) {
  const uid = String(userId || '').trim();
  if (!uid) {
    return { ok: false as const, error: 'User id is required.' };
  }

  const { data: userRow, error: userError } = await supabaseAdmin
    .from('users')
    .select('uid, name')
    .eq('uid', uid)
    .maybeSingle();

  if (userError) throw userError;
  if (!userRow?.uid) {
    return { ok: false as const, error: 'User not found.' };
  }

  const { error } = await supabaseAdmin
    .from('featured_winners')
    .upsert({ user_id: uid }, { onConflict: 'user_id' });

  if (error) {
    if (error.code === '42P01') {
      return { ok: false as const, error: 'Missing featured_winners table. Run migration 20260508_create_featured_winners.sql.' };
    }
    throw error;
  }

  return { ok: true as const, userId: uid, name: String((userRow as any).name || 'Friend') };
}

export async function removeSpinWheelWinner(userId: string) {
  const uid = String(userId || '').trim();
  if (!uid) {
    return { ok: false as const, error: 'User id is required.' };
  }

  const { error } = await supabaseAdmin.from('featured_winners').delete().eq('user_id', uid);

  if (error) {
    if (error.code === '42P01') {
      return { ok: false as const, error: 'Missing featured_winners table. Run migration 20260508_create_featured_winners.sql.' };
    }
    throw error;
  }

  return { ok: true as const, userId: uid };
}
