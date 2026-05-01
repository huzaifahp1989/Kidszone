export const TEST_MODE_EMAIL = 'huzaify786@gmail.com'

export function isTestModeEmail(email: string | null | undefined): boolean {
  return String(email || '').trim().toLowerCase() === TEST_MODE_EMAIL
}
