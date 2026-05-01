import { randomBytes } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { awardPointsWithDailyCapByUserId } from '@/lib/server-points';

const TOKEN_REWARD_PER_SHARE = 5;
const TOKEN_REWARD_PER_JOIN = 20;
const POINT_REWARD_PER_SHARE = 2;
const POINT_REWARD_PER_JOIN = 50;

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;

type ReferralProfileRow = {
  user_id: string;
  referral_code: string;
  tokens_earned: number;
  successful_joins: number;
  shares_count: number;
  points_earned: number;
};

export type ReferralSnapshot = {
  referralCode: string;
  inviteLink: string;
  tokensEarned: number;
  pointsEarned: number;
  successfulJoins: number;
  sharesCount: number;
  shareReward: {
    tokens: number;
    points: number;
    availableToday: boolean;
  };
  joinReward: {
    tokens: number;
    points: number;
  };
};

export type ShareRewardResult = {
  success: boolean;
  alreadyClaimedToday: boolean;
  tokensAwarded: number;
  pointsAwarded: number;
  message: string;
  totals?: {
    totalPoints: number;
    weeklyPoints: number;
    monthlyPoints: number;
    todayPoints: number;
    badges: number;
    level: number;
  };
};

export type JoinReferralResult = {
  success: boolean;
  alreadyLinked: boolean;
  tokensAwarded: number;
  pointsAwarded: number;
  message: string;
};

function normalizeReferralCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function randomCode() {
  const bytes = randomBytes(CODE_LENGTH);
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

async function createUniqueReferralCode() {
  for (let attempts = 0; attempts < 8; attempts += 1) {
    const candidate = randomCode();
    const { data, error } = await supabaseAdmin
      .from('referral_profiles')
      .select('user_id')
      .eq('referral_code', candidate)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw new Error(error.message);
    }

    if (!data) {
      return candidate;
    }
  }

  throw new Error('Could not generate a unique referral code.');
}

async function ensureReferralProfile(userId: string): Promise<ReferralProfileRow> {
  const { data: existing, error: existingErr } = await supabaseAdmin
    .from('referral_profiles')
    .select('user_id, referral_code, tokens_earned, successful_joins, shares_count, points_earned')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingErr && existingErr.code !== 'PGRST116') {
    throw new Error(existingErr.message);
  }

  if (existing) {
    return existing;
  }

  const code = await createUniqueReferralCode();
  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('referral_profiles')
    .insert({
      user_id: userId,
      referral_code: code,
      tokens_earned: 0,
      successful_joins: 0,
      shares_count: 0,
      points_earned: 0,
    })
    .select('user_id, referral_code, tokens_earned, successful_joins, shares_count, points_earned')
    .single();

  if (insertErr) {
    throw new Error(insertErr.message);
  }

  return inserted;
}

async function hasClaimedShareRewardToday(userId: string, today: string) {
  const { data, error } = await supabaseAdmin
    .from('referral_share_rewards')
    .select('id')
    .eq('user_id', userId)
    .eq('reward_date', today)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }

  return Boolean(data);
}

export async function getReferralSnapshot(userId: string, appUrl: string): Promise<ReferralSnapshot> {
  const profile = await ensureReferralProfile(userId);
  const today = new Date().toISOString().slice(0, 10);
  const claimedToday = await hasClaimedShareRewardToday(userId, today);

  return {
    referralCode: profile.referral_code,
    inviteLink: `${appUrl.replace(/\/$/, '')}/signup?ref=${profile.referral_code}`,
    tokensEarned: Number(profile.tokens_earned || 0),
    pointsEarned: Number(profile.points_earned || 0),
    successfulJoins: Number(profile.successful_joins || 0),
    sharesCount: Number(profile.shares_count || 0),
    shareReward: {
      tokens: TOKEN_REWARD_PER_SHARE,
      points: POINT_REWARD_PER_SHARE,
      availableToday: !claimedToday,
    },
    joinReward: {
      tokens: TOKEN_REWARD_PER_JOIN,
      points: POINT_REWARD_PER_JOIN,
    },
  };
}

export async function claimShareReward(userId: string): Promise<ShareRewardResult> {
  await ensureReferralProfile(userId);

  const today = new Date().toISOString().slice(0, 10);

  const { data: inserted, error: insertErr } = await supabaseAdmin
    .from('referral_share_rewards')
    .insert({
      user_id: userId,
      reward_date: today,
      tokens_awarded: TOKEN_REWARD_PER_SHARE,
      points_awarded: 0,
    })
    .select('id')
    .maybeSingle();

  if (insertErr) {
    if (insertErr.code === '23505') {
      return {
        success: true,
        alreadyClaimedToday: true,
        tokensAwarded: 0,
        pointsAwarded: 0,
        message: 'Share reward already claimed today. Come back tomorrow for more tokens.',
      };
    }
    return {
      success: false,
      alreadyClaimedToday: false,
      tokensAwarded: 0,
      pointsAwarded: 0,
      message: insertErr.message,
    };
  }

  if (!inserted) {
    return {
      success: false,
      alreadyClaimedToday: false,
      tokensAwarded: 0,
      pointsAwarded: 0,
      message: 'Could not claim share reward right now.',
    };
  }

  const pointAwardResult = await awardPointsWithDailyCapByUserId(userId, POINT_REWARD_PER_SHARE, {
    countTowardDailyLimit: false,
    successMessage: `Referral share reward claimed. +${POINT_REWARD_PER_SHARE} bonus points added.`,
  });
  const actualPointsAwarded = Number(pointAwardResult.pointsAwarded || 0);

  await supabaseAdmin
    .from('referral_share_rewards')
    .update({ points_awarded: actualPointsAwarded })
    .eq('id', inserted.id);

  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('referral_profiles')
    .select('tokens_earned, shares_count, points_earned')
    .eq('user_id', userId)
    .single();

  if (profileErr) {
    return {
      success: false,
      alreadyClaimedToday: false,
      tokensAwarded: 0,
      pointsAwarded: 0,
      message: profileErr.message,
    };
  }

  const { error: updateProfileErr } = await supabaseAdmin
    .from('referral_profiles')
    .update({
      tokens_earned: Number(profile.tokens_earned || 0) + TOKEN_REWARD_PER_SHARE,
      shares_count: Number(profile.shares_count || 0) + 1,
      points_earned: Number(profile.points_earned || 0) + actualPointsAwarded,
      last_share_reward_date: today,
    })
    .eq('user_id', userId);

  if (updateProfileErr) {
    return {
      success: false,
      alreadyClaimedToday: false,
      tokensAwarded: 0,
      pointsAwarded: 0,
      message: updateProfileErr.message,
    };
  }

  return {
    success: true,
    alreadyClaimedToday: false,
    tokensAwarded: TOKEN_REWARD_PER_SHARE,
    pointsAwarded: actualPointsAwarded,
    message: actualPointsAwarded > 0
      ? `Shared successfully. You earned +${TOKEN_REWARD_PER_SHARE} tokens and +${actualPointsAwarded} points.`
      : `Shared successfully. You earned +${TOKEN_REWARD_PER_SHARE} tokens.`,
    totals: {
      totalPoints: pointAwardResult.totalPoints,
      weeklyPoints: pointAwardResult.weeklyPoints,
      monthlyPoints: pointAwardResult.monthlyPoints,
      todayPoints: pointAwardResult.todayPoints,
      badges: pointAwardResult.badges,
      level: pointAwardResult.level,
    },
  };
}

export async function applyReferralJoin(referredUserId: string, referralCodeRaw: string): Promise<JoinReferralResult> {
  const referralCode = normalizeReferralCode(referralCodeRaw);

  if (!referralCode || referralCode.length < 6) {
    return {
      success: false,
      alreadyLinked: false,
      tokensAwarded: 0,
      pointsAwarded: 0,
      message: 'Invalid referral code.',
    };
  }

  const { data: referrerProfile, error: referrerErr } = await supabaseAdmin
    .from('referral_profiles')
    .select('user_id, tokens_earned, successful_joins, points_earned')
    .eq('referral_code', referralCode)
    .maybeSingle();

  if (referrerErr && referrerErr.code !== 'PGRST116') {
    return {
      success: false,
      alreadyLinked: false,
      tokensAwarded: 0,
      pointsAwarded: 0,
      message: referrerErr.message,
    };
  }

  if (!referrerProfile?.user_id) {
    return {
      success: false,
      alreadyLinked: false,
      tokensAwarded: 0,
      pointsAwarded: 0,
      message: 'Referral code was not found.',
    };
  }

  if (referrerProfile.user_id === referredUserId) {
    return {
      success: false,
      alreadyLinked: false,
      tokensAwarded: 0,
      pointsAwarded: 0,
      message: 'You cannot use your own referral code.',
    };
  }

  const { data: existingEvent, error: existingErr } = await supabaseAdmin
    .from('referral_events')
    .select('id')
    .eq('referred_user_id', referredUserId)
    .maybeSingle();

  if (existingErr && existingErr.code !== 'PGRST116') {
    return {
      success: false,
      alreadyLinked: false,
      tokensAwarded: 0,
      pointsAwarded: 0,
      message: existingErr.message,
    };
  }

  if (existingEvent) {
    return {
      success: true,
      alreadyLinked: true,
      tokensAwarded: 0,
      pointsAwarded: 0,
      message: 'Referral was already linked for this account.',
    };
  }

  const { data: event, error: insertErr } = await supabaseAdmin
    .from('referral_events')
    .insert({
      referrer_user_id: referrerProfile.user_id,
      referred_user_id: referredUserId,
      referral_code: referralCode,
      tokens_awarded: TOKEN_REWARD_PER_JOIN,
      points_awarded: 0,
    })
    .select('id')
    .single();

  if (insertErr) {
    if (insertErr.code === '23505') {
      return {
        success: true,
        alreadyLinked: true,
        tokensAwarded: 0,
        pointsAwarded: 0,
        message: 'Referral was already linked for this account.',
      };
    }

    return {
      success: false,
      alreadyLinked: false,
      tokensAwarded: 0,
      pointsAwarded: 0,
      message: insertErr.message,
    };
  }

  const awardResult = await awardPointsWithDailyCapByUserId(referrerProfile.user_id, POINT_REWARD_PER_JOIN, {
    countTowardDailyLimit: false,
    successMessage: `Referral join reward claimed. +${POINT_REWARD_PER_JOIN} bonus points added.`,
  });
  const actualPointsAwarded = Number(awardResult.pointsAwarded || 0);

  await supabaseAdmin
    .from('referral_events')
    .update({ points_awarded: actualPointsAwarded })
    .eq('id', event.id);

  const { error: updateReferrerErr } = await supabaseAdmin
    .from('referral_profiles')
    .update({
      tokens_earned: Number(referrerProfile.tokens_earned || 0) + TOKEN_REWARD_PER_JOIN,
      successful_joins: Number(referrerProfile.successful_joins || 0) + 1,
      points_earned: Number(referrerProfile.points_earned || 0) + actualPointsAwarded,
    })
    .eq('user_id', referrerProfile.user_id);

  if (updateReferrerErr) {
    return {
      success: false,
      alreadyLinked: false,
      tokensAwarded: 0,
      pointsAwarded: 0,
      message: updateReferrerErr.message,
    };
  }

  return {
    success: true,
    alreadyLinked: false,
    tokensAwarded: TOKEN_REWARD_PER_JOIN,
    pointsAwarded: actualPointsAwarded,
    message: actualPointsAwarded > 0
      ? 'Referral linked successfully. Referrer received tokens and points.'
      : 'Referral linked successfully. Referrer received tokens.',
  };
}
