import { randomBytes } from 'crypto';
import { addHours, format, startOfDay, startOfMonth, startOfWeek, subDays } from 'date-fns';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  createVoucherSlug,
  emptyVoucherAnalytics,
  getRedemptionStatus,
  getVoucherStatus,
  isCloseToExpiry,
  toQrValue,
  VOUCHER_ACTIVE_HOURS,
} from '@/lib/vouchers';
import type {
  RedemptionStatus,
  VoucherAnalytics,
  VoucherEligibility,
  VoucherFormInput,
  VoucherGalleryItem,
  VoucherNotification,
  VoucherOffer,
  VoucherRedemption,
} from '@/types/vouchers';

const TABLE_VOUCHERS = 'business_vouchers';
const TABLE_REDEMPTIONS = 'voucher_redemptions';
const TABLE_NOTIFICATIONS = 'voucher_notifications';
const TABLE_LOGS = 'voucher_admin_logs';
const TABLE_MONTHLY_PROGRESS = 'user_monthly_progress';

const missingTableCodes = new Set(['42P01']);

export const isVoucherSetupMissing = (error: { code?: string } | null | undefined) =>
  Boolean(error?.code && missingTableCodes.has(error.code));

const generateSecureVoucherCode = () => `IMC-${randomBytes(3).toString('base64url').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)}`;

const isJpgAssetUrl = (value: string | null | undefined) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) return true;

  try {
    const parsed = new URL(trimmed);
    return /\.jpe?g$/i.test(parsed.pathname);
  } catch {
    const normalized = trimmed.split(/[?#]/)[0];
    return /\.jpe?g$/i.test(normalized);
  }
};

const normalizeImageOnlyVoucherInput = (input: VoucherFormInput): VoucherFormInput => {
  const normalized = { ...input };

  if (!normalized.imageOnly) {
    return normalized;
  }

  if (!normalized.imageUrl?.trim()) {
    normalized.imageUrl = normalized.bannerUrl?.trim() || normalized.logoUrl?.trim() || '';
  }
  if (!normalized.title?.trim()) normalized.title = 'Voucher Poster';
  if (!normalized.businessName?.trim()) normalized.businessName = 'Partner Offer';
  if (!normalized.description?.trim()) normalized.description = 'Image-only voucher poster. Details can be added later.';
  if (!normalized.termsAndConditions?.trim()) normalized.termsAndConditions = 'Refer to the voucher poster image for details.';
  if (!normalized.discountLabel?.trim()) normalized.discountLabel = 'See poster';

  if (!normalized.expiryDate) {
    const oneYearAhead = new Date();
    oneYearAhead.setFullYear(oneYearAhead.getFullYear() + 1);
    normalized.expiryDate = oneYearAhead.toISOString();
  }

  return normalized;
};

const assertJpgVoucherAssets = (input: VoucherFormInput) => {
  const imageFields = [input.logoUrl, input.imageUrl, input.bannerUrl].filter(Boolean);
  if (imageFields.some((url) => !isJpgAssetUrl(url))) {
    throw new Error('Only JPG image URLs are allowed for vouchers.');
  }
};

const toRequiredTimestamp = (value: string | null | undefined, fieldLabel: string) => {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    throw new Error(`${fieldLabel} is required.`);
  }

  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) {
    throw new Error(`${fieldLabel} is invalid.`);
  }

  return new Date(parsed).toISOString();
};

const mapOffer = (row: any): VoucherOffer => {
  const computedStatus = getVoucherStatus({
    status: row.status,
    startDate: row.start_date,
    expiryDate: row.expiry_date,
    publicVisible: Boolean(row.public_visible),
  });

  return {
    id: String(row.id),
    slug: String(row.slug || createVoucherSlug(row.title || row.business_name || 'voucher')),
    title: String(row.title || ''),
    businessName: String(row.business_name || ''),
    description: String(row.description || ''),
    termsAndConditions: String(row.terms_and_conditions || ''),
    expiryDate: String(row.expiry_date),
    startDate: row.start_date ? String(row.start_date) : null,
    status: computedStatus,
    approvalMode: row.approval_mode === 'manual' ? 'manual' : 'auto',
    audience: row.audience || 'public',
    discountType: row.discount_type || 'custom',
    discountLabel: String(row.discount_label || ''),
    logoUrl: row.logo_url || null,
    imageUrl: row.image_url || null,
    bannerUrl: row.banner_url || null,
    locationLabel: row.location_label || null,
    winnersLimit: row.winners_limit == null ? null : Number(row.winners_limit),
    totalRedeemed: Number(row.total_redeemed || 0),
    maxRedemptions: row.max_redemptions == null ? null : Number(row.max_redemptions),
    perUserLimit: Math.max(1, Number(row.per_user_limit || 1)),
    periodLimit: row.period_limit == null ? null : Number(row.period_limit),
    periodLimitWindow: row.period_limit_window || null,
    minPoints: row.min_points == null ? null : Number(row.min_points),
    minActivities: row.min_activities == null ? null : Number(row.min_activities),
    publicVisible: Boolean(row.public_visible),
    imageOnly: Boolean(row.image_only),
    manualApprovalRequired: Boolean(row.manual_approval_required),
    featured: Boolean(row.featured),
    closeToExpiry: isCloseToExpiry(String(row.expiry_date)),
    qrEnabled: row.qr_enabled !== false,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
};

const mapRedemption = (row: any): VoucherRedemption => {
  const redemption: VoucherRedemption = {
    id: String(row.id),
    voucherId: String(row.voucher_id),
    voucherTitle: String(row.voucher_title || row.business_vouchers?.title || ''),
    businessName: String(row.business_name || row.business_vouchers?.business_name || ''),
    voucherCode: String(row.voucher_code),
    qrValue: String(row.qr_value || ''),
    status: (row.status || 'active') as RedemptionStatus,
    redeemedAt: String(row.redeemed_at || row.created_at),
    expiresAt: String(row.expires_at),
    usedAt: row.used_at || null,
    approvedAt: row.approved_at || null,
    approvalNotes: row.approval_notes || null,
    userId: String(row.user_id),
    deviceFingerprint: row.device_fingerprint || null,
    lastSeenAt: row.last_seen_at || null,
    shareUrl: row.share_url || null,
    imageUrl: row.image_url || row.business_vouchers?.image_url || null,
    logoUrl: row.logo_url || row.business_vouchers?.logo_url || null,
  };

  redemption.status = getRedemptionStatus(redemption);
  return redemption;
};

export async function logVoucherAction(params: {
  action: string;
  actor: string;
  actorId?: string | null;
  targetType: 'voucher' | 'redemption' | 'notification' | 'gallery';
  targetId: string;
  details: string;
}) {
  await supabaseAdmin.from(TABLE_LOGS).insert({
    action: params.action,
    actor: params.actor,
    actor_id: params.actorId || null,
    target_type: params.targetType,
    target_id: params.targetId,
    details: params.details,
  });
}

export async function createVoucherNotification(params: {
  type: VoucherNotification['type'];
  title: string;
  body: string;
  voucherId?: string | null;
  userId?: string | null;
}) {
  const { data, error } = await supabaseAdmin
    .from(TABLE_NOTIFICATIONS)
    .insert({
      type: params.type,
      title: params.title,
      body: params.body,
      voucher_id: params.voucherId || null,
      user_id: params.userId || null,
    })
    .select('*')
    .single();

  if (error) throw error;

  await logVoucherAction({
    action: `notification.${params.type}`,
    actor: 'system',
    actorId: null,
    targetType: 'notification',
    targetId: String(data.id),
    details: params.title,
  });

  return {
    id: String(data.id),
    type: data.type,
    title: String(data.title),
    body: String(data.body),
    createdAt: String(data.created_at),
    voucherId: data.voucher_id || null,
    userId: data.user_id || null,
  } as VoucherNotification;
}

export async function fetchVoucherOffers(options?: { includeHidden?: boolean; includeExpired?: boolean }) {
  const query = supabaseAdmin
    .from(TABLE_VOUCHERS)
    .select('*')
    .order('featured', { ascending: false })
    .order('expiry_date', { ascending: true });

  if (!options?.includeHidden) {
    query.eq('public_visible', true);
  }

  const { data, error } = await query;
  if (error) throw error;

  let offers = (data || []).map(mapOffer);
  if (!options?.includeExpired) {
    offers = offers.filter((offer) => offer.status !== 'expired' && offer.status !== 'inactive');
  }
  return offers;
}

export async function fetchVoucherHistory(userId: string) {
  const { data, error } = await supabaseAdmin
    .from(TABLE_REDEMPTIONS)
    .select('*, business_vouchers(title, business_name, image_url, logo_url)')
    .eq('user_id', userId)
    .order('redeemed_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapRedemption);
}

export async function fetchVoucherNotifications(userId?: string | null, limit = 12) {
  let query = supabaseAdmin
    .from(TABLE_NOTIFICATIONS)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (userId) {
    query = query.or(`user_id.is.null,user_id.eq.${userId}`);
  } else {
    query = query.is('user_id', null);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row) => ({
    id: String(row.id),
    type: row.type,
    title: String(row.title),
    body: String(row.body),
    createdAt: String(row.created_at),
    voucherId: row.voucher_id || null,
    userId: row.user_id || null,
  })) as VoucherNotification[];
}

export async function fetchVoucherGallery(): Promise<VoucherGalleryItem[]> {
  const offers = await fetchVoucherOffers({ includeHidden: false, includeExpired: false });
  return offers
    .filter((offer) => Boolean(offer.imageUrl))
    .map((offer) => ({
      id: offer.id,
      voucherId: offer.id,
      title: offer.title,
      imageUrl: offer.imageUrl || '',
      businessName: offer.businessName,
      expiryDate: offer.expiryDate,
      publicVisible: offer.publicVisible,
      redeemable: offer.status === 'active',
    }));
}

export async function fetchVoucherLogs(limit = 30) {
  const { data, error } = await supabaseAdmin
    .from(TABLE_LOGS)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function fetchVoucherAnalytics(): Promise<VoucherAnalytics> {
  const [offersRes, redemptionsRes] = await Promise.all([
    supabaseAdmin.from(TABLE_VOUCHERS).select('id, title, business_name, public_visible, start_date, expiry_date, status, featured'),
    supabaseAdmin.from(TABLE_REDEMPTIONS).select('id, voucher_id, user_id, status, redeemed_at, used_at, expires_at, business_name, voucher_title'),
  ]);

  if (offersRes.error) throw offersRes.error;
  if (redemptionsRes.error) throw redemptionsRes.error;

  const offers = (offersRes.data || []).map((row: any) => mapOffer({
    ...row,
    description: '',
    terms_and_conditions: '',
    discount_type: 'custom',
    discount_label: '',
    approval_mode: 'auto',
    audience: 'public',
    total_redeemed: 0,
    per_user_limit: 1,
    public_visible: row.public_visible,
    image_only: false,
    manual_approval_required: false,
    qr_enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const redemptions = (redemptionsRes.data || []).map((row: any) =>
    mapRedemption({
      ...row,
      qr_value: '',
      approval_notes: null,
      approved_at: row.status === 'pending_approval' ? null : row.redeemed_at,
      created_at: row.redeemed_at,
      device_fingerprint: null,
      last_seen_at: null,
      share_url: null,
      image_url: null,
      logo_url: null,
    })
  );

  if (!offers.length && !redemptions.length) return emptyVoucherAnalytics();

  const popularMap = new Map<string, { voucherId: string; title: string; businessName: string; redeemed: number }>();
  const businessMap = new Map<string, { businessName: string; redeemed: number; activeOffers: number }>();
  const trendMap = new Map<string, number>();
  const activeUsers = new Set<string>();

  for (const offer of offers) {
    const business = businessMap.get(offer.businessName) || { businessName: offer.businessName, redeemed: 0, activeOffers: 0 };
    if (offer.status === 'active') business.activeOffers += 1;
    businessMap.set(offer.businessName, business);
  }

  for (const redemption of redemptions) {
    activeUsers.add(redemption.userId);
    const trendKey = format(new Date(redemption.redeemedAt), 'MMM d');
    trendMap.set(trendKey, (trendMap.get(trendKey) || 0) + 1);

    const popular = popularMap.get(redemption.voucherId) || {
      voucherId: redemption.voucherId,
      title: redemption.voucherTitle,
      businessName: redemption.businessName,
      redeemed: 0,
    };
    popular.redeemed += 1;
    popularMap.set(redemption.voucherId, popular);

    const business = businessMap.get(redemption.businessName) || { businessName: redemption.businessName, redeemed: 0, activeOffers: 0 };
    business.redeemed += 1;
    businessMap.set(redemption.businessName, business);
  }

  const trendLabels = Array.from({ length: 7 }, (_, index) => format(subDays(new Date(), 6 - index), 'MMM d'));
  const redemptionTrend = trendLabels.map((label) => ({ label, redemptions: trendMap.get(label) || 0 }));

  return {
    totalRedeemed: redemptions.length,
    activeUsers: activeUsers.size,
    activeVouchers: offers.filter((offer) => offer.status === 'active').length,
    expiringSoon: offers.filter((offer) => offer.closeToExpiry).length,
    usedCount: redemptions.filter((redemption) => redemption.status === 'used').length,
    expiredCount: redemptions.filter((redemption) => redemption.status === 'expired').length,
    pendingApprovals: redemptions.filter((redemption) => redemption.status === 'pending_approval').length,
    redemptionTrend,
    popularVouchers: Array.from(popularMap.values()).sort((left, right) => right.redeemed - left.redeemed).slice(0, 5),
    businessPerformance: Array.from(businessMap.values())
      .map((entry) => ({
        ...entry,
        conversionRate: entry.activeOffers > 0 ? Number((entry.redeemed / entry.activeOffers).toFixed(2)) : 0,
      }))
      .sort((left, right) => right.redeemed - left.redeemed)
      .slice(0, 6),
  };
}

async function fetchUserSnapshot(userId: string) {
  const [userRes, pointsRes, monthlyRes] = await Promise.all([
    supabaseAdmin.from('users').select('uid, email, name, city, town, location, role, winner_tick').eq('uid', userId).maybeSingle(),
    supabaseAdmin.from('users_points').select('total_points').eq('user_id', userId).maybeSingle(),
    supabaseAdmin
      .from(TABLE_MONTHLY_PROGRESS)
      .select('total_activities')
      .eq('user_id', userId)
      .gte('month_start', format(startOfMonth(new Date()), 'yyyy-MM-01'))
      .order('month_start', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (userRes.error && userRes.error.code !== 'PGRST116') throw userRes.error;
  if (pointsRes.error && pointsRes.error.code !== 'PGRST116') throw pointsRes.error;
  if (monthlyRes.error && !isVoucherSetupMissing(monthlyRes.error) && monthlyRes.error.code !== 'PGRST116') throw monthlyRes.error;

  return {
    user: userRes.data,
    totalPoints: Number(pointsRes.data?.total_points || 0),
    totalActivities: Number(monthlyRes.data?.total_activities || 0),
  };
}

async function hasCompetitionWin(userEmail: string | null | undefined) {
  if (!userEmail) return false;
  const { data, error } = await supabaseAdmin
    .from('competition_submissions')
    .select('id')
    .eq('email', userEmail)
    .eq('status', 'approved')
    .limit(1);

  if (error && !isVoucherSetupMissing(error)) {
    return false;
  }

  return Boolean(data && data.length);
}

export async function getVoucherEligibility(params: {
  offer: VoucherOffer;
  userId: string;
  userEmail?: string | null;
  deviceFingerprint?: string | null;
}): Promise<VoucherEligibility> {
  const { offer, userId, userEmail, deviceFingerprint } = params;

  if (offer.status !== 'active') {
    return {
      allowed: false,
      reason: offer.status === 'scheduled' ? 'This voucher is scheduled and cannot be redeemed yet.' : 'This voucher is no longer active.',
      remainingUserRedemptions: null,
      remainingPeriodRedemptions: null,
      manualApprovalRequired: offer.manualApprovalRequired,
    };
  }

  const snapshot = await fetchUserSnapshot(userId);
  const [userCountRes, totalCountRes] = await Promise.all([
    supabaseAdmin.from(TABLE_REDEMPTIONS).select('id', { count: 'exact', head: true }).eq('voucher_id', offer.id).eq('user_id', userId),
    supabaseAdmin.from(TABLE_REDEMPTIONS).select('id', { count: 'exact', head: true }).eq('voucher_id', offer.id),
  ]);

  if (userCountRes.error) throw userCountRes.error;
  if (totalCountRes.error) throw totalCountRes.error;

  const userCount = Number(userCountRes.count || 0);
  const totalCount = Number(totalCountRes.count || 0);

  if (offer.maxRedemptions != null && totalCount >= offer.maxRedemptions) {
    return {
      allowed: false,
      reason: 'This voucher has reached its maximum redemptions.',
      remainingUserRedemptions: Math.max(0, offer.perUserLimit - userCount),
      remainingPeriodRedemptions: null,
      manualApprovalRequired: offer.manualApprovalRequired,
    };
  }

  if (offer.winnersLimit != null && totalCount >= offer.winnersLimit) {
    return {
      allowed: false,
      reason: 'All winner slots for this voucher have been claimed.',
      remainingUserRedemptions: Math.max(0, offer.perUserLimit - userCount),
      remainingPeriodRedemptions: null,
      manualApprovalRequired: offer.manualApprovalRequired,
    };
  }

  if (userCount >= offer.perUserLimit) {
    return {
      allowed: false,
      reason: 'You have already used your available redemptions for this offer.',
      remainingUserRedemptions: 0,
      remainingPeriodRedemptions: null,
      manualApprovalRequired: offer.manualApprovalRequired,
    };
  }

  let remainingPeriodRedemptions: number | null = null;
  if (offer.periodLimit && offer.periodLimitWindow) {
    const periodStart = offer.periodLimitWindow === 'daily'
      ? startOfDay(new Date())
      : offer.periodLimitWindow === 'weekly'
        ? startOfWeek(new Date(), { weekStartsOn: 1 })
        : startOfMonth(new Date());

    const periodRes = await supabaseAdmin
      .from(TABLE_REDEMPTIONS)
      .select('id', { count: 'exact', head: true })
      .eq('voucher_id', offer.id)
      .eq('user_id', userId)
      .gte('redeemed_at', periodStart.toISOString());

    if (periodRes.error) throw periodRes.error;
    const periodCount = Number(periodRes.count || 0);
    remainingPeriodRedemptions = Math.max(0, offer.periodLimit - periodCount);
    if (periodCount >= offer.periodLimit) {
      return {
        allowed: false,
        reason: `You have reached the ${offer.periodLimitWindow} redemption limit for this voucher.`,
        remainingUserRedemptions: Math.max(0, offer.perUserLimit - userCount),
        remainingPeriodRedemptions,
        manualApprovalRequired: offer.manualApprovalRequired,
      };
    }
  }

  if (deviceFingerprint) {
    const deviceRes = await supabaseAdmin
      .from(TABLE_REDEMPTIONS)
      .select('id', { count: 'exact', head: true })
      .eq('voucher_id', offer.id)
      .eq('device_fingerprint', deviceFingerprint)
      .in('status', ['active', 'used', 'pending_approval']);

    if (deviceRes.error) throw deviceRes.error;
    if (Number(deviceRes.count || 0) >= offer.perUserLimit) {
      return {
        allowed: false,
        reason: 'This device has already redeemed this voucher.',
        remainingUserRedemptions: Math.max(0, offer.perUserLimit - userCount),
        remainingPeriodRedemptions,
        manualApprovalRequired: offer.manualApprovalRequired,
      };
    }
  }

  if (offer.audience === 'points' && offer.minPoints != null && snapshot.totalPoints < offer.minPoints) {
    return {
      allowed: false,
      reason: `You need at least ${offer.minPoints} points to unlock this voucher.`,
      remainingUserRedemptions: Math.max(0, offer.perUserLimit - userCount),
      remainingPeriodRedemptions,
      manualApprovalRequired: offer.manualApprovalRequired,
    };
  }

  if (offer.audience === 'activity' && offer.minActivities != null && snapshot.totalActivities < offer.minActivities) {
    return {
      allowed: false,
      reason: `You need ${offer.minActivities} activities this month to unlock this voucher.`,
      remainingUserRedemptions: Math.max(0, offer.perUserLimit - userCount),
      remainingPeriodRedemptions,
      manualApprovalRequired: offer.manualApprovalRequired,
    };
  }

  if (offer.audience === 'competition') {
    const competitionQualified = Boolean(snapshot.user?.winner_tick) || (await hasCompetitionWin(userEmail));
    if (!competitionQualified) {
      return {
        allowed: false,
        reason: 'This offer is reserved for approved competition winners.',
        remainingUserRedemptions: Math.max(0, offer.perUserLimit - userCount),
        remainingPeriodRedemptions,
        manualApprovalRequired: offer.manualApprovalRequired,
      };
    }
  }

  if (offer.audience === 'location' && offer.locationLabel) {
    const locationText = `${snapshot.user?.city || ''} ${snapshot.user?.town || ''} ${snapshot.user?.location || ''}`.toLowerCase();
    if (!locationText.includes(offer.locationLabel.toLowerCase())) {
      return {
        allowed: false,
        reason: `This offer is only available in ${offer.locationLabel}.`,
        remainingUserRedemptions: Math.max(0, offer.perUserLimit - userCount),
        remainingPeriodRedemptions,
        manualApprovalRequired: offer.manualApprovalRequired,
      };
    }
  }

  return {
    allowed: true,
    reason: null,
    remainingUserRedemptions: Math.max(0, offer.perUserLimit - userCount),
    remainingPeriodRedemptions,
    manualApprovalRequired: offer.manualApprovalRequired,
  };
}

export async function createVoucherOffer(input: VoucherFormInput) {
  const normalizedInput = normalizeImageOnlyVoucherInput(input);
  const expiryDate = toRequiredTimestamp(normalizedInput.expiryDate, 'Expiry date');

  if (!normalizedInput.logoUrl?.trim() && !normalizedInput.imageUrl?.trim() && !normalizedInput.bannerUrl?.trim()) {
    throw new Error('At least one image is required (logo, promotional image, or banner).');
  }

  assertJpgVoucherAssets(normalizedInput);

  const now = new Date().toISOString();
  const titleSlug = createVoucherSlug(`${normalizedInput.businessName}-${normalizedInput.title}`) || createVoucherSlug(normalizedInput.title) || `voucher-${Date.now()}`;
  const payload = {
    slug: titleSlug,
    title: normalizedInput.title,
    business_name: normalizedInput.businessName,
    description: normalizedInput.description,
    terms_and_conditions: normalizedInput.termsAndConditions,
    expiry_date: expiryDate,
    start_date: normalizedInput.startDate || null,
    status: normalizedInput.active ? 'active' : 'inactive',
    approval_mode: normalizedInput.approvalMode,
    audience: normalizedInput.audience,
    discount_type: normalizedInput.discountType,
    discount_label: normalizedInput.discountLabel,
    logo_url: normalizedInput.logoUrl || null,
    image_url: normalizedInput.imageUrl || null,
    banner_url: normalizedInput.bannerUrl || null,
    location_label: normalizedInput.locationLabel || null,
    winners_limit: normalizedInput.winnersLimit,
    max_redemptions: normalizedInput.maxRedemptions,
    per_user_limit: normalizedInput.perUserLimit,
    period_limit: normalizedInput.periodLimit,
    period_limit_window: normalizedInput.periodLimitWindow,
    min_points: normalizedInput.minPoints,
    min_activities: normalizedInput.minActivities,
    public_visible: normalizedInput.publicVisible,
    image_only: normalizedInput.imageOnly,
    manual_approval_required: normalizedInput.manualApprovalRequired || normalizedInput.approvalMode === 'manual',
    featured: normalizedInput.featured,
    qr_enabled: normalizedInput.qrEnabled,
    total_redeemed: 0,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabaseAdmin.from(TABLE_VOUCHERS).insert(payload).select('*').single();
  if (error) throw error;

  await logVoucherAction({
    action: 'voucher.created',
    actor: 'admin',
    targetType: 'voucher',
    targetId: String(data.id),
    details: `${data.business_name} - ${data.title}`,
  });

  if (payload.public_visible) {
    await createVoucherNotification({
      type: 'new_voucher',
      title: `New reward: ${data.title}`,
      body: `${data.business_name} has launched a new reward in the app.`,
      voucherId: String(data.id),
    });
  }

  return mapOffer(data);
}

export async function updateVoucherOffer(id: string, input: VoucherFormInput) {
  const normalizedInput = normalizeImageOnlyVoucherInput(input);
  const expiryDate = toRequiredTimestamp(normalizedInput.expiryDate, 'Expiry date');

  if (!normalizedInput.logoUrl?.trim() && !normalizedInput.imageUrl?.trim() && !normalizedInput.bannerUrl?.trim()) {
    throw new Error('At least one image is required (logo, promotional image, or banner).');
  }

  assertJpgVoucherAssets(normalizedInput);

  const payload = {
    title: normalizedInput.title,
    business_name: normalizedInput.businessName,
    description: normalizedInput.description,
    terms_and_conditions: normalizedInput.termsAndConditions,
    expiry_date: expiryDate,
    start_date: normalizedInput.startDate || null,
    status: normalizedInput.active ? 'active' : 'inactive',
    approval_mode: normalizedInput.approvalMode,
    audience: normalizedInput.audience,
    discount_type: normalizedInput.discountType,
    discount_label: normalizedInput.discountLabel,
    logo_url: normalizedInput.logoUrl || null,
    image_url: normalizedInput.imageUrl || null,
    banner_url: normalizedInput.bannerUrl || null,
    location_label: normalizedInput.locationLabel || null,
    winners_limit: normalizedInput.winnersLimit,
    max_redemptions: normalizedInput.maxRedemptions,
    per_user_limit: normalizedInput.perUserLimit,
    period_limit: normalizedInput.periodLimit,
    period_limit_window: normalizedInput.periodLimitWindow,
    min_points: normalizedInput.minPoints,
    min_activities: normalizedInput.minActivities,
    public_visible: normalizedInput.publicVisible,
    image_only: normalizedInput.imageOnly,
    manual_approval_required: normalizedInput.manualApprovalRequired || normalizedInput.approvalMode === 'manual',
    featured: normalizedInput.featured,
    qr_enabled: normalizedInput.qrEnabled,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin.from(TABLE_VOUCHERS).update(payload).eq('id', id).select('*').single();
  if (error) throw error;

  await logVoucherAction({
    action: 'voucher.updated',
    actor: 'admin',
    targetType: 'voucher',
    targetId: String(data.id),
    details: `${data.business_name} - ${data.title}`,
  });

  return mapOffer(data);
}

export async function deleteVoucherOffer(id: string) {
  const { error } = await supabaseAdmin.from(TABLE_VOUCHERS).delete().eq('id', id);
  if (error) throw error;

  await logVoucherAction({
    action: 'voucher.deleted',
    actor: 'admin',
    targetType: 'voucher',
    targetId: id,
    details: 'Voucher deleted from admin dashboard',
  });
}

export async function redeemVoucher(params: {
  voucherId: string;
  userId: string;
  userEmail?: string | null;
  deviceFingerprint?: string | null;
  shareUrl?: string | null;
}) {
  const { data: voucherRow, error: voucherError } = await supabaseAdmin
    .from(TABLE_VOUCHERS)
    .select('*')
    .eq('id', params.voucherId)
    .single();

  if (voucherError) throw voucherError;

  const offer = mapOffer(voucherRow);
  const eligibility = await getVoucherEligibility({
    offer,
    userId: params.userId,
    userEmail: params.userEmail,
    deviceFingerprint: params.deviceFingerprint,
  });

  if (!eligibility.allowed) {
    const error = new Error(eligibility.reason || 'Not eligible to redeem');
    (error as any).status = 403;
    throw error;
  }

  const redeemedAt = new Date();
  const expiresAt = addHours(redeemedAt, VOUCHER_ACTIVE_HOURS).toISOString();
  const status: RedemptionStatus = offer.manualApprovalRequired ? 'pending_approval' : 'active';
  const voucherCode = generateSecureVoucherCode();
  const qrValue = offer.qrEnabled
    ? toQrValue({ id: voucherCode, voucherId: offer.id, voucherCode, expiresAt })
    : '';

  const { data, error } = await supabaseAdmin
    .from(TABLE_REDEMPTIONS)
    .insert({
      voucher_id: offer.id,
      user_id: params.userId,
      business_name: offer.businessName,
      voucher_title: offer.title,
      voucher_code: voucherCode,
      qr_value: qrValue,
      status,
      redeemed_at: redeemedAt.toISOString(),
      expires_at: expiresAt,
      approved_at: offer.manualApprovalRequired ? null : redeemedAt.toISOString(),
      approval_notes: null,
      used_at: null,
      device_fingerprint: params.deviceFingerprint || null,
      share_url: params.shareUrl || null,
      image_url: offer.imageUrl,
      logo_url: offer.logoUrl,
      last_seen_at: redeemedAt.toISOString(),
    })
    .select('*')
    .single();

  if (error) throw error;

  await supabaseAdmin
    .from(TABLE_VOUCHERS)
    .update({ total_redeemed: Number(voucherRow.total_redeemed || 0) + 1, updated_at: new Date().toISOString() })
    .eq('id', offer.id);

  await createVoucherNotification({
    type: 'voucher_redeemed',
    title: `${offer.title} redeemed`,
    body: `${offer.businessName} voucher redeemed by a user.`,
    voucherId: offer.id,
    userId: params.userId,
  });

  await logVoucherAction({
    action: 'redemption.created',
    actor: 'user',
    actorId: params.userId,
    targetType: 'redemption',
    targetId: String(data.id),
    details: `${offer.title} -> ${voucherCode}`,
  });

  return mapRedemption(data);
}

export async function updateRedemptionStatus(params: {
  redemptionId: string;
  action: 'approve' | 'mark_used' | 'cancel';
  notes?: string;
  actorId?: string | null;
}) {
  const { data: current, error: currentError } = await supabaseAdmin
    .from(TABLE_REDEMPTIONS)
    .select('*')
    .eq('id', params.redemptionId)
    .single();

  if (currentError) throw currentError;

  const isExpiredNow = new Date(current.expires_at).getTime() <= Date.now();
  if (isExpiredNow && (params.action === 'approve' || params.action === 'mark_used')) {
    throw new Error('This voucher has expired after 24 hours and cannot be approved or used.');
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    approval_notes: params.notes || null,
    last_seen_at: now,
  };

  if (params.action === 'approve') {
    patch.status = 'active';
    patch.approved_at = now;
  }
  if (params.action === 'mark_used') {
    patch.status = 'used';
    patch.used_at = now;
    patch.approved_at = current.approved_at || now;
  }
  if (params.action === 'cancel') {
    patch.status = 'cancelled';
  }

  const { data, error } = await supabaseAdmin
    .from(TABLE_REDEMPTIONS)
    .update(patch)
    .eq('id', params.redemptionId)
    .select('*')
    .single();

  if (error) throw error;

  if (params.action === 'approve') {
    await createVoucherNotification({
      type: 'voucher_approved',
      title: 'Voucher approved',
      body: `${current.voucher_title} has been approved and is now ready to use.`,
      voucherId: String(current.voucher_id),
      userId: String(current.user_id),
    });
  }

  await logVoucherAction({
    action: `redemption.${params.action}`,
    actor: 'admin',
    actorId: params.actorId || null,
    targetType: 'redemption',
    targetId: params.redemptionId,
    details: `${current.voucher_title} -> ${params.action}`,
  });

  return mapRedemption(data);
}

export async function grantVoucherToUser(params: {
  voucherId: string;
  userId: string;
  actorId?: string | null;
  notes?: string | null;
}) {
  const { data: voucherRow, error: voucherError } = await supabaseAdmin
    .from(TABLE_VOUCHERS)
    .select('*')
    .eq('id', params.voucherId)
    .single();

  if (voucherError) throw voucherError;

  const offer = mapOffer(voucherRow);
  if (offer.status === 'inactive' || offer.status === 'expired') {
    throw new Error('This voucher is not active and cannot be assigned.');
  }

  const { data: userRow, error: userError } = await supabaseAdmin
    .from('users')
    .select('uid')
    .eq('uid', params.userId)
    .maybeSingle();

  if (userError) throw userError;
  if (!userRow?.uid) {
    throw new Error('Selected user was not found.');
  }

  const redeemedAt = new Date();
  const expiresAt = addHours(redeemedAt, VOUCHER_ACTIVE_HOURS).toISOString();
  const status: RedemptionStatus = offer.manualApprovalRequired ? 'pending_approval' : 'active';
  const voucherCode = generateSecureVoucherCode();
  const qrValue = offer.qrEnabled
    ? toQrValue({ id: voucherCode, voucherId: offer.id, voucherCode, expiresAt })
    : '';

  const { data, error } = await supabaseAdmin
    .from(TABLE_REDEMPTIONS)
    .insert({
      voucher_id: offer.id,
      user_id: params.userId,
      business_name: offer.businessName,
      voucher_title: offer.title,
      voucher_code: voucherCode,
      qr_value: qrValue,
      status,
      redeemed_at: redeemedAt.toISOString(),
      expires_at: expiresAt,
      approved_at: offer.manualApprovalRequired ? null : redeemedAt.toISOString(),
      approval_notes: params.notes || null,
      used_at: null,
      device_fingerprint: null,
      share_url: null,
      image_url: offer.imageUrl,
      logo_url: offer.logoUrl,
      last_seen_at: redeemedAt.toISOString(),
    })
    .select('*')
    .single();

  if (error) throw error;

  await supabaseAdmin
    .from(TABLE_VOUCHERS)
    .update({ total_redeemed: Number(voucherRow.total_redeemed || 0) + 1, updated_at: new Date().toISOString() })
    .eq('id', offer.id);

  await createVoucherNotification({
    type: 'voucher_approved',
    title: `Voucher assigned: ${offer.title}`,
    body: `A voucher has been assigned by admin and is ready in your rewards area.`,
    voucherId: offer.id,
    userId: params.userId,
  });

  await logVoucherAction({
    action: 'redemption.granted_by_admin',
    actor: 'admin',
    actorId: params.actorId || null,
    targetType: 'redemption',
    targetId: String(data.id),
    details: `${offer.title} -> ${params.userId}`,
  });

  return mapRedemption(data);
}