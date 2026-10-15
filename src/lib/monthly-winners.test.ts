import { describe, expect, it } from 'vitest';
import {
  formatMonthlyWinnerMonth,
  getMonthlyWinnerArchiveMonths,
  validateMonthlyWinnerInput,
} from './monthly-winners';

const completeWinner = () => ({
  monthKey: '2026-10',
  firstName: 'Aisha',
  ageBracket: '8-10',
  city: 'London',
  parentGuardianConsent: true,
  isPublished: false,
});

describe('monthly winners', () => {
  it('validates minimal, parent-approved public winner details', () => {
    const result = validateMonthlyWinnerInput(completeWinner());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.winner).toEqual({
        ...completeWinner(),
        parentGuardianConsent: true,
      });
    }
  });

  it('rejects missing guardian approval, invalid months, and invalid age brackets', () => {
    expect(validateMonthlyWinnerInput({ ...completeWinner(), parentGuardianConsent: false }).ok).toBe(false);
    expect(validateMonthlyWinnerInput({ ...completeWinner(), monthKey: '2026-13' }).ok).toBe(false);
    expect(validateMonthlyWinnerInput({ ...completeWinner(), ageBracket: '10' }).ok).toBe(false);
  });

  it('formats months and includes the current month in the archive', () => {
    expect(formatMonthlyWinnerMonth('2026-10')).toBe('October 2026');
    expect(getMonthlyWinnerArchiveMonths(new Date('2026-11-12T12:00:00.000Z'))).toEqual([
      '2026-11',
      '2026-10',
    ]);
  });
});
