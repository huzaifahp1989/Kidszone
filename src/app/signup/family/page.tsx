'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface Learner {
  id: string;
  name: string;
  username: string;
  age: string;
  city: string;
  madrasahName: string;
}

export default function FamilySignupPage() {
  const [familyEmail, setFamilyEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [learners, setLearners] = useState<Learner[]>([
    { id: '1', name: '', username: '', age: '', city: '', madrasahName: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeInfo, setCodeInfo] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState<number | null>(null);

  useEffect(() => {
    if (resendIn === null || resendIn <= 0) return;
    const id = window.setInterval(() => {
      setResendIn((n) => (n === null || n <= 1 ? null : n - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendIn]);

  const addLearner = () => {
    const newId = String(Math.max(...learners.map(l => parseInt(l.id, 10)), 0) + 1);
    setLearners([
      ...learners,
      { id: newId, name: '', username: '', age: '', city: '', madrasahName: '' },
    ]);
  };

  const removeLearner = (id: string) => {
    if (learners.length > 1) {
      setLearners(learners.filter(l => l.id !== id));
    }
  };

  const updateLearner = (id: string, field: keyof Learner, value: string) => {
    setLearners(learners.map(l => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!familyEmail.trim()) {
      setError('Please enter family email.');
      return;
    }
    if (!familyEmail.includes('@')) {
      setError('Please enter a valid email.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    for (let i = 0; i < learners.length; i++) {
      const l = learners[i];
      if (!l.name.trim()) {
        setError(`Learner ${i + 1}: Please enter name.`);
        return;
      }
      if (l.name.trim().length < 2) {
        setError(`Learner ${i + 1}: Name must be at least 2 characters.`);
        return;
      }
      if (!l.username.trim()) {
        setError(`Learner ${i + 1}: Please enter username.`);
        return;
      }
      if (l.username.length < 3 || l.username.length > 20) {
        setError(`Learner ${i + 1}: Username must be 3-20 characters.`);
        return;
      }
      if (!/^[a-z0-9_]+$/.test(l.username.toLowerCase())) {
        setError(`Learner ${i + 1}: Username can only contain letters, numbers, and underscores.`);
        return;
      }
      if (!l.age.trim()) {
        setError(`Learner ${i + 1}: Please enter age.`);
        return;
      }
      const ageNum = parseInt(l.age, 10);
      if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
        setError(`Learner ${i + 1}: Please enter a valid age (1-120).`);
        return;
      }
      if (!l.city.trim()) {
        setError(`Learner ${i + 1}: Please enter city or town.`);
        return;
      }
    }

    setLoading(true);
    try {
      const normalizedEmail = familyEmail.trim().toLowerCase();
      const res = await fetch('/api/auth/signup-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'family',
          familyEmail: normalizedEmail,
          learners: learners.map(l => ({
            name: l.name.trim(),
            username: l.username.trim().toLowerCase(),
            age: parseInt(l.age, 10),
            city: l.city.trim(),
            madrasahName: l.madrasahName.trim() || null,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Could not send the verification code.');
        if (typeof data?.retryAfterSeconds === 'number') setResendIn(data.retryAfterSeconds);
        return;
      }

      setPendingEmail(normalizedEmail);
      setCode('');
      setCodeInfo(null);
      setAwaitingCode(true);
      setResendIn(45);
    } catch (err: any) {
      console.error('Family signup error:', err);
      setError(err?.message || 'Could not send the verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = code.replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setError('Enter the 6-digit code we emailed you.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail, code: cleanCode, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Could not verify that code.');
        return;
      }

      setAwaitingCode(false);
      setSuccess(true);
      window.location.href = '/?welcome=1&family=1';
    } catch (err: any) {
      console.error('Family verification error:', err);
      setError(err?.message || 'Could not verify that code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onResendCode = async () => {
    if (resendIn !== null) return;
    setError(null);
    setCodeInfo(null);

    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup-resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Could not resend the code.');
        if (typeof data?.retryAfterSeconds === 'number') setResendIn(data.retryAfterSeconds);
        return;
      }

      setCode('');
      setCodeInfo(`We sent a new code to ${pendingEmail}.`);
      setResendIn(45);
    } catch (err: any) {
      setError(err?.message || 'Could not resend the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 py-10 bg-teal-50 pattern-islamic">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-stretch">
        {/* Left Panel */}
        <div className="hidden md:flex flex-col justify-between rounded-2xl p-8 bg-gradient-to-br from-teal-600 to-teal-700 text-white shadow-xl">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
              <Shield size={14} /> Family Setup
            </div>
            <h1 className="mt-5 text-3xl font-extrabold leading-tight">Add Your Family</h1>
            <p className="mt-3 text-white/80">
              Create accounts for all your children with one email. Each child gets their own username and can earn points independently!
            </p>
          </div>
          <div className="mt-8 space-y-3 text-white/80 text-sm">
            <div className="flex items-center gap-2">
              <span>✅</span> One family email for all children
            </div>
            <div className="flex items-center gap-2">
              <span>✅</span> Unique usernames per learner
            </div>
            <div className="flex items-center gap-2">
              <span>✅</span> Independent point tracking
            </div>
            <div className="flex items-center gap-2">
              <span>✅</span> Up to 6 children per family
            </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="rounded-2xl p-8 bg-white shadow-lg">
          <form onSubmit={awaitingCode ? onVerifyCode : onSubmit} className="space-y-6">
            {!awaitingCode && (
              <>
            {/* Family Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Family Email</label>
              <input
                type="email"
                placeholder="parent@example.com"
                value={familyEmail}
                onChange={(e) => setFamilyEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="mt-1 text-xs text-gray-500">This email is shared by all children in your family</p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Learners */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-700">Learners</label>
                <span className="text-xs text-gray-500">{learners.length}/6</span>
              </div>

              <div className="space-y-4">
                {learners.map((learner, idx) => (
                  <motion.div
                    key={learner.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-700">Child {idx + 1}</h3>
                      {learners.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLearner(learner.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Full name"
                        value={learner.name}
                        onChange={(e) => updateLearner(learner.id, 'name', e.target.value)}
                        className="col-span-2 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <input
                        type="text"
                        placeholder="Username (3-20 chars)"
                        value={learner.username}
                        onChange={(e) => updateLearner(learner.id, 'username', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <input
                        type="number"
                        min="1"
                        max="120"
                        placeholder="Age"
                        value={learner.age}
                        onChange={(e) => updateLearner(learner.id, 'age', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <input
                        type="text"
                        placeholder="City/Town"
                        value={learner.city}
                        onChange={(e) => updateLearner(learner.id, 'city', e.target.value)}
                        className="col-span-2 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <input
                        type="text"
                        placeholder="Madrasah (optional)"
                        value={learner.madrasahName}
                        onChange={(e) => updateLearner(learner.id, 'madrasahName', e.target.value)}
                        className="col-span-2 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </motion.div>
                ))}
              </div>

              {learners.length < 6 && (
                <button
                  type="button"
                  onClick={addLearner}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-purple-300 rounded-lg text-purple-600 hover:bg-purple-50 text-sm font-semibold"
                >
                  <Plus size={16} /> Add Another Child
                </button>
              )}
            </div>

              </>
            )}

            {awaitingCode && (
              <div className="space-y-4">
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-teal-800 text-sm">
                  <p className="font-semibold mb-1">Check your email</p>
                  <p>
                    We sent a 6-digit verification code to <strong>{pendingEmail}</strong>. Enter it
                    below to create the family accounts.
                  </p>
                </div>

                {codeInfo && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                    {codeInfo}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Verification code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="w-full px-4 py-3 text-center text-2xl tracking-[0.4em] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || code.replace(/\D/g, '').length !== 6}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:shadow-lg disabled:opacity-50 transition-all"
                >
                  {loading ? 'Verifying...' : 'Verify & Create Accounts'}
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={onResendCode}
                    disabled={loading || resendIn !== null}
                    className="text-purple-600 font-semibold hover:underline disabled:opacity-50"
                  >
                    {resendIn !== null ? `Resend code in ${resendIn}s` : 'Resend code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAwaitingCode(false);
                      setCode('');
                      setCodeInfo(null);
                      setError(null);
                    }}
                    className="text-gray-500 hover:underline"
                  >
                    Change details
                  </button>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                ✅ Family accounts created successfully!
              </div>
            )}

            {/* Submit */}
            {!awaitingCode && (
              <button
                type="submit"
                disabled={loading || success}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded-lg hover:shadow-lg disabled:opacity-50 transition-all"
              >
                {loading ? 'Sending code...' : 'Send Verification Code'}
              </button>
            )}

            {/* Links */}
            <p className="text-center text-sm text-gray-600">
              Just one child?{' '}
              <Link href="/signup" className="text-purple-600 hover:underline font-semibold">
                Use regular signup
              </Link>
            </p>
            <p className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/signin" className="text-purple-600 hover:underline font-semibold">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
