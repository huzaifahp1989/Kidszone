"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { mobileAuthHelper } from '@/lib/mobile-auth';
import { supabase } from '@/lib/supabase';
import { ensureUserProfile } from '@/lib/user-profile';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { Eye, EyeOff, Shield, Lock, Github, Apple, Chrome, AlertTriangle } from 'lucide-react';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<{ email: boolean; password: boolean; captcha: boolean; mfa: boolean }>({
    email: false,
    password: false,
    captcha: false,
    mfa: false,
  });
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [captchaEnabled, setCaptchaEnabled] = useState(false);
  const [captchaA, setCaptchaA] = useState(0);
  const [captchaB, setCaptchaB] = useState(0);
  const [captchaAnswer, setCaptchaAnswer] = useState(0);
  const [captchaInput, setCaptchaInput] = useState('');
  const [offline, setOffline] = useState(false);

  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  useEffect(() => {
    // Detect mobile device and get device info
    const mobile = mobileAuthHelper.isMobileBrowser();
    const info = mobileAuthHelper.getDeviceInfo();
    setIsMobile(mobile);
    setDeviceInfo(info);
    
    console.log('📱 Device Info:', info);
    
    if (mobile) {
      console.log('📱 Mobile browser detected, enabling mobile optimizations');
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const msg = new URLSearchParams(window.location.search).get('message');
      if (msg) setInfo(msg);
    } catch {}
  }, []);

  const getNextPath = () => {
    if (typeof window === 'undefined') return '/';
    try {
      const next = new URLSearchParams(window.location.search).get('next');
      if (!next) return '/';
      return next.startsWith('/') ? next : '/';
    } catch {
      return '/';
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem('iklp_remember_me');
      setRememberMe(stored === null ? true : stored === 'true');
    } catch {}
  }, []);

  useEffect(() => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      setFailedAttempts(0);
      setLockUntil(null);
      setCaptchaEnabled(false);
      return;
    }
    try {
      const raw = window.localStorage.getItem(`iklp_login_state_${normalized}`);
      if (!raw) {
        setFailedAttempts(0);
        setLockUntil(null);
        setCaptchaEnabled(false);
        return;
      }
      const parsed = JSON.parse(raw);
      const count = typeof parsed?.count === 'number' ? parsed.count : 0;
      const until = typeof parsed?.lockUntil === 'number' ? parsed.lockUntil : null;
      setFailedAttempts(count);
      setLockUntil(until);
      setCaptchaEnabled(count >= 2);
    } catch {}
  }, [email]);

  useEffect(() => {
    if (!captchaEnabled) return;
    const a = Math.floor(Math.random() * 9) + 1;
    const b = Math.floor(Math.random() * 9) + 1;
    setCaptchaA(a);
    setCaptchaB(b);
    setCaptchaAnswer(a + b);
    setCaptchaInput('');
  }, [captchaEnabled]);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const emailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail), [normalizedEmail]);
  const passwordValid = useMemo(() => password.length >= 6, [password]);

  const passwordStrength = useMemo(() => {
    const p = password;
    let score = 0;
    if (p.length >= 8) score += 1;
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score += 1;
    if (/\d/.test(p)) score += 1;
    if (/[^a-zA-Z0-9]/.test(p)) score += 1;
    const label = score <= 1 ? 'Weak' : score === 2 ? 'Fair' : score === 3 ? 'Good' : 'Strong';
    const pct = (score / 4) * 100;
    const color =
      score <= 1 ? 'bg-red-500' : score === 2 ? 'bg-amber-500' : score === 3 ? 'bg-emerald-500' : 'bg-green-600';
    return { score, label, pct, color };
  }, [password]);

  const formatLockCountdown = (until: number) => {
    const ms = until - Date.now();
    if (ms <= 0) return null;
    const totalSec = Math.ceil(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const persistRememberChoice = (remember: boolean) => {
    try {
      window.localStorage.setItem('iklp_remember_me', remember ? 'true' : 'false');
      if (!remember) {
        const localKeys = Object.keys(window.localStorage);
        for (const key of localKeys) {
          if (key.includes('supabase') || key.includes('auth') || key.includes('sb-')) {
            window.localStorage.removeItem(key);
          }
        }
      }
    } catch {}
  };

  const recordAuthFailure = (emailKey: string) => {
    try {
      const key = `iklp_login_state_${emailKey}`;
      const raw = window.localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : null;
      const count = typeof parsed?.count === 'number' ? parsed.count : 0;
      const nextCount = count + 1;
      const lockForMs = nextCount >= 5 ? 10 * 60 * 1000 : 0;
      const nextLockUntil = lockForMs ? Date.now() + lockForMs : null;
      window.localStorage.setItem(key, JSON.stringify({ count: nextCount, lockUntil: nextLockUntil }));
      setFailedAttempts(nextCount);
      setLockUntil(nextLockUntil);
      setCaptchaEnabled(nextCount >= 2);
    } catch {}
  };

  const clearAuthFailures = (emailKey: string) => {
    try {
      window.localStorage.removeItem(`iklp_login_state_${emailKey}`);
    } catch {}
    setFailedAttempts(0);
    setLockUntil(null);
    setCaptchaEnabled(false);
  };

  const onForgotPassword = async () => {
    try {
      setError(null);
      setInfo(null);
      if (!email.trim()) {
        setError('Please enter your email above, then click “Forgot password?” again.');
        return;
      }
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
      if (resetErr) {
        console.error('Reset email error:', resetErr);
        setError(resetErr.message || 'Could not send reset email. Please try again.');
        return;
      }
      setInfo('Password reset email sent. Please check your inbox and open the link on this device.');
    } catch (e: any) {
      console.error('Reset email exception:', e);
      setError(e?.message || 'Could not send reset email. Please try again.');
    }
  };

  const onSocialLogin = async (provider: 'google' | 'github' | 'apple') => {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      persistRememberChoice(true);
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo },
      });
      if (oauthErr) {
        setError(oauthErr.message || 'Social sign-in failed. Please try again.');
      }
    } catch (e: any) {
      setError(e?.message || 'Social sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const beginMfaIfNeeded = async () => {
    try {
      const api: any = (supabase.auth as any).mfa;
      if (!api?.listFactors || !api?.challenge) return { required: false as const };
      const { data } = await api.listFactors();
      const allFactors: any[] = (data?.totp ?? data?.all ?? data?.factors ?? []) as any[];
      const verified = allFactors.find((f) => (f?.status ?? f?.verified) === 'verified' || f?.status === 'verified');
      if (!verified?.id) return { required: false as const };
      const { data: challengeData, error: challengeErr } = await api.challenge({ factorId: verified.id });
      if (challengeErr || !challengeData?.id) return { required: false as const };
      setMfaFactorId(verified.id);
      setMfaChallengeId(challengeData.id);
      setMfaRequired(true);
      setMfaCode('');
      setTouched((t) => ({ ...t, mfa: false }));
      return { required: true as const };
    } catch {
      return { required: false as const };
    }
  };

  const onVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setTouched((t) => ({ ...t, mfa: true }));
    if (!mfaFactorId || !mfaChallengeId) {
      setError('Two-factor session expired. Please sign in again.');
      setMfaRequired(false);
      return;
    }
    const code = mfaCode.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setLoading(true);
    try {
      const api: any = (supabase.auth as any).mfa;
      const { error: verifyErr } = await api.verify({
        factorId: mfaFactorId,
        challengeId: mfaChallengeId,
        code,
      });
      if (verifyErr) {
        recordAuthFailure(normalizedEmail);
        setError(verifyErr.message || 'Invalid code. Please try again.');
        return;
      }
      clearAuthFailures(normalizedEmail);
      setInfo('Signed in! Redirecting…');
      let confirmed = false;
      for (let i = 0; i < 6; i++) {
        const { data: chk } = await supabase.auth.getSession();
        if (chk.session?.user?.id) {
          confirmed = true;
          break;
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      router.replace(getNextPath());
    } catch (err: any) {
      setError(err?.message || 'Could not verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setTouched((t) => ({ ...t, email: true, password: true, captcha: true }));
    
    if (!normalizedEmail) {
      setError('Please enter your email.');
      return;
    }
    if (!emailValid) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    if (!passwordValid) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (lockUntil && lockUntil > Date.now()) {
      const countdown = formatLockCountdown(lockUntil);
      setError(`Too many attempts. Try again in ${countdown ?? 'a moment'}.`);
      return;
    }

    if (captchaEnabled) {
      const answer = Number(captchaInput);
      if (!Number.isFinite(answer) || answer !== captchaAnswer) {
        setError('Please complete the human check correctly.');
        return;
      }
    }

    persistRememberChoice(rememberMe);
    if (offline) {
      try {
        const payload = { email: normalizedEmail, password, ts: Date.now() };
        window.localStorage.setItem('iklp_pending_login', JSON.stringify(payload));
        setInfo('You are offline. Your login will retry automatically when you are back online.');
      } catch {}
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('🔐 Attempting sign in for:', email);
      console.log('📱 Device info:', deviceInfo);
      
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInErr) {
        recordAuthFailure(normalizedEmail);
        const msg = signInErr.message || 'Sign in failed. Please try again.';
        setError(msg);
        return;
      }

      const uid = data?.user?.id;
      if (!uid) {
        throw new Error('Sign-in succeeded but no user ID returned');
      }
      clearAuthFailures(normalizedEmail);

      const sessionFromResponse = data?.session ?? null;
      let { data: sessionData } = await supabase.auth.getSession();
      let effectiveSession = sessionData.session ?? sessionFromResponse;

      if (!effectiveSession && data?.session?.access_token && data?.session?.refresh_token) {
        const { data: setData, error: setErr } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        if (!setErr) {
          await new Promise((r) => setTimeout(r, 150));
          const after = await supabase.auth.getSession();
          effectiveSession = after.data.session ?? setData.session ?? sessionFromResponse;
        }
      }

      if (!effectiveSession) {
        setError('Sign in completed but your device blocked session storage. Please enable cookies/local storage and try again.');
        return;
      }

      await ensureUserProfile(uid);

      const mfa = await beginMfaIfNeeded();
      if (mfa.required) {
        setInfo('Enter your 2FA code to continue.');
        return;
      }

      setInfo('Signed in! Redirecting…');
      router.replace(getNextPath());
      
    } catch (err: any) {
      console.error('🚨 Unexpected sign-in error:', err);
      recordAuthFailure(normalizedEmail);
      const msg = err?.message || 'An unexpected error occurred. Please try again.';
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        try {
          const payload = { email: normalizedEmail, password, ts: Date.now() };
          window.localStorage.setItem('iklp_pending_login', JSON.stringify(payload));
          setInfo('You are offline. Your login was saved and will retry when you are back online.');
          setError(null);
        } catch {
          setError(msg);
        }
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const clearStorageAndRetry = async () => {
    try {
      mobileAuthHelper.clearAllStorage();
      setInfo('Storage cleared. Please try signing in again.');
      setError(null);
    } catch (err) {
      console.error('Error clearing storage:', err);
      setError('Failed to clear storage. Please try refreshing the page.');
    }
  };

  const countdown = lockUntil ? formatLockCountdown(lockUntil) : null;
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tryPending = async () => {
      try {
        const raw = window.localStorage.getItem('iklp_pending_login');
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (!saved?.email || !saved?.password) return;
        window.localStorage.removeItem('iklp_pending_login');
        setEmail(saved.email);
        setPassword(saved.password);
        setTouched((t) => ({ ...t, email: true, password: true }));
        const { data, error } = await supabase.auth.signInWithPassword({
          email: saved.email,
          password: saved.password,
        });
        if (error) {
          setError(error.message || 'Saved login failed. Please try again.');
          return;
        }
        const uid = data?.user?.id;
        if (!uid) return;
        await ensureUserProfile(uid);
        router.replace(getNextPath());
      } catch {}
    };
    const handler = () => tryPending();
    window.addEventListener('online', handler);
    return () => window.removeEventListener('online', handler);
  }, [router]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 py-10 bg-gradient-to-b from-islamic-light via-white to-white">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-stretch">
        <div className="hidden md:flex flex-col justify-between rounded-2xl p-8 bg-gradient-to-br from-indigo-700 to-purple-900 text-white shadow-xl">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
              <Shield size={14} />
              Secure Sign In
            </div>
            <h1 className="mt-5 text-3xl font-extrabold leading-tight">Welcome back</h1>
            <p className="mt-3 text-white/80">
              Sign in to continue your learning journey. Your account stays signed in until you log out.
            </p>
          </div>
          <div className="mt-10 space-y-3 text-sm text-white/80">
            <div className="flex items-start gap-2">
              <Lock size={16} className="mt-0.5" />
              <span>Protected with rate limiting, lockout, and optional 2FA.</span>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5" />
              <span>After multiple failed attempts, a quick human check appears.</span>
            </div>
          </div>
        </div>

        <div className="w-full rounded-2xl bg-white shadow-xl border border-slate-100 p-6 sm:p-8">
          <div className="md:hidden mb-6">
            <h1 className="text-2xl font-extrabold text-slate-900">Sign in</h1>
            <p className="mt-1 text-sm text-slate-600">Continue learning where you left off.</p>
          </div>

          {mounted && isMobile && (
            <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 text-blue-800 px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">Mobile tip</span>
                <button onClick={clearStorageAndRetry} className="text-xs font-semibold underline">
                  Clear storage
                </button>
              </div>
              <div className="mt-1 text-xs">
                If sign-in doesn’t stick, enable cookies/local storage in your browser settings.
              </div>
            </div>
          )}

          {(error || info) && (
            <div
              className={`mb-4 rounded-xl px-4 py-3 text-sm transition-all ${
                error ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'
              }`}
              role={error ? 'alert' : 'status'}
              aria-live="polite"
            >
              {error || info}
            </div>
          )}

          {countdown && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm" role="alert">
              Too many attempts. Try again in {countdown}.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <button
              type="button"
              onClick={() => onSocialLogin('google')}
              disabled={loading}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Chrome size={16} /> Google
            </button>
            <button
              type="button"
              onClick={() => onSocialLogin('github')}
              disabled={loading}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Github size={16} /> GitHub
            </button>
            <button
              type="button"
              onClick={() => onSocialLogin('apple')}
              disabled={loading}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Apple size={16} /> Apple
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-500">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {!mfaRequired ? (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-800 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className={`w-full rounded-xl border px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-islamic-blue ${
                    touched.email && !emailValid ? 'border-red-300 bg-red-50' : 'border-slate-200'
                  }`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                  placeholder="kid@example.com"
                  autoComplete="email"
                  aria-invalid={touched.email && !emailValid}
                />
                {touched.email && !emailValid && (
                  <div className="mt-1 text-xs text-red-700">Enter a valid email address.</div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-800 mb-1">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={onForgotPassword}
                    className="text-xs font-semibold text-islamic-blue hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className={`w-full rounded-xl border px-3 py-2.5 pr-11 outline-none transition focus:ring-2 focus:ring-islamic-blue ${
                      touched.password && !passwordValid ? 'border-red-300 bg-red-50' : 'border-slate-200'
                    }`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                    placeholder="Your password"
                    autoComplete="current-password"
                    aria-invalid={touched.password && !passwordValid}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-900"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="mt-2">
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full ${passwordStrength.color} transition-all`}
                      style={{ width: `${password ? passwordStrength.pct : 0}%` }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-600">
                    <span>Password strength: {password ? passwordStrength.label : '—'}</span>
                    <span className="tabular-nums">{password.length} chars</span>
                  </div>
                  {touched.password && !passwordValid && (
                    <div className="mt-1 text-xs text-red-700">Password must be at least 6 characters.</div>
                  )}
                </div>
              </div>

              {captchaEnabled && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-slate-800">Human check</div>
                  <div className="mt-1 text-sm text-slate-700">
                    What is {captchaA} + {captchaB}?
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    className={`mt-2 w-full rounded-xl border px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-islamic-blue ${
                      touched.captcha && captchaInput && Number(captchaInput) !== captchaAnswer ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
                    }`}
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, captcha: true }))}
                    placeholder="Enter answer"
                    aria-invalid={touched.captcha && captchaInput !== '' && Number(captchaInput) !== captchaAnswer}
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-4 pt-1">
                <label className="flex items-center gap-2 text-sm text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-islamic-blue focus:ring-islamic-blue"
                  />
                  Remember me
                </label>
                {failedAttempts > 0 && (
                  <div className="text-xs text-slate-500">
                    Attempts: <span className="tabular-nums">{failedAttempts}</span>/5
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Signing in…' : 'Sign In'}
                </Button>
              </div>

              <p className="text-sm text-center text-slate-600">
                New here?{' '}
                <Link href="/signup" className="text-islamic-blue font-semibold hover:underline">
                  Create an account
                </Link>
              </p>
            </form>
          ) : (
            <form onSubmit={onVerifyMfa} className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-sm font-semibold text-slate-900">Two-factor authentication</div>
                <div className="mt-1 text-sm text-slate-700">Enter the 6-digit code from your authenticator app.</div>
              </div>
              <div>
                <label htmlFor="mfa" className="block text-sm font-semibold text-slate-800 mb-1">
                  2FA code
                </label>
                <input
                  id="mfa"
                  type="text"
                  inputMode="numeric"
                  className={`w-full rounded-xl border px-3 py-2.5 outline-none transition focus:ring-2 focus:ring-islamic-blue ${
                    touched.mfa && !/^\d{6}$/.test(mfaCode.replace(/\s+/g, '')) ? 'border-red-300 bg-red-50' : 'border-slate-200'
                  }`}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, mfa: true }))}
                  placeholder="123456"
                  aria-invalid={touched.mfa && !/^\d{6}$/.test(mfaCode.replace(/\s+/g, ''))}
                />
                {touched.mfa && !/^\d{6}$/.test(mfaCode.replace(/\s+/g, '')) && (
                  <div className="mt-1 text-xs text-red-700">Enter a valid 6-digit code.</div>
                )}
              </div>
              <div className="pt-2">
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Verifying…' : 'Verify & Continue'}
                </Button>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setMfaRequired(false);
                  setMfaCode('');
                  setMfaChallengeId(null);
                  setMfaFactorId(null);
                }}
                className="w-full text-sm text-slate-600 hover:text-slate-900 underline disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Use a different account
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
