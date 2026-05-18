import { addHours, formatDistanceToNowStrict, isAfter, isBefore, parseISO } from 'date-fns';
import type {
  RedemptionStatus,
  VoucherAnalytics,
  VoucherEligibility,
  VoucherFormInput,
  VoucherOffer,
  VoucherRedemption,
  VoucherStatus,
} from '@/types/vouchers';

export const VOUCHER_ACTIVE_HOURS = 24;

export const createVoucherSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export const generateVoucherCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let body = '';
  for (let index = 0; index < 6; index += 1) {
    body += chars[Math.floor(Math.random() * chars.length)];
  }
  return `IMC-${body}`;
};

export const getVoucherStatus = (offer: Pick<VoucherOffer, 'status' | 'startDate' | 'expiryDate' | 'publicVisible'>): VoucherStatus => {
  if (!offer.publicVisible || offer.status === 'inactive') return 'inactive';

  const now = new Date();
  const startDate = offer.startDate ? parseISO(offer.startDate) : null;
  const expiryDate = parseISO(offer.expiryDate);

  if (isBefore(now, expiryDate) && startDate && isBefore(now, startDate)) {
    return 'scheduled';
  }

  if (isAfter(now, expiryDate)) {
    return 'expired';
  }

  return 'active';
};

export const isCloseToExpiry = (expiryDate: string, hours = 48) => {
  const now = new Date();
  const expiry = parseISO(expiryDate);
  return isBefore(now, expiry) && isBefore(expiry, addHours(now, hours));
};

export const getRedemptionStatus = (redemption: Pick<VoucherRedemption, 'status' | 'expiresAt' | 'usedAt' | 'approvedAt'>): RedemptionStatus => {
  if (redemption.usedAt) return 'used';
  if (redemption.status === 'cancelled') return 'cancelled';
  if (!redemption.approvedAt && redemption.status === 'pending_approval') return 'pending_approval';
  if (isAfter(new Date(), parseISO(redemption.expiresAt))) return 'expired';
  return 'active';
};

export const getExpiryCountdown = (expiryDate: string) => {
  const expiry = parseISO(expiryDate);
  if (isAfter(new Date(), expiry)) return 'Expired';
  return formatDistanceToNowStrict(expiry, { addSuffix: true });
};

export const toQrValue = (redemption: Pick<VoucherRedemption, 'voucherCode' | 'voucherId' | 'id' | 'expiresAt'>) =>
  JSON.stringify({
    type: 'imc-voucher',
    redemptionId: redemption.id,
    voucherId: redemption.voucherId,
    code: redemption.voucherCode,
    expiresAt: redemption.expiresAt,
  });

export const emptyVoucherAnalytics = (): VoucherAnalytics => ({
  totalRedeemed: 0,
  activeUsers: 0,
  activeVouchers: 0,
  expiringSoon: 0,
  usedCount: 0,
  expiredCount: 0,
  pendingApprovals: 0,
  redemptionTrend: [],
  popularVouchers: [],
  businessPerformance: [],
});

export const defaultVoucherForm = (): VoucherFormInput => ({
  title: '',
  businessName: '',
  description: '',
  termsAndConditions: '',
  expiryDate: '',
  startDate: '',
  discountType: 'percentage',
  discountLabel: '',
  approvalMode: 'auto',
  audience: 'public',
  logoUrl: '',
  imageUrl: '',
  bannerUrl: '',
  locationLabel: '',
  winnersLimit: null,
  maxRedemptions: null,
  perUserLimit: 1,
  periodLimit: null,
  periodLimitWindow: null,
  minPoints: null,
  minActivities: null,
  publicVisible: true,
  imageOnly: false,
  manualApprovalRequired: false,
  featured: false,
  qrEnabled: true,
  active: true,
});

export const buildEligibilityMessage = (eligibility: VoucherEligibility) => {
  if (eligibility.allowed) return 'Ready to redeem';
  return eligibility.reason || 'This voucher is not available for your account yet.';
};