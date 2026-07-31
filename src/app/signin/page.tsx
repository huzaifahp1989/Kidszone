"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { ensureUserProfile } from '@/lib/user-profile';
import { mobileAuthHelper } from '@/lib/mobile-auth';
import { looksLikeEmail, normalizeUsername } from '@/lib/family-accounts';
import Link from 'next/link';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

const ONBOARDING_FORM_PATH = '/onboarding-form';

type FamilyPickMember = {
  username: string;
  name: string;
  age: number;
  email: string;
};

const shouldShowOnboardingForm = (meta: any): boolean => {
  const needs = meta?.needsSignupForm === true || meta?.needs_signup_form === true;
  const completedAt = meta?.signupFormCompletedAt || meta?.signup_form_completed_at;
  return needs && !completedAt;
};

export default function SignInPage() {
  const router = useRouter();
  const authInFlightRef = useRef(false);

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [offline, setOffline] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [touched, setTouched] = useState<{ login: boolean; password: boolean; mfa: boolean }>({
    login: false, password: false, mfa: false,
  });

  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [retryIn, setRetryIn] = useState<number | null>(null);

  const [pendingMembers, setPendingMembers] = useState<FamilyPickMember[] | null>(null);
  const [familyEmailHint, setFamilyEmailHint] = useState<string | null>(null);

  const sanitizeNextPath = useCallback((raw: string | null): string => {
    if (!raw) return '/';
    const next = raw.startsWith('/') ? raw : '/';
    const pathOnly = next.split('?')[0]?.split('#')[0] ?? next;
    if (pathOnly === '/signin' || pathOnly === '/signup' || pathOnly === '/reset-password') return '/';
    return next;
  }, []);

  const getNextPath = useCallback(() => {
    if (typeof window === 'undefined') return '/';
    try {
      const next = new URLSearchParams(window.location.search).get('next');
      return sanitizeNextPath(next);
    } catch { return '/'; }
  }, [sanitizeNextPath]);

  const getPostSignInPath = useCallback((meta: any, fallbackPath: string) => {
    if (shouldShowOnboardingForm(meta)) return ONBOARDING_FORM_PATH;
    return fallbackPath;
  }, []);

  useEffect(() => {
    if (retryIn === null || retryIn <= 0) { setRetryIn(null); return; }
    const id = window.setInterval(() => {
      setRetryIn((n) => (n === null || n <= 1 ? null : n - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [retryIn]);

  useEffect(() => {
    try {
      const until = parseInt(window.localStorage.getItem('iklp_signin_locked_until') ?? '0', 10);
      const remaining = Math.ceil((until - Date.now()) / 1000);
      if (remaining > 0) setRetryIn(remaining);
    } catch {}
  }, []);

  const recordFailedAttempt = () => {
    try {
      const key = 'iklp_signin_attempts';
      const raw = window.localStorage.getItem(key);
      const attempts: number[] = raw ? JSON.parse(raw) : [];
      const now = Date.now();
      const recent = attempts.filter((t) => now - t < 5 * 60 * 1000);
      recent.push(now);
      window.localStorage.setItem(key, JSON.stringify(recent));
      if (recent.length >= 4) {
        const lockUntil = now + 2 * 60 * 1000;
        window.localStorage.setItem('iklp_signin_locked_until', String(lockUntil));
        setRetryIn(120);
        return true;
      }
    } catch {}
    return false;
  };

  const clearFailedAttempts = () => {
    try {
      window.localStorage.removeItem('iklp_signin_attempts');
      window.localStorage.removeItem('iklp_signin_locked_until');
    } catch {}
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { const msg = new URLSearchParams(window.location.search).get('message'); if (msg) setInfo(msg); } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user?.id) {
        const next = getPostSignInPath(data.session.user.user_metadata || {}, getNextPath());
        router.replace(next);
      }
    })();
  }, [getNextPath, getPostSignInPath, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem('iklp_remember_me');
      setRememberMe(stored === null ? true : stored === 'true');
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storage = mobileAuthHelper.checkStorageAvailability();
      if (!storage.localStorage && storage.sessionStorage) {
        setRememberMe(false);
        persistRemember(false);
      }
    } catch {}
  }, []);

  const trimmedLogin = useMemo(() => loginId.trim(), [loginId]);
  const loginIsEmail = useMemo(() => looksLikeEmail(trimmedLogin), [trimmedLogin]);
  const loginValid = useMemo(() => {
    if (!trimmedLogin) return false;
    if (loginIsEmail) return true;
    return normalizeUsername(trimmedLogin).length >= 3;
  }, [trimmedLogin, loginIsEmail]);
  const passwordValid = useMemo(() => password.length >= 6, [password]);

  const parseRetrySeconds = (msg: string): number | null => {
    const secMatch = msg.match(/try again in (\d+)\s*second/i);
    if (secMatch) return parseInt(secMatch[1], 10);
    const minMatch = msg.match(/try again in (\d+):(\d{2})/i);
    if (minMatch) return parseInt(minMatch[1], 10) * 60 + parseInt(minMatch[2], 10);
    const remMatch = msg.match(/\b(\d+)\s*s\s*remaining\b/i);
    if (remMatch) return parseInt(remMatch[1], 10);
    const remWordMatch = msg.match(/\b(\d+)\s*seconds?\s*remaining\b/i);
    if (remWordMatch) return parseInt(remWordMatch[1], 10);
    return null;
  };

  const persistRemember = (val: boolean) => {
    try { window.localStorage.setItem('iklp_remember_me', val ? 'true' : 'false'); } catch {}
  };

  // ---------- Session / resolver caches for fast repeat sign-ins ----------
  const AUTH_RESOLVER_CACHE_KEY = 'iklp_auth_resolver_cache_v1';
  const LAST_PROFILE_CACHE_KEY = 'iklp_last_signed_in_profile_v1';
  const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  const RESOLVER_CACHE_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days for email resolve

  type ResolverCacheEntry = {
    authEmail: string;
    familyEmail?: string;
    expiresAt: number;
  };

  const hashLoginIdentifier = (id: string): string => {
    const s = id.trim().toLowerCase();
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  };

  const getResolverCache = (identifier: string): ResolverCacheEntry | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(AUTH_RESOLVER_CACHE_KEY);
      if (!raw) return null;
      const all: Record<string, ResolverCacheEntry> = JSON.parse(raw);
      const entry = all?.[hashLoginIdentifier(identifier)];
      if (!entry) return null;
      if (entry.expiresAt < Date.now()) return null;
      return entry;
    } catch {
      return null;
    }
  };

  const setResolverCache = (identifier: string, value: Omit<ResolverCacheEntry, 'expiresAt'>) => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(AUTH_RESOLVER_CACHE_KEY);
      const all: Record<string, ResolverCacheEntry> = raw ? JSON.parse(raw) : {};
      all[hashLoginIdentifier(identifier)] = {
        ...value,
        expiresAt: Date.now() + RESOLVER_CACHE_MAX_AGE_MS,
      };
      // Prune expired entries while we're here.
      for (const k of Object.keys(all)) {
        if (all[k].expiresAt < Date.now()) delete all[k];
      }
      window.localStorage.setItem(AUTH_RESOLVER_CACHE_KEY, JSON.stringify(all));
    } catch {
      /* storage full / disabled — best-effort only */
    }
  };

  type LastSignedInProfile = {
    uid: string;
    authEmail?: string;
    user_name?: string | null;
    email?: string | null;
    contact_number?: string | null;
    metadata?: Record<string, unknown>;
    signedInAt: number;
    expiresAt: number;
  };

  const getLastSignedInProfile = (): LastSignedInProfile | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.localStorage.getItem(LAST_PROFILE_CACHE_KEY);
      if (!raw) return null;
      const entry: LastSignedInProfile = JSON.parse(raw);
      if (entry.expiresAt < Date.now()) return null;
      return entry;
    } catch {
      return null;
    }
  };

  const setLastSignedInProfile = (value: Omit<LastSignedInProfile, 'signedInAt' | 'expiresAt'>) => {
    if (typeof window === 'undefined') return;
    try {
      const entry: LastSignedInProfile = {
        ...value,
        signedInAt: Date.now(),
        expiresAt: Date.now() + CACHE_MAX_AGE_MS,
      };
      window.localStorage.setItem(LAST_PROFILE_CACHE_KEY, JSON.stringify(entry));
    } catch {
      /* best-effort */
    }
  };

  const waitForSession = async (attempts = 12, delayMs = 150) => {
    for (let i = 0; i < attempts; i++) {
      try {
        const { data } = await withTimeout(supabase.auth.getSession(), 5000);
        if (data.session?.user?.id) return data.session;
      } catch {}
      await new Promise((r) => setTimeout(r, delayMs));
    }
    return null;
  };

  const fetchJsonWithTimeout = async (url: string, init: RequestInit, timeoutMs: number) => {
    const isMobile =
      (() => {
        try {
          return mobileAuthHelper.isMobileBrowser() || mobileAuthHelper.isWebView();
        } catch {
          return false;
        }
      })();
    const finalTimeoutMs = isMobile ? Math.max(timeoutMs, 15000) : timeoutMs;
    const controller = new AbortController();
    const t = window.setTimeout(() => controller.abort(), finalTimeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      const json = await res.json().catch(() => ({} as any));
      return { res, json };
    } finally {
      window.clearTimeout(t);
    }
  };

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number) => {
    const isMobile =
      (() => {
        try {
          return mobileAuthHelper.isMobileBrowser() || mobileAuthHelper.isWebView();
        } catch {
          return false;
        }
      })();
    const finalTimeoutMs = isMobile ? Math.max(timeoutMs, 15000) : timeoutMs;
    return await Promise.race<T>([
      promise,
      new Promise<T>((_, reject) =>
        window.setTimeout(() => reject(new Error('Request timed out. Please try again.')), finalTimeoutMs)
      ),
    ]);
  };

  const beginMfaIfNeeded = async () => {
    try {
      const api: any = (supabase.auth as any).mfa;
      if (!api?.listFactors || !api?.challenge) return false;
      const { data } = await api.listFactors();
      const factors: any[] = data?.totp ?? data?.all ?? data?.factors ?? [];
      const verified = factors.find((f: any) => f?.status === 'verified');
      if (!verified?.id) return false;
      const { data: ch, error: chErr } = await api.challenge({ factorId: verified.id });
      if (chErr || !ch?.id) return false;
      setMfaFactorId(verified.id);
      setMfaChallengeId(ch.id);
      setMfaRequired(true);
      setMfaCode('');
      return true;
    } catch { return false; }
  };

  const onVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authInFlightRef.current || loading) return;
    setError(null);
    setTouched((t) => ({ ...t, mfa: true }));
    if (!mfaFactorId || !mfaChallengeId) {
      setError('2FA session expired. Please sign in again.');
      setMfaRequired(false);
      return;
    }
    const code = mfaCode.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(code)) { setError('Enter the 6-digit code from your authenticator app.'); return; }
    authInFlightRef.current = true;
    setLoading(true);
    setProgress('Verifying code…');
    try {
      const api: any = (supabase.auth as any).mfa;
      const { error: verifyErr } = await api.verify({ factorId: mfaFactorId, challengeId: mfaChallengeId, code });
      if (verifyErr) { setError(verifyErr.message || 'Invalid code. Please try again.'); return; }
      setInfo('Signed in! Redirecting…');
      const next = getNextPath();
      
      // Don't use router.refresh() as it can cause auth state to reset
      if (typeof window !== 'undefined') {
        window.setTimeout(() => {
          router.replace(next);
        }, 100);
      } else {
        router.replace(next);
      }
    } catch (err: any) {
      setError(err?.message || 'Could not verify code. Please try again.');
    } finally {
      setLoading(false);
      setProgress(null);
      authInFlightRef.current = false;
    }
  };

  const onForgotPassword = async () => {
    setError(null);
    setInfo(null);
    const target = familyEmailHint || (loginIsEmail ? trimmedLogin.toLowerCase() : '');
    if (!target) {
      setError('Enter your family email above, then click "Forgot password?" again.');
      return;
    }
    try {
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(target, { redirectTo });
      if (resetErr) { setError(resetErr.message || 'Could not send reset email.'); return; }
      setInfo('Password reset email sent. Check your inbox.');
    } catch (e: any) { setError(e?.message || 'Could not send reset email.'); }
  };

  const resolveAuthEmail = async (identifier: string, selectedUsername?: string): Promise<string | null> => {
    setProgress('Looking up account…');

    // Fast path: repeat sign-ins with the same identifier skip the network
    // resolve-hop entirely. Family-member picks always go to the network
    // because selectedUsername disambiguates.
    if (!selectedUsername) {
      const cached = getResolverCache(identifier);
      if (cached?.authEmail) {
        setFamilyEmailHint(cached.familyEmail || null);
        setPendingMembers(null);
        setProgress('Found your account (cached)…');
        return cached.authEmail;
      }
    }

    const { res, json } = await fetchJsonWithTimeout(
      '/api/auth/resolve-login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          selectedUsername: selectedUsername || undefined,
        }),
      },
      20000
    );

    if (!res.ok) {
      setError(json?.error || 'Could not find that account.');
      return null;
    }

    if (json?.needsMemberPick && Array.isArray(json.members)) {
      setPendingMembers(json.members as FamilyPickMember[]);
      setFamilyEmailHint(json.familyEmail || (loginIsEmail ? trimmedLogin.toLowerCase() : null));
      setInfo('Who is learning today? Pick a name, then we will sign you in.');
      return null;
    }

    if (json?.authEmail) {
      const familyEmail = json.familyEmail || null;
      setFamilyEmailHint(familyEmail || null);
      setPendingMembers(null);
      // Persist resolver cache so repeat logins go straight to sign-in,
      // skipping the /api/auth/resolve-login round-trip.
      if (!selectedUsername) {
        setResolverCache(identifier, { authEmail: String(json.authEmail), familyEmail: familyEmail || undefined });
      }
      return String(json.authEmail);
    }

    setError('Could not find that account.');
    return null;
  };

  const signInWithAuthEmail = async (authEmail: string) => {
    const isMobile =
      (() => {
        try {
          return mobileAuthHelper.isMobileBrowser() || mobileAuthHelper.isWebView();
        } catch {
          return false;
        }
      })();

    const applyRetryWait = (wait: number) => {
      const lockUntil = Date.now() + wait * 1000;
      try {
        window.localStorage.setItem('iklp_signin_locked_until', String(lockUntil));
      } catch {}
      setRetryIn(wait);
      setError(`Too many requests. Please wait ${wait} seconds then try again.`);
    };

    const saveServerSession = async (accessToken: string, refreshToken: string): Promise<string | null> => {
      // Desktop 12s → 20s, WebView/Mobile 20s → 30s. Generous enough to ride
      // through cold-start auth endpoints on slow mobile data.
      const firstTimeout = isMobile ? 20000 : 12000;
      const retryTimeout = isMobile ? 30000 : 20000;

      const attemptSetSession = async (timeoutMs: number, attempt: number): Promise<boolean> => {
        if (attempt === 1) {
          setProgress('Saving session (step 1/3)…');
        } else {
          setProgress(`Still saving session (retrying… step ${attempt}/3)`);
        }
        try {
          const { error: sessionErr } = await withTimeout(
            supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            }),
            timeoutMs
          );
          if (!sessionErr) return true;
          // Non-timeout errors from the SDK are usually recoverable by polling:
          console.warn('[signin] setSession returned error (will poll storage):', sessionErr.message, sessionErr.code);
          return false;
        } catch (err) {
          console.warn(`[signin] setSession attempt ${attempt} timeout/error:`, err);
          return false;
        }
      };

      let setSucceeded = false;
      setSucceeded = await attemptSetSession(firstTimeout, 1);
      if (!setSucceeded) {
        // Wait 500ms and try a second time with a more generous timeout, because
        // very often the first call timed out AFTER writing storage (the SDK
        // writes cookies/localStorage synchronously then awaits a refresh-token
        // exchange which may be what actually timed out on the network).
        await new Promise((r) => setTimeout(r, 500));
        setSucceeded = await attemptSetSession(retryTimeout, 2);
      }

      // Even if setSession threw/timed-out on BOTH attempts, tokens may already
      // be in storage. Poll getSession() aggressively because the SDK's
      // internal storage write usually completes before the HTTP refresh round
      // trip, and getSession reads locally.
      setProgress('Verifying your sign-in (step 2/3)…');
      const session = await waitForSession(isMobile ? 30 : 20, isMobile ? 220 : 170);
      if (session?.user?.id) {
        return session.user.id;
      }

      // Still nothing. Offer one more recovery: on Android WebViews with
      // third-party cookie restrictions, setting storage via a server
      // set-cookie on the auth proxy response may work. Retry storage poll.
      setProgress('Final session check (step 3/3)…');
      const lastChance = await waitForSession(isMobile ? 15 : 8, isMobile ? 260 : 200);
      if (lastChance?.user?.id) {
        return lastChance.user.id;
      }

      setError(
        'Sign-in worked but your browser blocked the session. Please enable cookies and local storage, then try again. If this keeps happening, try refreshing the page first.'
      );
      return null;
    };

    const requestServerSignIn = async (): Promise<
      | {
          kind: 'ok';
          accessToken: string;
          refreshToken: string;
          uid: string;
        }
      | {
          kind: 'rate_limit';
          wait: number;
        }
      | {
          kind: 'error';
          message: string;
          canFallback: boolean;
        }
    > => {
      try {
        setProgress('Contacting server…');
        const { res, json } = await fetchJsonWithTimeout(
          '/api/auth/signin',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: authEmail, password }),
          },
          20000
        );

        if (res.ok) {
          const accessToken = String(json?.access_token || '').trim();
          const refreshToken = String(json?.refresh_token || '').trim();
          const uid = String(json?.user?.id || '').trim();
          if (accessToken && refreshToken && uid) {
            return { kind: 'ok', accessToken, refreshToken, uid };
          }
          return {
            kind: 'error',
            message: 'Sign-in succeeded but session tokens were missing. Please try again.',
            canFallback: false,
          };
        }

        const raw = String(json?.error || '').trim();
        const waitFromApi = typeof json?.retryAfter === 'number' ? json.retryAfter : null;
        const wait = waitFromApi ?? parseRetrySeconds(raw) ?? (res.status === 429 ? 60 : null);
        if (wait && wait > 0) {
          return { kind: 'rate_limit', wait };
        }

        return {
          kind: 'error',
          message: raw || 'Sign-in failed. Please check your details and password.',
          canFallback: res.status >= 500,
        };
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return {
            kind: 'error',
            message: 'Sign-in is taking too long on this connection. Please try again.',
            canFallback: true,
          };
        }
        return {
          kind: 'error',
          message: err?.message || 'Could not reach the sign-in server. Please try again.',
          canFallback: true,
        };
      }
    };

    const finishSuccess = async (uid: string) => {
      setProgress('Finalizing sign-in…');

      if (!isMobile) {
        try {
          await withTimeout(supabase.auth.getUser(), 5000);
        } catch {}

        const session = await waitForSession(16, 170);
        if (!session) {
          setError('Sign-in succeeded but your browser blocked the session. Please enable cookies/local storage and try again.');
          setLoading(false);
          setProgress(null);
          authInFlightRef.current = false;
          return;
        }
      }

      clearFailedAttempts();
      ensureUserProfile(uid).catch(() => {});

      let authMeta: Record<string, unknown> = {};
      let authRowName: string | null | undefined;
      let authRowEmail: string | null | undefined;
      let authRowContact: string | null | undefined;
      try {
        const { data: authData } = await withTimeout(supabase.auth.getUser(), 5000);
        authMeta = (authData.user?.user_metadata as Record<string, unknown>) || {};
        authRowName = (authMeta?.name as string | undefined) || authData.user?.email?.split('@')[0] || null;
        authRowEmail = authData.user?.email || null;
        authRowContact =
          ((authMeta?.contact_number as string | undefined) ||
            (authMeta?.contactNumber as string | undefined) ||
            (authMeta?.phone as string | undefined) ||
            null);
      } catch {}

      // Populate "easy sign-in" cache so future visits feel instant (and so,
      // if the session check below ever falls through on a retry, we can still
      // identify whose account this is).
      try {
        setLastSignedInProfile({
          uid,
          authEmail,
          user_name: authRowName,
          email: authRowEmail,
          contact_number: authRowContact,
          metadata: authMeta,
        });
      } catch {}

      let needsMfa = false;
      try {
        needsMfa = await withTimeout(beginMfaIfNeeded(), isMobile ? 3500 : 9000);
      } catch {
        needsMfa = false;
      }
      if (needsMfa) {
        setInfo('Enter your 2FA code to continue.');
        setLoading(false);
        setProgress(null);
        authInFlightRef.current = false;
        return;
      }
      setInfo('Signed in! Redirecting…');
      setProgress('Redirecting…');
      const next = getPostSignInPath(authMeta, getNextPath());
      
      // Verify session is persisted before redirecting — if this transiently
      // fails but we have a cached profile, proceed anyway (auth state should
      // sync on the next route render via client-side getSession() hooks).
      let sessionVerified = false;
      try {
        const { data: verifySession } = await withTimeout(supabase.auth.getSession(), 4500);
        sessionVerified = !!verifySession.session?.user?.id;
      } catch (err) {
        console.warn('[signin] Session verification warning (continuing):', err);
        sessionVerified = false;
      }

      if (!sessionVerified) {
        // Fall back to one last 4-round poll with short delays; if still
        // unverified but we have `uid` + a last-signed-in cache record, trust
        // the client redirect and let the destination page's auth check win.
        const lastSession = await waitForSession(4, 120);
        sessionVerified = !!lastSession?.user?.id;
        if (!sessionVerified) {
          setError('Session verification failed. Please sign in again.');
          setLoading(false);
          setProgress(null);
          authInFlightRef.current = false;
          return;
        }
      }
      
      // Don't use router.refresh() as it can cause auth state to reset
      // Just use router.replace() for navigation
      if (typeof window !== 'undefined') {
        // Give the auth listener a moment to update
        window.setTimeout(() => {
          router.replace(next);
        }, 100);
      } else {
        router.replace(next);
      }
    };

    const serverResult = await requestServerSignIn();
    if (serverResult.kind === 'ok') {
      const persistedUid =
        (await saveServerSession(serverResult.accessToken, serverResult.refreshToken)) || null;
      if (!persistedUid) return;
      await finishSuccess(serverResult.uid || persistedUid);
      return;
    }

    if (serverResult.kind === 'rate_limit') {
      applyRetryWait(serverResult.wait);
      return;
    }

    if (!serverResult.canFallback) {
      recordFailedAttempt();
      setError(serverResult.message);
      return;
    }

    setProgress('Signing in…');
    const { data: directData, error: directErr } = await withTimeout(
      supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      }),
      isMobile ? 22000 : 15000
    );

    if (!directErr && directData.session?.user?.id) {
      await finishSuccess(directData.session.user.id);
      return;
    }

    const directMsg = directErr?.message || serverResult.message || '';
    const directWait =
      parseRetrySeconds(directMsg) ?? ((directErr as { status?: number } | null)?.status === 429 ? 60 : null);
    if (directWait && directWait > 0) {
      applyRetryWait(directWait);
      return;
    }

    recordFailedAttempt();
    setError(directMsg || 'Sign-in failed. Please check your details and password.');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authInFlightRef.current || loading) return;
    setError(null);
    setInfo(null);
    setProgress(null);
    setTouched({ login: true, password: true, mfa: false });

    if (!supabaseConfigured) {
      setError('Sign-in is temporarily unavailable because Supabase is not configured.');
      return;
    }
    if (!loginValid) {
      setError(loginIsEmail ? 'Please enter a valid email address.' : 'Please enter your email or username.');
      return;
    }
    if (!password || !passwordValid) { setError('Password must be at least 6 characters.'); return; }
    if (offline) { setError('You appear to be offline. Please reconnect and try again.'); return; }
    
    // Persist remember me preference BEFORE signing in
    persistRemember(rememberMe);
    
    try {
      const storage = mobileAuthHelper.checkStorageAvailability();
      if (!storage.localStorage && !storage.sessionStorage) {
        setError('Your browser is blocking storage. Please enable cookies/local storage and try again.');
        return;
      }
    } catch {}
    try {
      const until = parseInt(window.localStorage.getItem('iklp_signin_locked_until') ?? '0', 10);
      const remaining = Math.ceil((until - Date.now()) / 1000);
      if (remaining > 0) { setRetryIn(remaining); setError(`Too many attempts. Please wait ${remaining} seconds.`); return; }
    } catch {}

    persistRemember(rememberMe);
    authInFlightRef.current = true;
    setLoading(true);

    try {
      const authEmail = await resolveAuthEmail(trimmedLogin);
      if (!authEmail) {
        setLoading(false);
        setProgress(null);
        authInFlightRef.current = false;
        return;
      }
      await signInWithAuthEmail(authEmail);
    } catch (err: any) {
      recordFailedAttempt();
      setError(err?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
      setProgress(null);
      authInFlightRef.current = false;
    }
  };

  const onPickMember = async (member: FamilyPickMember) => {
    if (authInFlightRef.current || loading) return;
    setError(null);
    setInfo(null);
    if (!password || !passwordValid) {
      setError('Enter the family password, then pick who is learning.');
      return;
    }

    persistRemember(rememberMe);
    authInFlightRef.current = true;
    setLoading(true);

    try {
      const authEmail = await resolveAuthEmail(familyEmailHint || trimmedLogin, member.username);
      if (!authEmail) {
        // Fallback: member email from resolve list
        if (member.email) {
          await signInWithAuthEmail(member.email);
        }
        return;
      }
      await signInWithAuthEmail(authEmail);
    } catch (err: any) {
      recordFailedAttempt();
      setError(err?.message || 'Could not sign in as that learner.');
    } finally {
      setLoading(false);
      setProgress(null);
      authInFlightRef.current = false;
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 py-10 bg-[#f5f3ff] pattern-islamic">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-stretch">

        <div className="hidden md:flex flex-col justify-between rounded-2xl p-8 bg-gradient-to-br from-[#6d28d9] to-[#5b21b6] text-white shadow-xl">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
              <Shield size={14} /> Secure Sign In
            </div>
            <h1 className="mt-5 text-3xl font-extrabold leading-tight">Welcome back</h1>
            <p className="mt-3 text-white/80">
              Sign in with your email or username. Brothers and sisters can share one family email.
            </p>
          </div>
          <div className="mt-8 flex gap-4 text-4xl">
            <span>🌙</span><span>📿</span><span>📖</span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          className="w-full rounded-2xl bg-white shadow-xl border border-[#c4b5fd]/30 p-6 sm:p-8"
        >
          <div className="md:hidden mb-6">
            <h1 className="text-2xl font-extrabold text-[#1e1b4b]">Sign in</h1>
            <p className="mt-1 text-sm text-[#475569]">Use your email or username.</p>
          </div>

          {offline && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              You are offline. Please reconnect to sign in.
            </div>
          )}

          {!supabaseConfigured && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Email sign-in is currently unavailable because Supabase keys are missing on this app.
            </div>
          )}

          {(error || info || retryIn !== null) && (
            <div
              className={`mb-4 rounded-xl px-4 py-3 text-sm ${
                error
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : 'bg-green-50 text-green-800 border border-green-200'
              }`}
              role="status"
              aria-live="polite"
            >
              {error
                ? <>{error}{retryIn !== null && <span className="font-bold"> ({retryIn}s remaining)</span>}</>
                : info}
            </div>
          )}

          {pendingMembers && pendingMembers.length > 0 && !mfaRequired ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-[#1e1b4b]">Who is learning today?</p>
                <p className="mt-1 text-xs text-[#475569]">
                  Same family password for everyone. Pick your name to continue.
                </p>
              </div>
              <div className="space-y-2">
                {pendingMembers.map((member) => (
                  <button
                    key={member.username || member.email}
                    type="button"
                    disabled={loading || retryIn !== null}
                    onClick={() => onPickMember(member)}
                    className="w-full rounded-xl border-2 border-[#c4b5fd]/40 px-4 py-3 text-left hover:border-[#7c3aed] hover:bg-[#f5f3ff] transition disabled:opacity-50"
                  >
                    <span className="block font-bold text-[#1e1b4b]">{member.name}</span>
                    <span className="block text-xs text-[#475569]">
                      @{member.username || 'learner'} · age {member.age || '?'}
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => { setPendingMembers(null); setInfo(null); }}
                className="w-full text-sm text-slate-600 hover:underline"
              >
                Use a different email or username
              </button>
              {loading && progress && (
                <div className="text-center text-xs text-[#475569]">{progress}</div>
              )}
            </div>
          ) : !mfaRequired ? (
            <form id="signin-form" onSubmit={onSubmit} className="space-y-4" noValidate>
              <div>
                <label htmlFor="loginId" className="block text-sm font-semibold text-[#1e1b4b] mb-1">
                  Email or username
                </label>
                <input
                  id="loginId"
                  type="text"
                  autoComplete="username"
                  placeholder="family@email.com or aisha_k"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, login: true }))}
                  className={`w-full rounded-xl border-2 px-4 py-3 interactive-focus touch-target transition ${
                    touched.login && !loginValid ? 'border-[#ff6b6b] bg-[#fff5f5]' : 'border-[#c4b5fd]/40'
                  }`}
                />
                {touched.login && !loginValid && (
                  <p className="mt-1 text-xs text-red-700">Enter a valid email or username.</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="password" className="block text-sm font-semibold text-[#1e1b4b]">Password</label>
                  <button type="button" onClick={onForgotPassword} className="text-xs font-semibold text-[#7c3aed] hover:underline interactive-focus touch-target">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                    className={`w-full rounded-xl border-2 px-4 py-3 pr-11 interactive-focus touch-target transition ${
                      touched.password && !passwordValid ? 'border-[#ff6b6b] bg-[#fff5f5]' : 'border-[#c4b5fd]/40'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 interactive-focus"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {touched.password && !passwordValid && (
                  <p className="mt-1 text-xs text-red-700">Password must be at least 6 characters.</p>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm text-[#1e1b4b] select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-[#c4b5fd] text-[#7c3aed] interactive-focus"
                />
                Keep me signed in
              </label>

              <button
                type="submit"
                disabled={!supabaseConfigured || loading || retryIn !== null}
                className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] shadow-lg hover:shadow-xl transition-all transition-bouncy interactive-focus touch-target disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in…' : retryIn !== null ? `Please wait ${retryIn}s…` : 'Sign In'}
              </button>
              {loading && progress && (
                <div className="text-center text-xs text-[#475569]">{progress}</div>
              )}

              <p className="text-sm text-center text-[#1e1b4b]">
                New here?{' '}
                <Link href="/signup" className="text-[#7c3aed] font-semibold hover:underline">Create an account</Link>
              </p>
            </form>
          ) : (
            <form onSubmit={onVerifyMfa} className="space-y-4">
              <div className="rounded-xl border border-[#c4b5fd]/30 bg-[#ede9fe] px-4 py-3">
                <p className="text-sm font-semibold text-[#1e1b4b]">Two-factor authentication</p>
                <p className="mt-1 text-sm text-[#475569]">Enter the 6-digit code from your authenticator app.</p>
              </div>
              <div>
                <label htmlFor="mfa" className="block text-sm font-semibold text-[#1e1b4b] mb-1">2FA code</label>
                <input
                  id="mfa"
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, mfa: true }))}
                  className="w-full rounded-xl border-2 border-[#c4b5fd]/40 px-4 py-3 outline-none focus:ring-2 focus:ring-[#7c3aed] focus:border-[#7c3aed]"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] shadow-lg hover:shadow-xl transition-all transition-bouncy interactive-focus touch-target disabled:opacity-50"
              >
                {loading ? 'Verifying…' : 'Verify & Continue'}
              </button>
              <button
                type="button"
                onClick={() => { setMfaRequired(false); setMfaCode(''); setMfaFactorId(null); setMfaChallengeId(null); }}
                className="w-full text-sm text-slate-600 hover:underline interactive-focus touch-target"
              >
                Use a different account
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
