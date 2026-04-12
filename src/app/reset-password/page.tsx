"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touched, setTouched] = useState({ password: false, confirm: false });

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

  const passwordValid = useMemo(() => password.length >= 6, [password]);
  const confirmValid = useMemo(() => confirmPassword === password && confirmPassword.length > 0, [confirmPassword, password]);

  useEffect(() => {
    const init = async () => {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const type = params.get('type');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      // Supabase client has detectSessionInUrl=true; it should auto set session from the URL.
      // Validate we have a session; if not, try to setSession when both tokens are present.
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user && type === 'recovery') {
        setIsValidSession(true);
        return;
      }

      if (type === 'recovery' && accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          console.error('❌ Failed to set recovery session:', error);
          setError('Invalid or expired reset link. Please request a new password reset.');
        } else if (data.session?.user) {
          setIsValidSession(true);
        }
        return;
      }

      setError('Invalid reset link. Please open the link from the password reset email.');
    };
    init();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTouched({ password: true, confirm: true });

    if (!password) {
      setError('Please enter a new password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('❌ Password update failed:', error);
        throw error;
      }

      console.log('✅ Password updated successfully');
      setSuccess(true);

      // Redirect to signin after a short delay
      setTimeout(() => {
        router.push('/signin?message=Password updated successfully. Please sign in with your new password.');
      }, 2000);

    } catch (err: any) {
      let msg = err?.message || 'Failed to update password. Please try again.';
      setError(msg);
      console.error('Password update error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 sm:px-6 py-8">
        <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-6 sm:p-8 text-center">
          <div className="text-green-500 text-6xl mb-4">✓</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2">Password Updated!</h1>
          <p className="text-center text-gray-600 mb-6 text-sm sm:text-base">
            Your password has been successfully updated. You will be redirected to the sign-in page shortly.
          </p>
        </div>
      </div>
    );
  }

  if (!isValidSession && !error) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 sm:px-6 py-8">
        <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-6 sm:p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-islamic-blue mx-auto mb-4"></div>
          <p className="text-center text-gray-600">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 sm:px-6 py-8">
      <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2">Reset Your Password</h1>
        <p className="text-center text-gray-600 mb-6 text-sm sm:text-base">
          Enter your new password below
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm" role="alert" aria-live="polite">{error}</div>
        )}

        {isValidSession && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`w-full rounded-lg border px-3 py-2 pr-11 focus:outline-none focus:ring-2 focus:ring-islamic-blue ${
                    touched.password && !passwordValid ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  minLength={6}
                  aria-invalid={touched.password && !passwordValid}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="mt-2">
                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full ${passwordStrength.color} transition-all`} style={{ width: `${password ? passwordStrength.pct : 0}%` }} />
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-gray-600">
                  <span>Password strength: {password ? passwordStrength.label : '—'}</span>
                  <span className="tabular-nums">{password.length} chars</span>
                </div>
                {touched.password && !passwordValid && (
                  <div className="mt-1 text-xs text-red-700">Password must be at least 6 characters.</div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  className={`w-full rounded-lg border px-3 py-2 pr-11 focus:outline-none focus:ring-2 focus:ring-islamic-blue ${
                    touched.confirm && !confirmValid ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  minLength={6}
                  aria-invalid={touched.confirm && !confirmValid}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {touched.confirm && !confirmValid && (
                <div className="mt-1 text-xs text-red-700">Passwords must match.</div>
              )}
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Updating Password…' : 'Update Password'}
              </Button>
            </div>
          </form>
        )}

        <p className="text-sm text-center text-gray-600 mt-6">
          Remember your password?{' '}
          <a href="/signin" className="text-islamic-blue font-semibold hover:underline">
            Sign in here
          </a>
        </p>
      </div>
    </div>
  );
}
