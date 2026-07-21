import { getScoreWeekRangeUtc } from '@/lib/weekly-score-core';

export type SpinWheelReward = {
  key: string;
  label: string;
  weeklyLimit: number;
  color: string;
};

export const SPIN_WHEEL_REWARDS: SpinWheelReward[] = [
  { key: 'juice4-life', label: 'Juice4 Life', weeklyLimit: 2, color: '#f59e0b' },
  { key: 'grubbins-eat-out', label: 'Grubbins Eat Out', weeklyLimit: 2, color: '#ef4444' },
  { key: 'asli-zaiqa', label: 'Asli Zaiqa', weeklyLimit: 2, color: '#22c55e' },
  { key: 'spin-pin', label: 'Spin Pin', weeklyLimit: 2, color: '#14b8a6' },
  { key: 'munch-out-takeaway', label: 'Munch Out Takeaway', weeklyLimit: 2, color: '#06b6d4' },
  { key: 'al-qasswah', label: 'Al Qasswah', weeklyLimit: 2, color: '#ec4899' },
  { key: 'grubbins', label: 'Grubbins', weeklyLimit: 2, color: '#f97316' },
];

export function getSpinWheelReward(key: string): SpinWheelReward | undefined {
  return SPIN_WHEEL_REWARDS.find((reward) => reward.key === key);
}

export function getCurrentSpinWeekStart(date = new Date()): string {
  return getScoreWeekRangeUtc(date).weekStartDate;
}

export function getAvailableRewardKeys(
  claimCounts: Record<string, number>
): SpinWheelReward[] {
  return SPIN_WHEEL_REWARDS.filter((reward) => {
    const claimed = claimCounts[reward.key] ?? 0;
    return claimed < reward.weeklyLimit;
  });
}

export function buildDefaultRewardSlots(claimCounts: Record<string, number> = {}) {
  return SPIN_WHEEL_REWARDS.map((reward) => ({
    key: reward.key,
    label: reward.label,
    color: reward.color,
    weeklyLimit: reward.weeklyLimit,
    claimedCount: claimCounts[reward.key] ?? 0,
    remaining: Math.max(0, reward.weeklyLimit - (claimCounts[reward.key] ?? 0)),
    available: (claimCounts[reward.key] ?? 0) < reward.weeklyLimit,
  }));
}

export function buildFallbackSpinStatus() {
  return {
    weekStartDate: getCurrentSpinWeekStart(),
    isWinner: false,
    canSpin: false,
    hasSpun: false,
    spin: null,
    rewards: buildDefaultRewardSlots(),
  };
}

export function pickRandomReward(available: SpinWheelReward[]): SpinWheelReward | null {
  if (!available.length) return null;
  const index = Math.floor(Math.random() * available.length);
  return available[index] ?? null;
}
