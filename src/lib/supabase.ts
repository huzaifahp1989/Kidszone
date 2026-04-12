import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'placeholder';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.SUPABASE_URL) {
  console.warn('[supabase] Warning: SUPABASE URL is missing. Set NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) in Vercel env vars.');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && !process.env.SUPABASE_ANON_KEY) {
  console.warn('[supabase] Warning: SUPABASE ANON KEY is missing. Set NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY) in Vercel env vars.');
}

// Derive default Supabase storage key based on project ref to avoid token mismatches
const projectRefMatch = SUPABASE_URL.match(/https?:\/\/([^.]+)\.supabase\.co/i);
const PROJECT_REF = projectRefMatch ? projectRefMatch[1] : undefined;
const DEFAULT_STORAGE_KEY = PROJECT_REF ? `sb-${PROJECT_REF}-auth-token` : undefined;
const PRIMARY_STORAGE_KEY = DEFAULT_STORAGE_KEY ?? 'supabase.auth.token';
const LEGACY_STORAGE_KEYS = Array.from(new Set(['supabase.auth.token', DEFAULT_STORAGE_KEY].filter(Boolean))) as string[];
const REMEMBER_ME_KEY = 'iklp_remember_me';

const shouldRememberSession = () => {
  if (typeof window === 'undefined') return true;
  try {
    const v = window.localStorage.getItem(REMEMBER_ME_KEY);
    if (v === null) return true;
    return v === 'true';
  } catch {
    return true;
  }
};

const getPrimaryStorage = () => {
  if (typeof window === 'undefined') return null;
  return shouldRememberSession() ? window.localStorage : window.sessionStorage;
};

const getSecondaryStorage = () => {
  if (typeof window === 'undefined') return null;
  return shouldRememberSession() ? window.sessionStorage : window.localStorage;
};

const safeGet = (storage: Storage | null, key: string): string | null => {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (storage: Storage | null, key: string, value: string): boolean => {
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

const safeRemove = (storage: Storage | null, key: string) => {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {}
};

// Custom storage adapter for better mobile support
const customStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null;
    const primary = getPrimaryStorage();
    const secondary = getSecondaryStorage();

    const fromPrimary = safeGet(primary, key);
    if (fromPrimary !== null) return fromPrimary;

    const fromSecondary = safeGet(secondary, key);
    if (fromSecondary !== null) return fromSecondary;

    if (key !== PRIMARY_STORAGE_KEY) return null;

    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      if (legacyKey === key) continue;
      const v = safeGet(primary, legacyKey) ?? safeGet(secondary, legacyKey);
      if (v === null) continue;
      safeSet(primary, key, v);
      safeSet(secondary, key, v);
      return v;
    }

    return null;
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    const primary = getPrimaryStorage();
    const secondary = getSecondaryStorage();
    const wrotePrimary = safeSet(primary, key, value);
    if (!wrotePrimary) safeSet(secondary, key, value);
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return;
    safeRemove(window.localStorage, key);
    safeRemove(window.sessionStorage, key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: customStorage,
    storageKey: PRIMARY_STORAGE_KEY,
    flowType: 'pkce', // Changed from 'implicit' to 'pkce' for better mobile support
  },
});

// Debug helper: Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  return session !== null && session.user !== null;
}

// Debug helper: Get current user ID
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}
