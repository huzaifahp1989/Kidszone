'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { ensureUserProfile } from '@/lib/user-profile';
import { mobileAuthHelper } from '@/lib/mobile-auth';
import { Shield, Eye, EyeOff } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [madrasahName, setMadrasahName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const code = new URLSearchParams(window.location.search).get('ref') || '';
    setReferralCode(code.trim().toUpperCase());
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setNeedsEmailConfirmation(false);

    if (!supabaseConfigured) {
      setError('Sign up is temporarily unavailable. Please try again later.');
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) return setError('Please enter your name.');
    if (trimmedName.length < 2) return setError('Name must be at least 2 characters.');

    const ageNumber = parseInt(age.trim(), 10);
    if (!age.trim() || Number.isNaN(ageNumber)) return setError('Please enter your age.');
    if (ageNumber < 1 || ageNumber > 120) return setError('Please enter a valid age.');

    const trimmedMadrasah = madrasahName.trim();
    if (!trimmedMadrasah) return setError('Please enter your madrasah name.');

    const contactDigits = contactNumber.replace(/\D/g, '');
    if (!contactDigits) return setError('Please enter your contact number.');
    if (contactDigits.length < 7 || contactDigits.length > 15) return setError('Please enter a valid contact number.');
    if (!email) return setError('Please enter your email.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirm) return setError('Passwords do not match.');

    try {
      setLoading(true);
      const emailNormalized = email.trim().toLowerCase();

      const storageCheck = mobileAuthHelper.checkStorageAvailability();
      if (!storageCheck.localStorage && !storageCheck.sessionStorage) {
        setError('Your browser is blocking storage. Please enable cookies/local storage and try again.');
        return;
      }

      const { data: signUpRes, error: signUpErr } = await supabase.auth.signUp({
        email: emailNormalized,
        password,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/signin?message=${encodeURIComponent('Please sign in after confirming your email.')}` : undefined,
          data: {
            name: trimmedName,
            age: ageNumber,
            madrasahName: trimmedMadrasah,
            contactNumber: contactNumber.trim(),
          },
        },
      });

      if (signUpErr) throw signUpErr;

      const sessionFromResponse = signUpRes.session ?? null;
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session ?? sessionFromResponse;

      if (!session?.user) {
        // Email confirmation required
        setNeedsEmailConfirmation(true);
        setSuccess(true);
        return;
      }

      const uid = session.user.id;

      // Update auth metadata
      await supabase.auth.updateUser({
        data: {
          name: trimmedName,
          age: ageNumber,
          madrasahName: trimmedMadrasah,
          contactNumber: contactNumber.trim(),
        },
      }).catch(() => {});

      // Create user profile
      const baseProfile = {
        uid,
        role: 'kid',
        name: trimmedName,
        age: ageNumber,
        madrasahname: trimmedMadrasah,
        email: emailNormalized,
        points: 0,
        weeklypoints: 0,
        monthlypoints: 0,
        level: 'Beginner',
      };

      const contactValue = contactNumber.trim();
      let profileRes = await supabase
        .from('users')
        .upsert({ ...baseProfile, contactnumber: contactValue }, { onConflict: 'uid', ignoreDuplicates: false })
        .select();

      if (profileRes.error?.code === '42703') {
        profileRes = await supabase
          .from('users')
          .upsert({ ...baseProfile, contact_number: contactValue }, { onConflict: 'uid', ignoreDuplicates: false })
          .select();
      }
      if (profileRes.error?.code === '42703') {
        profileRes = await supabase
          .from('users')
          .upsert(baseProfile, { onConflict: 'uid', ignoreDuplicates: false })
          .select();
      }

      if (profileRes.error) {
        console.error('Profile creation failed:', profileRes.error);
        throw profileRes.error;
      }

      // Handle referral code
      if (referralCode) {
        try {
          await fetch('/api/kids-zone/referrals/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: uid, referralCode }),
          });
        } catch {}
      }

      // Ensure user_points row exists
      await ensureUserProfile(uid).catch(() => {});

      setSuccess(true);

      // Instant redirect - use window.location for immediate navigation
      // This ensures the auth state is fully refreshed on the home page
      window.location.href = '/';

    } catch (err: any) {
      console.error('Signup error:', err);
      let msg = err?.message || 'Failed to sign up. Please try again.';

      if (err?.code === '42501') {
        msg = 'Database permission denied. Please contact support.';
      } else if (err?.code === '42703') {
        msg = 'Database column missing. Please contact support.';
      } else if (err?.code === 'unexpected_failure' || (err?.message && err.message.includes('Database error saving new user'))) {
        msg = 'Database error during signup. Please try again or contact support.';
      } else if (typeof msg === 'string' && msg.toLowerCase().includes('duplicate key')) {
        msg = 'That email is already registered. Try signing in instead.';
      } else if (err?.code === 'email_exists' || err?.code === '23505') {
        msg = 'That email is already registered. Try signing in instead.';
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 py-10 bg-[#fdf8f3] pattern-islamic">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-stretch">

        {/* Left panel */}
        <div className="hidden md:flex flex-col justify-between rounded-2xl p-8 bg-gradient-to-br from-[#14b8a6] to-[#0d9488] text-white shadow-xl">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
              <Shield size={14} /> Safe & Secure
            </div>
            <h1 className="mt-5 text-3xl font-extrabold leading-tight">Join Kids Zone</h1>
            <p className="mt-3 text-white/80">
              Create your account to start earning points, track your progress, and compete on the leaderboard!
            </p>
          </div>
          <div className="mt-8 space-y-3 text-white/80 text-sm">
            <div className="flex items-center gap-2"><span>✅</span> Daily Islamic quizzes</div>
            <div className="flex items-center gap-2"><span>✅</span> Fun educational games</div>
            <div className="flex items-center gap-2"><span>✅</span> Track Durood & Zikr</div>
            <div className="flex items-center gap-2"><span>✅</span> Weekly competitions</div>
          </div>
          <div className="mt-8 flex gap-4 text-4xl">
            <span>🌙</span><span>📿</span><span>📖</span>
          </div>
        </div>

        {/* Right panel - Form */}
        <div className="w-full rounded-2xl bg-white shadow-xl border border-[#e5c9a3]/30 p-6 sm:p-8">
          <div className="md:hidden mb-6">
            <h1 className="text-2xl font-extrabold text-[#6a422d]">Create Your Account</h1>
            <p className="mt-1 text-sm text-[#a1633a]">Start earning points for learning.</p>
          </div>

          {/* Help banner */}
          <div className="mb-4 rounded-xl border border-[#e5c9a3]/30 bg-[#f9f0e6] px-4 py-3 text-sm text-[#6a422d]">
            Having issues? WhatsApp{' '}
            <a className="font-bold text-[#14b8a6] hover:underline" href="https://wa.me/447404644610" target="_blank" rel="noopener noreferrer">
              07404644610
            </a>{' '}
            and we will send you login details.
          </div>

          {referralCode && (
            <div className="mb-4 rounded-xl bg-[#fffbeb] text-[#b45309] border border-[#fbbf24]/30 px-4 py-3 text-sm font-semibold">
              Referral code applied: <strong>{referralCode}</strong>
            </div>
          )}

          {!supabaseConfigured && (
            <div className="mb-4 rounded-xl bg-[#fff5f5] text-[#ff4757] border border-[#ff6b6b]/30 px-4 py-3 text-sm">
              Sign up is currently unavailable. Please try again later.
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl bg-[#fff5f5] text-[#ff4757] px-4 py-3 text-sm">
              <p className="font-bold mb-1">Signup Failed</p>
              <p>{error}</p>
            </div>
          )}

          {success && !needsEmailConfirmation && (
            <div className="mb-4 rounded-xl bg-[#f0fdfa] text-[#0d9488] px-4 py-3 text-sm font-semibold text-center">
              Successfully signed up! Redirecting…
            </div>
          )}

          {success && needsEmailConfirmation && (
            <div className="mb-4 rounded-xl bg-[#f0fdfa] text-[#0d9488] px-4 py-3 text-sm">
              <p className="font-bold mb-1">Check your email!</p>
              <p>We sent a confirmation link to your email. Please click it, then{' '}
                <Link href="/signin" className="font-bold underline">sign in</Link>.
              </p>
            </div>
          )}

          {!success && (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#6a422d] mb-1">Full name</label>
                <input
                  type="text"
                  className="w-full rounded-xl border-2 border-[#e5c9a3]/40 px-4 py-3 outline-none focus:ring-2 focus:ring-[#14b8a6] focus:border-[#14b8a6] transition"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Aisha Khan"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#6a422d] mb-1">Age</label>
                <input
                  type="number"
                  inputMode="numeric"
                  className="w-full rounded-xl border-2 border-[#e5c9a3]/40 px-4 py-3 outline-none focus:ring-2 focus:ring-[#14b8a6] focus:border-[#14b8a6] transition"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g., 10"
                  min={1}
                  max={120}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#6a422d] mb-1">Madrasah name</label>
                <input
                  type="text"
                  className="w-full rounded-xl border-2 border-[#e5c9a3]/40 px-4 py-3 outline-none focus:ring-2 focus:ring-[#14b8a6] focus:border-[#14b8a6] transition"
                  value={madrasahName}
                  onChange={(e) => setMadrasahName(e.target.value)}
                  placeholder="e.g., Al Qasswa Madrasah"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#6a422d] mb-1">Contact number</label>
                <input
                  type="tel"
                  className="w-full rounded-xl border-2 border-[#e5c9a3]/40 px-4 py-3 outline-none focus:ring-2 focus:ring-[#14b8a6] focus:border-[#14b8a6] transition"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="e.g., +44 7404 644610"
                  autoComplete="tel"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#6a422d] mb-1">Email</label>
                <input
                  type="email"
                  className="w-full rounded-xl border-2 border-[#e5c9a3]/40 px-4 py-3 outline-none focus:ring-2 focus:ring-[#14b8a6] focus:border-[#14b8a6] transition"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kid@example.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#6a422d] mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full rounded-xl border-2 border-[#e5c9a3]/40 px-4 py-3 pr-14 outline-none focus:ring-2 focus:ring-[#14b8a6] focus:border-[#14b8a6] transition"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a1633a] hover:text-[#14b8a6]"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#6a422d] mb-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="w-full rounded-xl border-2 border-[#e5c9a3]/40 px-4 py-3 pr-14 outline-none focus:ring-2 focus:ring-[#14b8a6] focus:border-[#14b8a6] transition"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a1633a] hover:text-[#14b8a6]"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!supabaseConfigured || loading}
                  className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-[#14b8a6] to-[#0d9488] shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating account…' : 'Sign Up'}
                </button>
              </div>

              <p className="text-xs text-[#a1633a] text-center">
                By signing up, you confirm you have parent/guardian permission.
              </p>

              <p className="text-sm text-center text-[#6a422d]">
                Already have an account?{' '}
                <Link href="/signin" className="text-[#14b8a6] font-semibold hover:underline">Sign in</Link>
              </p>
            </form>
          )}

          {success && needsEmailConfirmation && (
            <div className="mt-4 text-center">
              <Link
                href="/signin"
                className="inline-block px-6 py-3 bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                Go to Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
