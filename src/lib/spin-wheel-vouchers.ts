import { SPIN_WHEEL_REWARDS } from '@/lib/spin-wheel';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { grantVoucherToUser } from '@/lib/voucher-server';

const REWARD_SLUG_HINTS: Record<string, string[]> = {
  'juice4-life': ['juice4', 'juice-4', 'juice4-life'],
  'grubbins-eat-out': ['grubbins-eat', 'grubbins eat', 'eat-out'],
  'asli-zaiqa': ['asli-zaiqa', 'asli zaiqa', 'zaiqa'],
  'spin-pin': ['spin-pin', 'spin pin'],
  'munch-out-takeaway': ['munch-out', 'munch out'],
  'al-qasswah': ['al-qasswah', 'qasswah', 'al qasswah'],
  grubbins: ['grubbins'],
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

async function findVoucherForReward(rewardKey: string, rewardLabel: string) {
  const { data: offers, error } = await supabaseAdmin
    .from('business_vouchers')
    .select('id, slug, title, business_name, status')
    .in('status', ['active', 'scheduled']);

  if (error) {
    if (error.code === '42P01') return null;
    throw error;
  }

  const hints = [
    ...(REWARD_SLUG_HINTS[rewardKey] || []),
    rewardKey,
    rewardLabel,
  ].map(normalize);

  for (const offer of offers || []) {
    const slug = normalize(String(offer.slug || ''));
    const title = normalize(String(offer.title || ''));
    const business = normalize(String(offer.business_name || ''));
    const haystack = `${slug} ${title} ${business}`;
    if (hints.some((hint) => hint && haystack.includes(hint))) {
      return String(offer.id);
    }
  }

  const reward = SPIN_WHEEL_REWARDS.find((item) => item.key === rewardKey);
  if (reward) {
    const labelNorm = normalize(reward.label);
    for (const offer of offers || []) {
      const business = normalize(String(offer.business_name || ''));
      if (business && labelNorm.includes(business)) {
        return String(offer.id);
      }
    }
  }

  return null;
}

export async function grantSpinWheelVoucher(params: {
  userId: string;
  rewardKey: string;
  rewardLabel: string;
}) {
  const voucherId = await findVoucherForReward(params.rewardKey, params.rewardLabel);
  if (!voucherId) {
    return { ok: false as const, reason: 'no_matching_voucher' as const };
  }

  try {
    const redemption = await grantVoucherToUser({
      voucherId,
      userId: params.userId,
      notes: `Spin wheel prize: ${params.rewardLabel}`,
    });
    return { ok: true as const, redemption };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'grant failed';
    if (/already|limit|duplicate/i.test(message)) {
      return { ok: false as const, reason: 'already_has_voucher' as const, message };
    }
    throw error;
  }
}
