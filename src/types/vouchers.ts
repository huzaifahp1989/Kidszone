export type VoucherDiscountType = 'percentage' | 'fixed' | 'free_item' | 'buffet' | 'custom';

export type VoucherApprovalMode = 'auto' | 'manual';

export type VoucherAudience = 'public' | 'points' | 'activity' | 'competition' | 'kids_zone' | 'location';

export type VoucherStatus = 'draft' | 'scheduled' | 'active' | 'expired' | 'inactive';

export type RedemptionStatus = 'active' | 'used' | 'expired' | 'pending_approval' | 'cancelled';

export type NotificationKind = 'new_voucher' | 'expiring_soon' | 'voucher_redeemed' | 'voucher_approved';

export type VoucherLimitPeriod = 'daily' | 'weekly' | 'monthly';

export type VoucherOffer = {
  id: string;
  slug: string;
  title: string;
  businessName: string;
  description: string;
  termsAndConditions: string;
  expiryDate: string;
  startDate: string | null;
  status: VoucherStatus;
  approvalMode: VoucherApprovalMode;
  audience: VoucherAudience;
  discountType: VoucherDiscountType;
  discountLabel: string;
  logoUrl: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  locationLabel: string | null;
  winnersLimit: number | null;
  totalRedeemed: number;
  maxRedemptions: number | null;
  perUserLimit: number;
  periodLimit: number | null;
  periodLimitWindow: VoucherLimitPeriod | null;
  minPoints: number | null;
  minActivities: number | null;
  publicVisible: boolean;
  imageOnly: boolean;
  manualApprovalRequired: boolean;
  featured: boolean;
  closeToExpiry: boolean;
  qrEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type VoucherRedemption = {
  id: string;
  voucherId: string;
  voucherTitle: string;
  businessName: string;
  voucherCode: string;
  qrValue: string;
  status: RedemptionStatus;
  redeemedAt: string;
  expiresAt: string;
  usedAt: string | null;
  approvedAt: string | null;
  approvalNotes: string | null;
  userId: string;
  deviceFingerprint: string | null;
  lastSeenAt: string | null;
  shareUrl: string | null;
  imageUrl: string | null;
  logoUrl: string | null;
};

export type VoucherGalleryItem = {
  id: string;
  voucherId: string;
  title: string;
  imageUrl: string;
  businessName: string;
  expiryDate: string;
  publicVisible: boolean;
  redeemable: boolean;
};

export type VoucherNotification = {
  id: string;
  type: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  voucherId: string | null;
  userId: string | null;
};

export type VoucherAdminLog = {
  id: string;
  action: string;
  actor: string;
  actorId: string | null;
  targetType: 'voucher' | 'redemption' | 'notification' | 'gallery';
  targetId: string;
  details: string;
  createdAt: string;
};

export type VoucherAnalytics = {
  totalRedeemed: number;
  activeUsers: number;
  activeVouchers: number;
  expiringSoon: number;
  usedCount: number;
  expiredCount: number;
  pendingApprovals: number;
  redemptionTrend: Array<{ label: string; redemptions: number }>;
  popularVouchers: Array<{ voucherId: string; title: string; businessName: string; redeemed: number }>;
  businessPerformance: Array<{ businessName: string; redeemed: number; activeOffers: number; conversionRate: number }>;
};

export type VoucherEligibility = {
  allowed: boolean;
  reason: string | null;
  remainingUserRedemptions: number | null;
  remainingPeriodRedemptions: number | null;
  manualApprovalRequired: boolean;
};

export type VoucherDashboardResponse = {
  offers: VoucherOffer[];
  history: VoucherRedemption[];
  gallery: VoucherGalleryItem[];
  analytics: VoucherAnalytics;
  notifications: VoucherNotification[];
};

export type VoucherFormInput = {
  id?: string;
  title: string;
  businessName: string;
  description: string;
  termsAndConditions: string;
  expiryDate: string;
  startDate: string;
  discountType: VoucherDiscountType;
  discountLabel: string;
  approvalMode: VoucherApprovalMode;
  audience: VoucherAudience;
  logoUrl: string;
  imageUrl: string;
  bannerUrl: string;
  locationLabel: string;
  winnersLimit: number | null;
  maxRedemptions: number | null;
  perUserLimit: number;
  periodLimit: number | null;
  periodLimitWindow: VoucherLimitPeriod | null;
  minPoints: number | null;
  minActivities: number | null;
  publicVisible: boolean;
  imageOnly: boolean;
  manualApprovalRequired: boolean;
  featured: boolean;
  qrEnabled: boolean;
  active: boolean;
};