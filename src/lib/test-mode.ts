/**
 * Admin/dev account: hidden from public leaderboards only.
 * Points ARE awarded so quiz/game totals update normally for this signed-in user.
 */
export const TEST_MODE_EMAIL = 'huzaify786@gmail.com'

export function isTestModeEmail(email: string | null | undefined): boolean {
  return String(email || '').trim().toLowerCase() === TEST_MODE_EMAIL
}

/** @deprecated Prefer awarding points; test mode only hides from leaderboards. */
export function shouldSkipPointsForTestMode(_email?: string | null): boolean {
  return false
}
