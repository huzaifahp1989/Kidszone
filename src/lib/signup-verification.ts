import crypto from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { resolveServiceRoleKey } from '@/lib/supabase-server-secrets';
import { isValidUsername, normalizeFamilyEmail, normalizeUsername } from '@/lib/family-accounts';

/** How long an emailed signup code stays valid. */
export const SIGNUP_CODE_TTL_MS = 15 * 60 * 1000;
export const SIGNUP_CODE_LENGTH = 6;
/** Wrong-code attempts allowed before the code must be re-requested. */
export const MAX_VERIFY_ATTEMPTS = 5;
/** Minimum gap between code emails to the same address. */
export const RESEND_COOLDOWN_SECONDS = 45;
/** Hard cap on code emails per address per hour. */
export const MAX_CODES_PER_HOUR = 5;

export type SignupKind = 'single' | 'family';

export interface SingleSignupPayload {
  name: string;
  username: string;
  age: number;
  city: string;
  madrasahName: string | null;
  contactNumber: string;
  familyEmail: string;
}

export interface FamilyLearnerPayload {
  name: string;
  username: string;
  age: number;
  city: string;
  madrasahName: string | null;
}

export interface FamilySignupPayload {
  familyEmail: string;
  learners: FamilyLearnerPayload[];
}

export interface VerificationPayload {
  kind: SignupKind;
  single?: SingleSignupPayload;
  family?: FamilySignupPayload;
  referralCode?: string;
}

type ValidationResult<T> = { ok: true; payload: T } | { ok: false; error: string };

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function codeSecret(): string {
  const explicit = String(process.env.SIGNUP_CODE_SECRET || '').trim();
  if (explicit) return explicit;
  // Fall back to the service-role key so codes are not guessable even when the
  // dedicated secret is not configured.
  const serviceRole = resolveServiceRoleKey();
  if (serviceRole) return serviceRole;
  return 'kids-zone-signup-code';
}

export function generateSignupCode(): string {
  return crypto.randomInt(0, 10 ** SIGNUP_CODE_LENGTH).toString().padStart(SIGNUP_CODE_LENGTH, '0');
}

export function hashSignupCode(email: string, code: string): string {
  return crypto
    .createHash('sha256')
    .update(`${normalizeFamilyEmail(email)}:${code}:${codeSecret()}`)
    .digest('hex');
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function validateSingleSignupPayload(body: any): ValidationResult<VerificationPayload> {
  const name = String(body?.name || '').trim();
  if (name.length < 2) return { ok: false, error: 'Please enter your name.' };

  const username = normalizeUsername(String(body?.username || ''));
  if (!isValidUsername(username)) {
    return {
      ok: false,
      error: 'Username must be 3–20 characters and use only letters, numbers, or underscores.',
    };
  }

  const age = parseInt(String(body?.age ?? '').trim(), 10);
  if (!Number.isFinite(age) || age < 1 || age > 120) {
    return { ok: false, error: 'Please enter a valid age.' };
  }

  const city = String(body?.city || '').trim();
  if (city.length < 2) return { ok: false, error: 'Please enter your city or town.' };

  const contactNumber = String(body?.contactNumber || '').trim();
  const contactDigits = contactNumber.replace(/\D/g, '');
  if (contactDigits.length < 6 || contactDigits.length > 18) {
    return { ok: false, error: 'Please enter a valid contact number.' };
  }

  const familyEmail = normalizeFamilyEmail(body?.email ?? body?.familyEmail);
  if (!isValidEmail(familyEmail)) return { ok: false, error: 'Please enter a valid family email.' };

  return {
    ok: true,
    payload: {
      kind: 'single',
      single: {
        name,
        username,
        age,
        city,
        madrasahName: String(body?.madrasahName || '').trim() || null,
        contactNumber,
        familyEmail,
      },
      referralCode: String(body?.referralCode || '').trim().toUpperCase() || undefined,
    },
  };
}

export function validateFamilySignupPayload(body: any): ValidationResult<VerificationPayload> {
  const familyEmail = normalizeFamilyEmail(body?.familyEmail ?? body?.email);
  if (!isValidEmail(familyEmail)) return { ok: false, error: 'Please enter a valid family email.' };

  const rawLearners = Array.isArray(body?.learners) ? body.learners : [];
  if (rawLearners.length === 0) return { ok: false, error: 'Please add at least one learner.' };
  if (rawLearners.length > 6) return { ok: false, error: 'Maximum 6 learners per family.' };

  const learners: FamilyLearnerPayload[] = [];
  const seenUsernames = new Set<string>();

  for (let i = 0; i < rawLearners.length; i++) {
    const raw = rawLearners[i] || {};
    const label = `Learner ${i + 1}`;

    const name = String(raw?.name || '').trim();
    if (name.length < 2) return { ok: false, error: `${label}: please enter a name.` };

    const username = normalizeUsername(String(raw?.username || ''));
    if (!isValidUsername(username)) {
      return { ok: false, error: `${label}: username must be 3–20 characters (letters, numbers, underscores).` };
    }
    if (seenUsernames.has(username)) {
      return { ok: false, error: `${label}: username "${username}" is used twice.` };
    }
    seenUsernames.add(username);

    const age = parseInt(String(raw?.age ?? '').trim(), 10);
    if (!Number.isFinite(age) || age < 1 || age > 120) {
      return { ok: false, error: `${label}: please enter a valid age.` };
    }

    const city = String(raw?.city || '').trim();
    if (city.length < 2) return { ok: false, error: `${label}: please enter a city or town.` };

    learners.push({
      name,
      username,
      age,
      city,
      madrasahName: String(raw?.madrasahName || '').trim() || null,
    });
  }

  return { ok: true, payload: { kind: 'family', family: { familyEmail, learners } } };
}

export function usernamesForPayload(payload: VerificationPayload): string[] {
  if (payload.kind === 'family') {
    return (payload.family?.learners || []).map((l) => l.username);
  }
  return payload.single?.username ? [payload.single.username] : [];
}

export function emailForPayload(payload: VerificationPayload): string {
  return payload.kind === 'family'
    ? payload.family?.familyEmail || ''
    : payload.single?.familyEmail || '';
}

export function learnerNamesForPayload(payload: VerificationPayload): string[] {
  if (payload.kind === 'family') return (payload.family?.learners || []).map((l) => l.name);
  return payload.single?.name ? [payload.single.name] : [];
}

/** Usernames already taken in public.users (case-insensitive, lowercased input). */
export async function findTakenUsernames(usernames: string[]): Promise<string[]> {
  const candidates = [...new Set(usernames.map((u) => normalizeUsername(u)).filter(Boolean))];
  if (candidates.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('username')
    .in('username', candidates);

  if (error) {
    // Column not migrated yet — treat as taken so we never create duplicates.
    if (error.code === '42703') return candidates;
    throw error;
  }

  const taken = new Set((data || []).map((row: any) => normalizeUsername(String(row?.username || ''))));
  return candidates.filter((u) => taken.has(u));
}

/** True when the family email already has an account. */
export async function familyEmailAlreadyRegistered(email: string): Promise<boolean> {
  const normalized = normalizeFamilyEmail(email);
  if (!normalized) return false;

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('uid')
    .or(`family_email.eq."${normalized}",email.eq."${normalized}"`)
    .limit(1);

  if (error) {
    if (error.code === '42703') return false;
    throw error;
  }

  return Boolean(data?.length);
}

export async function createSignupVerification(input: {
  email: string;
  kind: SignupKind;
  payload: VerificationPayload;
}): Promise<
  | { ok: true; code: string; expiresAt: number }
  | { ok: false; error: string; retryAfterSeconds?: number }
> {
  const email = normalizeFamilyEmail(input.email);
  if (!isValidEmail(email)) return { ok: false, error: 'A valid email is required.' };

  const now = Date.now();
  const hourAgoIso = new Date(now - 60 * 60 * 1000).toISOString();

  const { data: recent, error: recentErr } = await supabaseAdmin
    .from('email_verifications')
    .select('created_at')
    .eq('email', email)
    .gte('created_at', hourAgoIso)
    .order('created_at', { ascending: false });

  if (recentErr) {
    console.error('[signup-verification] could not read recent codes:', recentErr.message);
    return { ok: false, error: 'Could not start verification. Please try again.' };
  }

  if ((recent?.length ?? 0) >= MAX_CODES_PER_HOUR) {
    return {
      ok: false,
      error: 'Too many verification codes requested for this email. Please try again in an hour.',
    };
  }

  const lastAt = recent?.[0]?.created_at ? new Date(recent[0].created_at).getTime() : 0;
  if (lastAt) {
    const elapsed = now - lastAt;
    if (elapsed < RESEND_COOLDOWN_SECONDS * 1000) {
      const retryAfterSeconds = Math.ceil((RESEND_COOLDOWN_SECONDS * 1000 - elapsed) / 1000);
      return {
        ok: false,
        error: `Please wait ${retryAfterSeconds}s before requesting another code.`,
        retryAfterSeconds,
      };
    }
  }

  // Any outstanding code for this email becomes invalid.
  const { error: invalidateErr } = await supabaseAdmin
    .from('email_verifications')
    .update({ consumed_at: new Date(now).toISOString() })
    .eq('email', email)
    .is('consumed_at', null);

  if (invalidateErr) {
    console.error('[signup-verification] could not invalidate old codes:', invalidateErr.message);
  }

  const code = generateSignupCode();
  const expiresAt = now + SIGNUP_CODE_TTL_MS;

  const { error: insertErr } = await supabaseAdmin.from('email_verifications').insert({
    email,
    kind: input.kind,
    code_hash: hashSignupCode(email, code),
    payload: input.payload,
    expires_at: new Date(expiresAt).toISOString(),
  });

  if (insertErr) {
    console.error('[signup-verification] could not store verification:', insertErr.message);
    return { ok: false, error: 'Could not start verification. Please try again.' };
  }

  return { ok: true, code, expiresAt };
}

/** Latest outstanding (unconsumed, unexpired) verification for an email. */
export async function getActiveSignupVerification(email: string): Promise<{
  payload: VerificationPayload;
  kind: SignupKind;
} | null> {
  const normalized = normalizeFamilyEmail(email);
  if (!normalized) return null;

  const { data, error } = await supabaseAdmin
    .from('email_verifications')
    .select('payload, kind, expires_at')
    .eq('email', normalized)
    .is('consumed_at', null)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === '42P01') return null;
    throw error;
  }
  if (!data?.payload) return null;

  return {
    payload: data.payload as VerificationPayload,
    kind: (data.kind as SignupKind) || (data.payload as VerificationPayload).kind || 'single',
  };
}

export async function consumeSignupVerification(input: {
  email: string;
  code: string;
}): Promise<
  | { ok: true; payload: VerificationPayload }
  | { ok: false; error: string; attemptsRemaining?: number }
> {
  const email = normalizeFamilyEmail(input.email);
  const code = String(input.code || '').replace(/\D/g, '');

  if (!isValidEmail(email)) return { ok: false, error: 'A valid email is required.' };
  if (code.length !== SIGNUP_CODE_LENGTH) {
    return { ok: false, error: `Enter the ${SIGNUP_CODE_LENGTH}-digit code we emailed you.` };
  }

  const { data: row, error } = await supabaseAdmin
    .from('email_verifications')
    .select('id, code_hash, payload, attempts, expires_at')
    .eq('email', email)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[signup-verification] could not load code:', error.message);
    return { ok: false, error: 'Could not verify that code. Please try again.' };
  }
  if (!row) {
    return { ok: false, error: 'No active code found for that email. Please request a new one.' };
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, error: 'That code has expired. Please request a new one.' };
  }

  const attempts = Number(row.attempts) || 0;
  if (attempts >= MAX_VERIFY_ATTEMPTS) {
    return { ok: false, error: 'Too many incorrect attempts. Please request a new code.' };
  }

  if (!timingSafeEqualHex(hashSignupCode(email, code), String(row.code_hash))) {
    const nextAttempts = attempts + 1;
    await supabaseAdmin
      .from('email_verifications')
      .update({ attempts: nextAttempts })
      .eq('id', row.id);

    const attemptsRemaining = Math.max(0, MAX_VERIFY_ATTEMPTS - nextAttempts);
    return {
      ok: false,
      error:
        attemptsRemaining > 0
          ? `Incorrect code. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? '' : 's'} left.`
          : 'Too many incorrect attempts. Please request a new code.',
      attemptsRemaining,
    };
  }

  const { error: consumeErr } = await supabaseAdmin
    .from('email_verifications')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', row.id);

  if (consumeErr) {
    console.error('[signup-verification] could not consume code:', consumeErr.message);
  }

  return { ok: true, payload: (row.payload || {}) as VerificationPayload };
}
