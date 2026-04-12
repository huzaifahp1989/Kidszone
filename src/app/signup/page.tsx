"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ensureUserProfile } from '@/lib/user-profile';
import { mobileAuthHelper } from '@/lib/mobile-auth';
import { Button } from '@/components/Button';

const DB_FIX_SQL = `-- QUICK FIX: Run the full repair script from the repo
-- In Supabase SQL Editor, paste the contents of SUPABASE_FIX_AWARD_POINTS.sql
-- Path in repo: SUPABASE_FIX_AWARD_POINTS.sql
-- This script creates users + users_points, trigger, RLS, grants, award_points RPC
-- Steps:
-- 1) Open Supabase SQL Editor
-- 2) Open SUPABASE_FIX_AWARD_POINTS.sql from your repo and copy all contents
-- 3) Paste and Run
-- 4) Re-try signup
`;

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [madrasahName, setMadrasahName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [debugUid, setDebugUid] = useState<string | null>(null);
  const [debugClaims, setDebugClaims] = useState<Record<string, any> | null>(null);
  const isDev = process.env.NODE_ENV !== 'production';
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setNeedsEmailConfirmation(false);

    const trimmedName = name.trim();
    if (!trimmedName) return setError('Please enter your name.');
    if (trimmedName.length < 2) return setError('Name must be at least 2 characters.');
    if (age === '' || Number.isNaN(age)) return setError('Please enter your age.');
    if (Number(age) < 5 || Number(age) > 14) return setError('Age must be between 5 and 14.');
    if (!madrasahName.trim()) return setError('Please enter your madrasah name.');
    if (!contactNumber.trim()) return setError('Please enter a contact number.');
    const contactDigits = contactNumber.replace(/\D/g, '');
    if (contactDigits.length < 7 || contactDigits.length > 15) {
      return setError('Please enter a valid contact number.');
    }
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
            age: Number(age),
            madrasahName: madrasahName.trim(),
            contactNumber: contactNumber.trim(),
          },
        },
      });

      if (signUpErr) throw signUpErr;

      const sessionFromResponse = signUpRes.session ?? null;
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session ?? sessionFromResponse;

      if (!session?.user) {
        setNeedsEmailConfirmation(true);
        setSuccess(true);
        setTimeout(() => {
          router.push('/signin?message=' + encodeURIComponent('Please confirm your email, then sign in.'));
        }, 1500);
        return;
      }

      const uid = session.user.id;
      setDebugUid(uid);
      setDebugClaims({ sub: session.user.id, email: session.user.email, role: session.user.role });

      const { error: metaErr } = await supabase.auth.updateUser({
        data: {
          name: trimmedName,
          age: Number(age),
          madrasahName: madrasahName.trim(),
          contactNumber: contactNumber.trim(),
        },
      });
      if (metaErr) {
        console.warn('Could not save name to auth metadata:', metaErr.message);
      }

      // Create user profile with provided details now that we have an authenticated session
      console.log('Creating profile for:', uid, email, name, age);
      const baseProfile = {
        uid,
        role: 'kid',
        name: trimmedName,
        age: Number(age),
        madrasahname: madrasahName.trim(),
        email: emailNormalized,
        points: 0,
        weeklypoints: 0,
        monthlypoints: 0,
        level: 'Beginner',
      };

      const upsertProfile = async (payload: Record<string, any>) => {
        return supabase
          .from('users')
          .upsert(payload, { onConflict: 'uid', ignoreDuplicates: false })
          .select();
      };

      const contactValue = contactNumber.trim();
      let profileRes = await upsertProfile({ ...baseProfile, contactnumber: contactValue });
      if (profileRes.error?.code === '42703') {
        profileRes = await upsertProfile({ ...baseProfile, contact_number: contactValue });
      }
      if (profileRes.error?.code === '42703') {
        profileRes = await upsertProfile({ ...baseProfile, contactNumber: contactValue });
      }
      if (profileRes.error?.code === '42703') {
        profileRes = await upsertProfile(baseProfile);
      }
      const { data: profileData, error: insertErr } = profileRes;
      
      if (insertErr) {
        console.error('Profile creation failed:', insertErr);
        throw insertErr;
      }
      console.log('Profile created:', profileData);

      setSuccess(true);
      
      setTimeout(() => {
        router.push('/');
      }, 800);
    } catch (err: any) {
      console.error('Signup process error FULL OBJECT:', err);
      let msg = err?.message || 'Failed to sign up. Please try again.';
      
      // More detailed error messages for common database issues
      if (err?.code === '42501') {
        msg = 'Database permission denied. Please run the FIX_SIGNUP_AND_DB_SCHEMA.sql script in Supabase.';
      } else if (err?.code === '42703') {
        msg = 'Database column missing. Please run the FIX_SIGNUP_AND_DB_SCHEMA.sql script in Supabase.';
      } else if (err?.code === 'unexpected_failure' || (err?.message && err.message.includes('Database error saving new user'))) {
        // This is often a generic 500 from Supabase/PostgREST.
        // It could mean the Trigger failed.
        msg = 'Database Error: The "handle_new_user" trigger likely failed. Please run FIX_SIGNUP_AND_DB_SCHEMA.sql in Supabase SQL Editor.';
      } else if (typeof msg === 'string' && msg.toLowerCase().includes('duplicate key')) {
        msg = 'That email is already registered. Try signing in instead.';
      } else if (err?.code === 'email_exists' || err?.code === '23505') {
        msg = 'That email is already registered. Try signing in instead.';
      } else if (err?.code === 'email_not_confirmed') {
        msg = 'Email not confirmed. Check your inbox or disable email confirmation in Supabase.';
      }
      
      // Append the actual error code for easier debugging
      if (err?.code) {
        msg += ` (Code: ${err.code})`;
      } else if (err?.details) {
         msg += ` (${err.details})`;
      }

      try {
        const storageCheck = mobileAuthHelper.checkStorageAvailability();
        const isMobile = mobileAuthHelper.isMobileBrowser();
        if (isMobile && (!storageCheck.localStorage && !storageCheck.sessionStorage)) {
          msg = 'Mobile browser storage is blocked. Enable cookies/local storage (and disable private mode) then try again.';
        }
      } catch {}

      setError(msg);
      setErrorCode(err?.code || err?.name || null);
      if (isDev) {
        console.error('Signup error', { code: err?.code, name: err?.name, message: err?.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const runSupabaseCheck = async () => {
    setChecking(true);
    setCheckResult(null);
    try {
      const res = await fetch('/api/admin/check-db', { cache: 'no-store' });
      const json = await res.json();
      setCheckResult(json);
    } catch (e: any) {
      setCheckResult({ error: e?.message || 'Failed to run check' });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 sm:px-6 py-8">
      <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2">Create Your Account</h1>
        <p className="text-center text-gray-600 mb-6 text-sm sm:text-base">For kids ages 5–14</p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm">
            <p className="font-bold text-lg">⚠️ Signup Failed</p>
            <p className="mb-2">{error}</p>
            
            {(errorCode === 'unexpected_failure' || error.includes('Database Error') || error.includes('database error')) && (
               <div className="mt-3 bg-white p-4 rounded border-2 border-red-500 shadow-lg animate-pulse-border">
                 <p className="text-sm font-bold text-red-600 mb-2 uppercase">
                   Action Required: Fix Database
                 </p>
                 <ol className="list-decimal list-inside text-sm space-y-2 mb-3 text-gray-800">
                   <li>
                     <a 
                       href="https://supabase.com/dashboard/project/jlqrbbqsuksncrxjcmbc/sql/new" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="text-blue-600 underline font-bold hover:text-blue-800"
                     >
                       Click here to open Supabase SQL Editor
                     </a>
                   </li>
                   <li>Copy the code below</li>
                   <li>Paste it into the SQL Editor</li>
                   <li>Click the green <strong>"Run"</strong> button</li>
                 </ol>
                 
                 <div className="relative">
                   <textarea 
                     readOnly 
                     className="w-full h-40 text-[11px] font-mono bg-gray-100 border border-gray-400 p-2 rounded focus:ring-2 focus:ring-red-500 focus:outline-none text-black"
                     value={DB_FIX_SQL}
                     onClick={(e) => e.currentTarget.select()}
                   />
                   <div className="absolute top-2 right-2 bg-white/80 px-2 py-1 rounded text-xs pointer-events-none">
                     Click to Select All
                   </div>
                 </div>
                 
                 <p className="text-xs text-center text-gray-500 mt-2 font-medium">
                   After running this, try signing up again.
                 </p>
               </div>
            )}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg bg-green-50 text-green-700 px-4 py-3 text-sm font-medium">
            ✓ Successfully signed up! {needsEmailConfirmation ? 'Please confirm your email, then sign in.' : 'Redirecting…'}
          </div>
        )}

        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold">Supabase check</div>
            <button
              type="button"
              onClick={runSupabaseCheck}
              disabled={checking}
              className="text-xs font-semibold underline disabled:opacity-60"
            >
              {checking ? 'Checking…' : 'Run check'}
            </button>
          </div>
          <div className="mt-2">
            Storage: {(() => {
              const s = mobileAuthHelper.checkStorageAvailability();
              return (s.localStorage || s.sessionStorage) ? 'OK' : 'Blocked';
            })()}
          </div>
          {checkResult && (
            <pre className="mt-2 max-h-40 overflow-auto rounded bg-white border border-slate-200 p-2">
              {JSON.stringify(checkResult, null, 2)}
            </pre>
          )}
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full name</label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-islamic-blue"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Aisha Khan"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Age</label>
            <div className="space-y-2">
              <input
                type="number"
                min={5}
                max={14}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-islamic-blue"
                value={age}
                onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Enter your age (5-14)"
              />
              {age !== '' && !Number.isNaN(Number(age)) && (
                <div className="text-sm">
                  <span className="text-gray-600">Level: </span>
                  {Number(age) >= 6 && Number(age) <= 8 && <span className="font-bold text-green-600">Explorers (Easy)</span>}
                  {Number(age) >= 9 && Number(age) <= 11 && <span className="font-bold text-blue-600">Champions (Medium)</span>}
                  {Number(age) >= 12 && Number(age) <= 14 && <span className="font-bold text-purple-600">Scholars (Advanced)</span>}
                  {(Number(age) < 6 || Number(age) > 14) && <span className="text-red-500">Please enter age between 6 and 14</span>}
                </div>
              )}
              <p className="text-xs text-gray-500">
                We customize your quizzes and games based on your age group:
                <br/>• 6-8: Fun & Easy
                <br/>• 9-11: Challenging
                <br/>• 12-14: Advanced
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Madrasah Name</label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-islamic-blue"
              value={madrasahName}
              onChange={(e) => setMadrasahName(e.target.value)}
              placeholder="e.g., Al Qasswa Madrasah"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Contact Number</label>
            <input
              type="tel"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-islamic-blue"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="e.g., +44 7400 000000"
              autoComplete="tel"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-islamic-blue"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kid@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-islamic-blue"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Confirm Password</label>
            <input
              type="password"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-islamic-blue"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              autoComplete="new-password"
            />
          </div>

          <div className="pt-2">
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating account…' : 'Sign Up'}
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            By signing up, you confirm you have parent/guardian permission.
          </p>

          <p className="text-sm text-center text-gray-600">
            Already have an account?{' '}
            <a href="/signin" className="text-islamic-blue font-semibold hover:underline">Sign in</a>
          </p>
        </form>

        {isDev && error && (
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
            <p className="font-semibold mb-2">Debug (dev only)</p>
            <div className="space-y-1 text-gray-700">
              <p><span className="font-medium">Error code:</span> {errorCode || 'n/a'}</p>
              <p><span className="font-medium">UID:</span> {debugUid || 'n/a'}</p>
              <p><span className="font-medium">Has token claims:</span> {debugClaims ? 'yes' : 'no'}</p>
              {debugClaims && (
                <details className="mt-2">
                  <summary className="cursor-pointer">Show claims JSON</summary>
                  <pre className="mt-2 overflow-auto bg-white p-2 rounded border text-xs">{JSON.stringify(debugClaims, null, 2)}</pre>
                </details>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
