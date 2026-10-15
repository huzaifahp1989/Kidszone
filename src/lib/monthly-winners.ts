export const MONTHLY_WINNER_AGE_BRACKETS = ['5-7', '8-10', '11-12', '13-14'] as const;

export type MonthlyWinnerAgeBracket = (typeof MONTHLY_WINNER_AGE_BRACKETS)[number];

export type MonthlyWinner = {
  id: string;
  month_key: string;
  first_name: string;
  age_bracket: MonthlyWinnerAgeBracket;
  city: string;
};

export type AdminMonthlyWinner = MonthlyWinner & {
  parent_guardian_consent: boolean;
  is_published: boolean;
  created_at: string;
};

export type MonthlyWinnerInput = {
  monthKey: string;
  firstName: string;
  ageBracket: MonthlyWinnerAgeBracket;
  city: string;
  parentGuardianConsent: true;
  isPublished: boolean;
};

type ValidationResult =
  | { ok: true; winner: MonthlyWinnerInput }
  | { ok: false; error: string };

export function isValidMonthKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return false;
  const date = new Date(`${value}-01T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 7) === value;
}

export function validateMonthlyWinnerInput(value: unknown): ValidationResult {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, error: 'Enter the winner details.' };
  }

  const input = value as Record<string, unknown>;
  const monthKey = input.monthKey;
  const firstName = typeof input.firstName === 'string' ? input.firstName.trim().replace(/\s+/g, ' ') : '';
  const ageBracket = input.ageBracket;
  const city = typeof input.city === 'string' ? input.city.trim().replace(/\s+/g, ' ') : '';

  if (!isValidMonthKey(monthKey)) {
    return { ok: false, error: 'Choose a valid competition month.' };
  }
  if (!firstName || firstName.length > 40 || /[\r\n]/.test(firstName)) {
    return { ok: false, error: 'Enter a first name of up to 40 characters.' };
  }
  if (!MONTHLY_WINNER_AGE_BRACKETS.includes(ageBracket as MonthlyWinnerAgeBracket)) {
    return { ok: false, error: 'Choose a valid age bracket.' };
  }
  if (!city || city.length > 100 || /[\r\n]/.test(city)) {
    return { ok: false, error: 'Enter a city of up to 100 characters.' };
  }
  if (input.parentGuardianConsent !== true) {
    return { ok: false, error: 'Parent or guardian approval is required before publishing a child’s details.' };
  }
  if (input.isPublished !== undefined && typeof input.isPublished !== 'boolean') {
    return { ok: false, error: 'Choose whether this winner should be published.' };
  }

  return {
    ok: true,
    winner: {
      monthKey,
      firstName,
      ageBracket: ageBracket as MonthlyWinnerAgeBracket,
      city,
      parentGuardianConsent: true,
      isPublished: input.isPublished === true,
    },
  };
}

export function formatMonthlyWinnerMonth(monthKey: string): string {
  if (!isValidMonthKey(monthKey)) return monthKey;
  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${monthKey}-01T00:00:00.000Z`));
}

export function getMonthlyWinnerArchiveMonths(
  now = new Date(),
  firstMonth = '2026-10',
  publishedMonthKeys: string[] = []
): string[] {
  const currentMonth = now.toISOString().slice(0, 7);
  const months = new Set(publishedMonthKeys.filter(isValidMonthKey));

  if (isValidMonthKey(firstMonth) && firstMonth <= currentMonth) {
    const cursor = new Date(`${firstMonth}-01T00:00:00.000Z`);
    while (cursor.toISOString().slice(0, 7) <= currentMonth) {
      months.add(cursor.toISOString().slice(0, 7));
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  }

  months.add(currentMonth);
  return [...months].sort((left, right) => right.localeCompare(left));
}
