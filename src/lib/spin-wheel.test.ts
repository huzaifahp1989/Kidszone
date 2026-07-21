import { describe, expect, it } from 'vitest';
import {
  getAvailableRewardKeys,
  pickRandomReward,
  SPIN_WHEEL_REWARDS,
} from '@/lib/spin-wheel';

describe('spin wheel rewards', () => {
  it('includes all configured partner rewards', () => {
    const labels = SPIN_WHEEL_REWARDS.map((reward) => reward.label);
    expect(labels).toContain('Juice4 Life');
    expect(labels).toContain('Grubbins Eat Out');
    expect(labels).toContain('Grubbins');
    expect(labels).toContain('Al Qasswah');
  });

  it('filters rewards that reached the weekly limit', () => {
    const available = getAvailableRewardKeys({
      'juice4-life': 2,
      'grubbins-eat-out': 1,
      'asli-zaiqa': 0,
    });

    expect(available.some((reward) => reward.key === 'juice4-life')).toBe(false);
    expect(available.some((reward) => reward.key === 'grubbins-eat-out')).toBe(true);
    expect(available.some((reward) => reward.key === 'asli-zaiqa')).toBe(true);
  });

  it('picks only from available rewards', () => {
    const available = getAvailableRewardKeys({ 'juice4-life': 2 });
    const picked = pickRandomReward(available);
    expect(picked?.key).not.toBe('juice4-life');
  });
});
