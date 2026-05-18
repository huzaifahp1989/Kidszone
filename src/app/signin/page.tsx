"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { ensureUserProfile } from '@/lib/user-profile';
import { mobileAuthHelper } from '@/lib/mobile-auth';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SignInPage() {
  const router = useRouter();
  const authInFlightRef = useRef(false);

  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [info, setInfo]             = useState<string | null>(null);
  const [progress, setProgress]     = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [offline, setOffline]       = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [touched, setTouched]       = useState<{ email: boolean; password: boolean; mfa: boolean }>({
    email: false, password: false, mfa: false,
  });

  const [mfaRequired, setMfaRequired]       = useState(false);
  const [mfaFactorId, setMfaFactorId]       = useState<string | null>(null);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [mfaCode, setMfaCode]               = useState('');
  const [retryIn, setRetryIn]               = useState<number | null>(null);

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

  /* ── Manual-retry countdown (counts down, does NOT auto-submit) ── */
  useEffect(() => {
    if (retryIn === null || retryIn <= 0) { setRetryIn(null); return; }
    const id = window.setInterval(() => {
      setRetryIn((n) => (n === null || n <= 1 ? null : n - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [retryIn]);

  /* ── On mount: check if a client-side cooldown is still active ── */
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
      // Keep only attempts in the last 5 minutes
      const recent = attempts.filter((t) => now - t < 5 * 60 * 1000);
      recent.push(now);
      window.localStorage.setItem(key, JSON.stringify(recent));
      // After 4 failed attempts, enforce a 2-minute client-side cooldown
      if (recent.length >= 4) {
        const lockUntil = now + 2 * 60 * 1000;
        window.localStorage.setItem('iklp_signin_locked_until', String(lockUntil));
        setRetryIn(120);
        return true; // locked
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

  /* ── Bootstrap ──────────────────────────────────────── */
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
        router.replace(getNextPath());
      }
    })();
  }, [getNextPath, router]);

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

  /* ── Derived ─────────────────────────────────────────── */
  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const emailValid      = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail), [normalizedEmail]);
  const passwordValid   = useMemo(() => password.length >= 6, [password]);

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
    const controller = new AbortController();
    const t = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      const json = await res.json().catch(() => ({} as any));
      return { res, json };
    } finally {
      window.clearTimeout(t);
    }
  };

  const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number) => {
    return await Promise.race<T>([
      promise,
      new Promise<T>((_, reject) =>
        window.setTimeout(() => reject(new Error('Request timed out. Please try again.')), timeoutMs)
      ),
    ]);
  };

  /* ── MFA ─────────────────────────────────────────────── */
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
      router.replace(next);
      const isMobile =
        (() => {
          try {
            return mobileAuthHelper.isMobileBrowser() || mobileAuthHelper.isWebView();
          } catch {
            return false;
          }
        })();
      if (isMobile && typeof window !== 'undefined') {
        window.setTimeout(() => {
          try {
            if (window.location.pathname.startsWith('/signin')) {
              window.location.href = next;
            }
          } catch {}
        }, 700);
      }
    } catch (err: any) {
      setError(err?.message || 'Could not verify code. Please try again.');
    } finally {
      setLoading(false);
      setProgress(null);
      authInFlightRef.current = false;
    }
  };

  /* ── Social login ────────────────────────────────────── */
  const onSocialLogin = async (provider: 'google' | 'github' | 'apple') => {
    if (authInFlightRef.current || loading) return;
    authInFlightRef.current = true;
    setError(null);
    setLoading(true);
    try {
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/signin?next=${encodeURIComponent(getNextPath())}`
          : undefined;
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } });
      if (oauthErr) setError(oauthErr.message || 'Social sign-in failed. Please try again.');
    } catch (e: any) {
      setError(e?.message || 'Social sign-in failed. Please try again.');
    } finally {
      setLoading(false);
      authInFlightRef.current = false;
    }
  };

  /* ── Forgot password ─────────────────────────────────── */
  const onForgotPassword = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim()) { setError('Enter your email above, then click "Forgot password?" again.'); return; }
    try {
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
      if (resetErr) { setError(resetErr.message || 'Could not send reset email.'); return; }
      setInfo('Password reset email sent. Check your inbox.');
    } catch (e: any) { setError(e?.message || 'Could not send reset email.'); }
  };

  /* ── Main sign-in ────────────────────────────────────── */
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authInFlightRef.current || loading) return;
    setError(null);
    setInfo(null);
    setProgress(null);
    setTouched({ email: true, password: true, mfa: false });

    if (!supabaseConfigured) {
      setError('Sign-in is temporarily unavailable because Supabase is not configured.');
      return;
    }
    if (!normalizedEmail || !emailValid) { setError('Please enter a valid email address.'); return; }
    if (!password || !passwordValid)     { setError('Password must be at least 6 characters.'); return; }
    if (offline) { setError('You appear to be offline. Please reconnect and try again.'); return; }
    try {
      const storage = mobileAuthHelper.checkStorageAvailability();
      if (!storage.localStorage && !storage.sessionStorage) {
        setError('Your browser is blocking storage. Please enable cookies/local storage and try again.');
        return;
      }
    } catch {}
    // Client-side cooldown check
    try {
      const until = parseInt(window.localStorage.getItem('iklp_signin_locked_until') ?? '0', 10);
      const remaining = Math.ceil((until - Date.now()) / 1000);
      if (remaining > 0) { setRetryIn(remaining); setError(`Too many attempts. Please wait ${remaining} seconds.`); return; }
    } catch {}

    persistRemember(rememberMe);
    authInFlightRef.current = true;
    setLoading(true);

    try {
      const isMobile =
        (() => {
          try {
            return mobileAuthHelper.isMobileBrowser() || mobileAuthHelper.isWebView();
          } catch {
            return false;
          }
        })();

      const finishSuccess = async (uid: string) => {
        setProgress('Finalizing sign-in…');

        // On mobile, always proceed even if getSession isn't immediately readable
        // because WebView storage can lag. The tokens were already set via setSession.
        if (!isMobile) {
          // Prime auth state quickly before route transition (desktop only).
          try {
            await withTimeout(supabase.auth.getUser(), 3500);
          } catch {}

          const session = await waitForSession();
          if (!session) {
            setError('Sign-in succeeded but your browser blocked the session. Please enable cookies/local storage and try again.');
            setLoading(false);
            setProgress(null);
            authInFlightRef.current = false;
            return;
          }
        }

        clearFailedAttempts();
        // Do not block redirect on profile provisioning.
        ensureUserProfile(uid).catch(() => {});

        let needsMfa = false;
        try {
          needsMfa = await withTimeout(beginMfaIfNeeded(), isMobile ? 2500 : 7000);
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
        const next = getNextPath();
        router.replace(next);
        router.refresh();

        // Mobile/webview safeguard: do one hard navigation so authenticated UI state
        // is guaranteed without requiring the user to manually refresh.
        if (isMobile && typeof window !== 'undefined') {
          window.setTimeout(() => {
            try {
              window.location.replace(next);
            } catch {}
          }, 650);
        }

        // Fallback for stubborn clients that may ignore client routing.
        if (typeof window !== 'undefined') {
          window.setTimeout(() => {
            try {
              if (window.location.pathname.startsWith('/signin')) {
                window.location.href = next;
              }
            } catch {}
          }, 900);
        }
      };

      if (isMobile) {
        try {
          setProgress('Contacting server…');
          const { res, json } = await fetchJsonWithTimeout(
            '/api/auth/signin',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: normalizedEmail, password }),
            },
            7000
          );

          if (res.ok) {
            const access_token = json?.access_token;
            const refresh_token = json?.refresh_token;
            const uid = json?.user?.id;
            if (access_token && refresh_token && uid) {
              setProgress('Saving session…');
              // On mobile, don't block on setSession — it can hang in WebViews.
              // Fire-and-forget and proceed immediately to redirect.
              if (isMobile) {
                supabase.auth.setSession({ access_token, refresh_token }).catch(() => {});
                await finishSuccess(uid);
                return;
              }
              await withTimeout(supabase.auth.setSession({ access_token, refresh_token }), 4000);
              await finishSuccess(uid);
              return;
            }
            // Tokens missing from API response — show error instead of falling through
            setError('Sign-in succeeded but session tokens were missing. Please try again.');
            setProgress(null);
            return;
          } else {
            const raw: string = json?.error ?? '';
            const waitFromApi: number | null = typeof json?.retryAfter === 'number' ? json.retryAfter : null;
            const wait = waitFromApi ?? parseRetrySeconds(raw) ?? (res.status === 429 ? 60 : null);
            if (wait && wait > 0) {
              const lockUntil = Date.now() + wait * 1000;
              try { window.localStorage.setItem('iklp_signin_locked_until', String(lockUntil)); } catch {}
              setRetryIn(wait);
              setError(`Too many requests. Please wait ${wait} seconds then try again.`);
              return;
            }
            // Show the server error directly instead of falling through to direct sign-in
            setError(raw || 'Sign-in failed. Please check your email and password.');
            setProgress(null);
            return;
          }
        } catch (err: any) {
          if (err?.name === 'AbortError') {
            setError('Sign-in is taking too long on this connection. Please try again.');
            setProgress(null);
            return;
          }
          // On network errors, fall through to direct Supabase sign-in as a fallback
        }
      }

      setProgress('Signing in…');
      const { data: directData, error: directErr } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        }),
        isMobile ? 5000 : 8000
      );

      if (!directErr && directData.session?.user?.id) {
        const directUid = directData.session.user.id;
        await finishSuccess(directUid);
        return;
      }

      const directMsg = directErr?.message || '';
      const directWait = parseRetrySeconds(directMsg) ?? ((directErr as any)?.status === 429 ? 60 : null);
      if (directWait && directWait > 0) {
        setProgress('Contacting server…');
        const { res, json } = await fetchJsonWithTimeout(
          '/api/auth/signin',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: normalizedEmail, password }),
          },
          7000
        );

        if (!res.ok) {
          const raw: string = json?.error ?? directMsg;
          const waitFromApi: number | null =
            typeof json?.retryAfter === 'number' ? json.retryAfter : null;
          const wait = waitFromApi ?? parseRetrySeconds(raw) ?? directWait;
          const lockUntil = Date.now() + wait * 1000;
          try { window.localStorage.setItem('iklp_signin_locked_until', String(lockUntil)); } catch {}
          setRetryIn(wait);
          setError(`Too many requests. Please wait ${wait} seconds then try again.`);
          return;
        }

        const access_token = json?.access_token;
        const refresh_token = json?.refresh_token;
        const uid = json?.user?.id;
        if (!access_token || !refresh_token || !uid) {
          const lockUntil = Date.now() + directWait * 1000;
          try { window.localStorage.setItem('iklp_signin_locked_until', String(lockUntil)); } catch {}
          setRetryIn(directWait);
          setError(`Too many requests. Please wait ${directWait} seconds then try again.`);
          setProgress(null);
          return;
        }

        setProgress('Saving session…');
        // On mobile, don't block on setSession — it can hang in WebViews.
        if (isMobile) {
          supabase.auth.setSession({ access_token, refresh_token }).catch(() => {});
          await finishSuccess(uid);
          return;
        }
        await withTimeout(supabase.auth.setSession({ access_token, refresh_token }), 4000);
        await finishSuccess(uid);
        return;
      }

      recordFailedAttempt();
      setError(directMsg || 'Sign-in failed. Please check your email and password.');
      setLoading(false);
      setProgress(null);
      authInFlightRef.current = false;
    } catch (err: any) {
      recordFailedAttempt();
      setError(err?.message || 'An unexpected error occurred. Please try again.');
      setLoading(false);
      setProgress(null);
      authInFlightRef.current = false;
    }
  };

  /* ── Render ──────────────────────────────────────────── */
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 py-10 bg-[#fdf8f3] pattern-islamic">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-stretch">

        {/* Left panel */}
        <div className="hidden md:flex flex-col justify-between rounded-2xl p-8 bg-gradient-to-br from-[#0d9488] to-[#115e59] text-white shadow-xl">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
              <Shield size={14} /> Secure Sign In
            </div>
            <h1 className="mt-5 text-3xl font-extrabold leading-tight">Welcome back</h1>
            <p className="mt-3 text-white/80">
              Sign in to continue your Islamic learning journey. Your progress and points are saved to your account.
            </p>
          </div>
          <div className="mt-8 flex gap-4 text-4xl">
            <span>🌙</span><span>📿</span><span>📖</span>
          </div>
        </div>

        {/* Right panel */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          className="w-full rounded-2xl bg-white shadow-xl border border-[#e5c9a3]/30 p-6 sm:p-8"
        >
          <div className="md:hidden mb-6">
            <h1 className="text-2xl font-extrabold text-[#6a422d]">Sign in</h1>
            <p className="mt-1 text-sm text-[#a1633a]">Continue learning where you left off.</p>
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

          {/* Social buttons removed */}

          {!mfaRequired ? (
            <form id="signin-form" onSubmit={onSubmit} className="space-y-4" noValidate>
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-[#6a422d] mb-1">Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="kid@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  className={`w-full rounded-xl border-2 px-4 py-3 interactive-focus touch-target transition ${
                    touched.email && !emailValid ? 'border-[#ff6b6b] bg-[#fff5f5]' : 'border-[#e5c9a3]/40'
                  }`}
                />
                {touched.email && !emailValid && (
                  <p className="mt-1 text-xs text-red-700">Enter a valid email address.</p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="password" className="block text-sm font-semibold text-[#6a422d]">Password</label>
                  <button type="button" onClick={onForgotPassword} className="text-xs font-semibold text-[#14b8a6] hover:underline interactive-focus touch-target">
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
                      touched.password && !passwordValid ? 'border-[#ff6b6b] bg-[#fff5f5]' : 'border-[#e5c9a3]/40'
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

              {/* Remember me */}
              <label className="flex items-center gap-2 text-sm text-[#6a422d] select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-[#e5c9a3] text-[#14b8a6] interactive-focus"
                />
                Keep me signed in
              </label>

              <button
                type="submit"
                disabled={!supabaseConfigured || loading || retryIn !== null}
                className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-[#14b8a6] to-[#0d9488] shadow-lg hover:shadow-xl transition-all transition-bouncy interactive-focus touch-target disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in…' : retryIn !== null ? `Please wait ${retryIn}s…` : 'Sign In'}
              </button>
              {loading && progress && (
                <div className="text-center text-xs text-[#a1633a]">{progress}</div>
              )}

              <p className="text-sm text-center text-[#6a422d]">
                New here?{' '}
                <Link href="/signup" className="text-[#14b8a6] font-semibold hover:underline">Create an account</Link>
              </p>
            </form>
          ) : (
            /* MFA form */
            <form onSubmit={onVerifyMfa} className="space-y-4">
              <div className="rounded-xl border border-[#e5c9a3]/30 bg-[#f9f0e6] px-4 py-3">
                <p className="text-sm font-semibold text-[#6a422d]">Two-factor authentication</p>
                <p className="mt-1 text-sm text-[#a1633a]">Enter the 6-digit code from your authenticator app.</p>
              </div>
              <div>
                <label htmlFor="mfa" className="block text-sm font-semibold text-[#6a422d] mb-1">2FA code</label>
                <input
                  id="mfa"
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, mfa: true }))}
                  className="w-full rounded-xl border-2 border-[#e5c9a3]/40 px-4 py-3 outline-none focus:ring-2 focus:ring-[#14b8a6] focus:border-[#14b8a6]"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-[#14b8a6] to-[#0d9488] shadow-lg hover:shadow-xl transition-all transition-bouncy interactive-focus touch-target disabled:opacity-50"
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
