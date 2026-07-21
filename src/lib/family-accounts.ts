import { validateUsername } from '@/lib/utils';

export const MAX_FAMILY_MEMBERS = 6;

export type FamilyMemberSummary = {
  uid: string;
  username: string;
  name: string;
  age: number;
  authEmail: string;
  familyEmail: string;
};

export type FamilyMemberPublic = {
  username: string;
  name: string;
  age: number;
};

export function normalizeUsername(raw: string): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

export function normalizeFamilyEmail(raw: string): string {
  return String(raw || '').trim().toLowerCase();
}

export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

/** Alias used by auth resolve routes. */
export function isEmailLike(value: string): boolean {
  return looksLikeEmail(value);
}

export function isValidUsername(raw: string): boolean {
  const username = normalizeUsername(raw);
  return Boolean(username) && validateUsername(username);
}

export function assertValidUsername(
  raw: string
): { ok: true; username: string } | { ok: false; error: string } {
  const username = normalizeUsername(raw);
  if (!username) return { ok: false, error: 'Please choose a username.' };
  if (!validateUsername(username)) {
    return {
      ok: false,
      error: 'Username must be 3–20 characters and use only letters, numbers, or underscores.',
    };
  }
  return { ok: true, username };
}

export function sanitizeUsernameForEmailLocal(username: string): string {
  return normalizeUsername(username).replace(/[^a-z0-9_]/g, '').slice(0, 32) || 'kid';
}

/**
 * Build a unique Auth email for a sibling while keeping the parent's family email
 * as the shared login identity. Prefers plus-addressing when the provider allows it.
 */
export function buildSiblingAuthEmail(familyEmail: string, username: string): string {
  const email = normalizeFamilyEmail(familyEmail);
  const at = email.lastIndexOf('@');
  if (at <= 0) {
    throw new Error('Invalid family email.');
  }
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const tag = sanitizeUsernameForEmailLocal(username);
  return `${local}+${tag}@${domain}`;
}

/** Alias used by family members API. */
export function createSiblingAuthEmail(familyEmail: string, username: string): string {
  return buildSiblingAuthEmail(familyEmail, username);
}

export function parseAge(value: unknown): number | null {
  const n = typeof value === 'number' ? value : parseInt(String(value ?? '').trim(), 10);
  if (!Number.isFinite(n) || Number.isNaN(n)) return null;
  if (n < 1 || n > 120) return null;
  return Math.floor(n);
}

function mapMemberRow(row: Record<string, unknown>): FamilyMemberSummary {
  return {
    uid: String(row.uid || ''),
    username: normalizeUsername(String(row.username || '')),
    name: String(row.name || 'Friend'),
    age: typeof row.age === 'number' ? row.age : Number(row.age) || 0,
    authEmail: normalizeFamilyEmail(String(row.email || '')),
    familyEmail: normalizeFamilyEmail(String(row.family_email || row.email || '')),
  };
}

/**
 * List learners linked to a family email (by family_email or legacy email match).
 */
export async function listFamilyMembers(familyEmail: string): Promise<FamilyMemberSummary[]> {
  const email = normalizeFamilyEmail(familyEmail);
  if (!email) return [];

  // Load admin client dynamically to avoid bundling server-only admin client into the
  // browser build. This file exports helpers used on both server and client so we
  // only import the admin client when running server-side functions.
  // Quote values so plus-address emails (parent+kid@…) parse correctly in PostgREST filters.
  const { supabaseAdmin } = await import('@/lib/supabase-admin');
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('uid, username, name, age, email, family_email')
    .or(`family_email.eq."${email}",email.eq."${email}"`);

  if (error) {
    if (error.code === '42703') {
      // Columns not migrated yet — fall back to email-only match.
      const { data: legacy } = await supabaseAdmin
        .from('users')
        .select('uid, name, age, email')
        .eq('email', email);
      return (legacy || []).map((row) =>
        mapMemberRow({
          ...row,
          username: '',
          family_email: email,
        })
      );
    }
    throw error;
  }

  const byUid = new Map<string, FamilyMemberSummary>();
  for (const row of data || []) {
    const member = mapMemberRow(row as Record<string, unknown>);
    if (!member.uid) continue;
    byUid.set(member.uid, member);
  }
  return Array.from(byUid.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function countFamilyMembers(familyEmail: string): Promise<number> {
  const members = await listFamilyMembers(familyEmail);
  return members.length;
}
