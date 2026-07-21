'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { ensureUserProfile } from '@/lib/user-profile';
import { mobileAuthHelper } from '@/lib/mobile-auth';
import { assertValidUsername, normalizeFamilyEmail, normalizeUsername } from '@/lib/family-accounts';
import { authJsonFetch } from '@/lib/auth-headers';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

const ONBOARDING_FORM_PATH = '/onboarding-form';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [city, setCity] = useState('');
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
  const [usernameHint, setUsernameHint] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const code = new URLSearchParams(window.location.search).get('ref') || '';
    setReferralCode(code.trim().toUpperCase());
  }, []);

  useEffect(() => {
    const check = assertValidUsername(username);
    if (!username.trim()) {
      setUsernameHint(null);
      return;
    }
    if (!check.ok) {
      setUsernameHint(check.error);
      return;
    }

    const handle = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(check.username)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setUsernameHint(data?.error || 'Could not check username.');
          return;
        }
        setUsernameHint(data.available ? 'Username is available.' : 'That username is already taken.');
      } catch {
        setUsernameHint(null);
      }
    }, 400);

    return () => window.clearTimeout(handle);
  }, [username]);

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

    const usernameCheck = assertValidUsername(username);
    if (!usernameCheck.ok) return setError(usernameCheck.error);
    const normalizedUsername = usernameCheck.username;

    const ageNumber = parseInt(age.trim(), 10);
    if (!age.trim() || Number.isNaN(ageNumber)) return setError('Please enter your age.');
    if (ageNumber < 1 || ageNumber > 120) return setError('Please enter a valid age.');

    const trimmedCity = city.trim();
    if (!trimmedCity || trimmedCity.length < 2) return setError('Please enter your city or town.');
    const trimmedMadrasah = madrasahName.trim();
    const contactDigits = contactNumber.replace(/\D/g, '');

    if (!email) return setError('Please enter your family email.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirm) return setError('Passwords do not match.');

    try {
      setLoading(true);
      const emailNormalized = normalizeFamilyEmail(email);

      const availabilityRes = await fetch(`/api/auth/check-username?username=${encodeURIComponent(normalizedUsername)}`);
      const availability = await availabilityRes.json().catch(() => ({}));
      if (!availabilityRes.ok) {
        setError(availability?.error || 'Could not check username.');
        return;
      }
      if (!availability.available) {
        setError('That username is already taken. Please choose another.');
        return;
      }

      const storageCheck = mobileAuthHelper.checkStorageAvailability();
      if (!storageCheck.localStorage && !storageCheck.sessionStorage) {
        setError('Your browser is blocking storage. Please enable cookies/local storage and try again.');
        return;
      }

      const { data: signUpRes, error: signUpErr } = await supabase.auth.signUp({
        email: emailNormalized,
        password,
        options: {
          emailRedirectTo:
            typeof window !== 'undefined'
              ? `${window.location.origin}/signin?message=${encodeURIComponent('Please sign in after confirming your email.')}`
              : undefined,
          data: {
            name: trimmedName,
            username: normalizedUsername,
            family_email: emailNormalized,
            age: ageNumber,
            city: trimmedCity || undefined,
            madrasahName: trimmedMadrasah || undefined,
            contactNumber: contactNumber.trim() || undefined,
            needsSignupForm: false,
          },
        },
      });

      if (signUpErr) throw signUpErr;

      const sessionFromResponse = signUpRes.session ?? null;
      const userFromResponse = signUpRes.user ?? null;
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session ?? sessionFromResponse;

      if (!session?.user) {
        // Email confirmation required — Auth user may already exist; profile is ensured on first sign-in.
        if (!userFromResponse?.id) {
          setError('Account could not be created. Please try again.');
          return;
        }
        setNeedsEmailConfirmation(true);
        setSuccess(true);
        return;
      }

      const uid = session.user.id;

      await supabase.auth
        .updateUser({
          data: {
            name: trimmedName,
            username: normalizedUsername,
            family_email: emailNormalized,
            age: ageNumber,
            city: trimmedCity || undefined,
            madrasahName: trimmedMadrasah || undefined,
            contactNumber: contactNumber.trim() || undefined,
          },
        })
        .catch(() => {});

      const baseProfile = {
        uid,
        role: 'kid',
        name: trimmedName,
        username: normalizedUsername,
        family_email: emailNormalized,
        age: ageNumber,
        madrasahname: trimmedMadrasah || null,
        email: emailNormalized,
        points: 0,
        weeklypoints: 0,
        monthlypoints: 0,
        level: 'Beginner',
      };

      const contactValue = contactNumber.trim();
      let profileRes = await supabase
        .from('users')
        .upsert(
          contactValue
            ? { ...baseProfile, contactnumber: contactValue }
            : baseProfile,
          { onConflict: 'uid', ignoreDuplicates: false }
        )
        .select();

      if (profileRes.error?.code === '42703') {
        profileRes = await supabase
          .from('users')
          .upsert({ ...baseProfile, contact_number: contactValue }, { onConflict: 'uid', ignoreDuplicates: false })
          .select();
      }
      if (profileRes.error?.code === '42703') {
        // Older schema without username/family_email — retry without those columns.
        const { username: _u, family_email: _f, ...legacyProfile } = baseProfile;
        profileRes = await supabase
          .from('users')
          .upsert(legacyProfile, { onConflict: 'uid', ignoreDuplicates: false })
          .select();
      }

      // Auth account already exists — do not fail signup if client profile upsert hits RLS.
      // Server ensureUserProfile uses the service role and will create/patch the row.
      if (profileRes.error) {
        console.warn('Client profile upsert failed (continuing with ensure):', profileRes.error);
      } else {
        for (const cityColumn of ['city', 'town', 'location']) {
          if (!trimmedCity) break;
          const { error: cityErr } = await supabase.from('users').update({ [cityColumn]: trimmedCity }).eq('uid', uid);
          if (!cityErr) break;
          if (cityErr.code !== '42703') break;
        }
      }

      if (referralCode) {
        try {
          await authJsonFetch('/api/kids-zone/referrals/join', {
            method: 'POST',
            body: JSON.stringify({ userId: uid, referralCode }),
          });
        } catch {
          /* ignore referral failures */
        }
      }

      const ensured = await ensureUserProfile(uid).catch(() => false);
      if (!ensured && profileRes.error) {
        console.warn('ensureUserProfile also failed after signup');
      }

      setSuccess(true);
      window.location.href = '/?welcome=1';
    } catch (err: any) {
      console.error('Signup error:', err);
      let msg = err?.message || 'Failed to sign up. Please try again.';

      if (err?.code === '42501') {
        msg = 'Database permission denied. Please contact support or WhatsApp 07404644610.';
      } else if (err?.code === '42703') {
        msg = 'Database column missing. Please run SETUP_FAMILY_USERNAMES.sql in Supabase, then try again.';
      } else if (
        err?.code === 'unexpected_failure' ||
        (err?.message && err.message.includes('Database error saving new user'))
      ) {
        msg = 'Database error during signup. Please try again or WhatsApp 07404644610 for login details.';
      } else if (typeof msg === 'string' && msg.toLowerCase().includes('duplicate key')) {
        if (msg.toLowerCase().includes('username')) {
          msg = 'That username is already taken. Please choose another.';
        } else {
          msg =
            'That email is already registered. Sign in with your username, or add another child from Profile → Family after signing in.';
        }
      } else if (err?.code === 'email_exists' || err?.code === '23505' || /already registered|already been registered|user already exists/i.test(msg)) {
        msg =
          'That email is already registered. Sign in with your username, or add another child from Profile → Family after signing in.';
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 py-10 bg-[#f0fdfa] pattern-islamic">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-stretch">
        <div className="hidden md:flex flex-col justify-between rounded-2xl p-8 bg-gradient-to-br from-[#0d9488] to-[#0f766e] text-white shadow-xl">
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
            <div className="flex items-center gap-2">
              <span>✅</span> Daily Islamic quizzes
            </div>
            <div className="flex items-center gap-2">
              <span>✅</span> Fun educational games
            </div>
            <div className="flex items-center gap-2">
              <span>✅</span> Track Durood & Zikr
            </div>
            <div className="flex items-center gap-2">
              <span>✅</span> Weekly competitions
            </div>
          </div>
          <div className="mt-8 flex gap-4 text-4xl">
            <span>🌙</span>
            <span>📿</span>
            <span>📖</span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          className="w-full rounded-2xl bg-white shadow-xl border border-[#5eead4]/30 p-6 sm:p-8"
        >
          <div className="md:hidden mb-6">
            <h1 className="text-2xl font-extrabold text-[#134e4a]">Create Your Account</h1>
            <p className="mt-1 text-sm text-[#475569]">Start earning points for learning.</p>
          </div>

          <div className="mb-4 rounded-xl border border-[#5eead4]/30 bg-[#ccfbf1] px-4 py-3 text-sm text-[#134e4a]">
            Having issues? WhatsApp{' '}
            <a
              className="font-bold text-[#0d9488] hover:underline"
              href="https://wa.me/447404644610"
              target="_blank"
              rel="noopener noreferrer"
            >
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
            <div className="mb-4 rounded-xl bg-[#f0fdfa] text-[#0f766e] px-4 py-3 text-sm font-semibold text-center">
              Successfully signed up! Redirecting…
            </div>
          )}

          {success && needsEmailConfirmation && (
            <div className="mb-4 rounded-xl bg-[#f0fdfa] text-[#0f766e] px-4 py-3 text-sm">
              <p className="font-bold mb-1">Check your email!</p>
              <p>
                We sent a confirmation link to your email. Please click it, then{' '}
                <Link href="/signin" className="font-bold underline">
                  sign in
                </Link>
                .
              </p>
            </div>
          )}

          {!success && (
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#134e4a] mb-1">Full name</label>
                <input
                  type="text"
                  className="w-full rounded-xl border-2 border-[#5eead4]/40 px-4 py-3 interactive-focus touch-target transition"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Aisha Khan"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#134e4a] mb-1">Username</label>
                <input
                  type="text"
                  className="w-full rounded-xl border-2 border-[#5eead4]/40 px-4 py-3 interactive-focus touch-target transition"
                  value={username}
                  onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                  placeholder="e.g., aisha_k"
                  autoComplete="username"
                  minLength={3}
                  maxLength={20}
                />
                <p className="mt-1 text-xs text-[#475569]">
                  3–20 letters, numbers, or underscores. Brothers and sisters each need their own username.
                </p>
                {usernameHint && (
                  <p
                    className={`mt-1 text-xs font-semibold ${
                      usernameHint.includes('available') ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {usernameHint}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#134e4a] mb-1">Age</label>
                <input
                  type="number"
                  inputMode="numeric"
                  className="w-full rounded-xl border-2 border-[#5eead4]/40 px-4 py-3 interactive-focus touch-target transition"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g., 10"
                  min={1}
                  max={120}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#134e4a] mb-1">Madrasah name <span className="font-normal text-[#64748b]">(optional)</span></label>
                <input
                  type="text"
                  className="w-full rounded-xl border-2 border-[#5eead4]/40 px-4 py-3 interactive-focus touch-target transition"
                  value={madrasahName}
                  onChange={(e) => setMadrasahName(e.target.value)}
                  placeholder="e.g., Al Qasswa Madrasah"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#134e4a] mb-1">City / Town</label>
                <input
                  type="text"
                  className="w-full rounded-xl border-2 border-[#5eead4]/40 px-4 py-3 interactive-focus touch-target transition"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g., Birmingham"
                  required
                  minLength={2}
                  maxLength={80}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#134e4a] mb-1">Contact number <span className="font-normal text-[#64748b]">(optional)</span></label>
                <input
                  type="tel"
                  className="w-full rounded-xl border-2 border-[#5eead4]/40 px-4 py-3 interactive-focus touch-target transition"
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="e.g., +44 7404 644610"
                  autoComplete="tel"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#134e4a] mb-1">Family email</label>
                <input
                  type="email"
                  className="w-full rounded-xl border-2 border-[#5eead4]/40 px-4 py-3 interactive-focus touch-target transition"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="parent@example.com"
                  autoComplete="email"
                />
                <p className="mt-1 text-xs text-[#475569]">
                  One email for the family. Or use <Link href="/signup/family" className="text-[#0d9488] font-semibold hover:underline">family signup</Link> to add all children at once.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#134e4a] mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full rounded-xl border-2 border-[#5eead4]/40 px-4 py-3 pr-14 interactive-focus touch-target transition"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#0d9488] interactive-focus"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#134e4a] mb-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="w-full rounded-xl border-2 border-[#5eead4]/40 px-4 py-3 pr-14 interactive-focus touch-target transition"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#0d9488] interactive-focus"
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
                  className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-[#0d9488] to-[#0f766e] shadow-lg hover:shadow-xl transition-all transition-bouncy interactive-focus touch-target disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating account…' : 'Sign Up'}
                </button>
              </div>

              <p className="text-xs text-[#475569] text-center">
                By signing up, you confirm you have parent/guardian permission.
              </p>

              <p className="text-sm text-center text-[#134e4a]">
                Already have an account?{' '}
                <Link href="/signin" className="text-[#0d9488] font-semibold hover:underline">
                  Sign in
                </Link>
              </p>

              <p className="text-sm text-center text-[#475569]">
                Have multiple children?{' '}
                <Link href="/signup/family" className="text-[#0d9488] font-semibold hover:underline">
                  Create family accounts
                </Link>
              </p>
            </form>
          )}

          {success && needsEmailConfirmation && (
            <div className="mt-4 text-center">
              <Link
                href="/signin"
                className="inline-block px-6 py-3 bg-gradient-to-r from-[#0d9488] to-[#0f766e] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all transition-bouncy interactive-focus touch-target"
              >
                Go to Sign In
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
