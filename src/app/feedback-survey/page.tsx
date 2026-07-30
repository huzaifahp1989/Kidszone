'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { CheckCircle2, ArrowLeft, Loader2, Star, MessageCircle, Phone, MapPin, User, Heart } from 'lucide-react';
import { getAuthFetchHeaders } from '@/lib/auth-headers';

type FormState = {
  fullName: string;
  age: string;
  city: string;
  phoneNumber: string;
  wantsReminder: boolean;
  feedbackText: string;
  howBenefiting: string;
};

const INITIAL: FormState = {
  fullName: '',
  age: '',
  city: '',
  phoneNumber: '',
  wantsReminder: false,
  feedbackText: '',
  howBenefiting: '',
};

export default function FeedbackSurveyPage() {
  const { user, profile } = useAuth();
  const [form, setForm] = useState<FormState>({
    ...INITIAL,
    fullName: (profile?.name as string) || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof FormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.fullName.trim()) { setError('Please enter your full name.'); return; }

    setSubmitting(true);
    try {
      const headers = await getAuthFetchHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch('/api/feedback/survey', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fullName: form.fullName,
          age: form.age ? Number(form.age) : null,
          city: form.city,
          phoneNumber: form.phoneNumber,
          wantsReminder: form.wantsReminder,
          feedbackText: form.feedbackText,
          howBenefiting: form.howBenefiting,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Could not submit. Please try again.');
        return;
      }
      setSubmitted(true);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full text-center bg-white rounded-3xl shadow-xl border border-emerald-100 p-10">
          <div className="flex justify-center mb-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-5xl">🎉</div>
          </div>
          <h2 className="text-2xl font-black text-emerald-900 mb-2">JazakAllah Khair!</h2>
          <p className="text-slate-600 mb-2">Your feedback has been submitted successfully.</p>
          <p className="text-sm text-emerald-700 font-semibold bg-emerald-50 rounded-xl px-4 py-2 mb-6">
            ✨ Once reviewed by our team, you will earn <strong>50 points</strong>!
          </p>
          <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 font-bold text-white hover:bg-emerald-600 transition">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const inputCls = "w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition placeholder:text-slate-400";
  const labelCls = "block text-xs font-black uppercase tracking-wide text-slate-600 mb-1.5";

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-emerald-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-slate-600 hover:text-violet-700 font-semibold text-sm transition">
          <ArrowLeft size={18} /> Back
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-emerald-500 text-3xl shadow-lg">
            📋
          </div>
          <h1 className="text-3xl font-black text-slate-900">Kids Zone Feedback</h1>
          <p className="mt-2 text-slate-600">Share your thoughts and earn <span className="font-black text-emerald-700">+50 points</span> when approved!</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-8 space-y-5">

          {/* Personal Details */}
          <div className="pb-2 border-b border-slate-100">
            <p className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-violet-700 mb-4">
              <User size={14} /> Your Details
            </p>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Full Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Aisha Hussain"
                  value={form.fullName}
                  onChange={set('fullName')}
                  required
                  className={inputCls}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Age</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    placeholder="e.g. 10"
                    value={form.age}
                    onChange={set('age')}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}><MapPin size={11} className="inline mr-1" />City</label>
                  <input
                    type="text"
                    placeholder="e.g. London"
                    value={form.city}
                    onChange={set('city')}
                    className={inputCls}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}><Phone size={11} className="inline mr-1" />Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 07700 900123"
                  value={form.phoneNumber}
                  onChange={set('phoneNumber')}
                  className={inputCls}
                />
              </div>

              {/* Reminder opt-in */}
              <label className="flex items-start gap-3 cursor-pointer select-none rounded-xl border-2 border-emerald-200 bg-emerald-50 p-3 hover:border-emerald-400 transition">
                <input
                  type="checkbox"
                  checked={form.wantsReminder}
                  onChange={e => setForm(f => ({ ...f, wantsReminder: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 rounded accent-emerald-500"
                />
                <span className="text-sm font-semibold text-emerald-900">
                  Yes, I want Kids Zone to remind me about daily tasks and activities! 🔔
                </span>
              </label>
            </div>
          </div>

          {/* Feedback */}
          <div className="pb-2 border-b border-slate-100">
            <p className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-violet-700 mb-4">
              <MessageCircle size={14} /> Your Feedback
            </p>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>How are you benefiting from Kids Zone?</label>
                <textarea
                  rows={3}
                  placeholder="e.g. My child has learned Surah Al-Ikhlas and improved their daily prayers..."
                  value={form.howBenefiting}
                  onChange={set('howBenefiting')}
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div>
                <label className={labelCls}>Any other feedback or suggestions?</label>
                <textarea
                  rows={3}
                  placeholder="e.g. I would love more Quran games, the quiz is amazing..."
                  value={form.feedbackText}
                  onChange={set('feedbackText')}
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>
          </div>

          {/* Points reminder */}
          <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <Star className="text-amber-500 fill-amber-400 shrink-0" size={20} />
            <p className="text-sm font-semibold text-amber-800">
              Submit your feedback to earn <strong>+50 points</strong> once our team approves it!
            </p>
          </div>

          {error && (
            <p className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-emerald-500 py-3.5 font-black text-white text-base shadow-lg transition hover:-translate-y-0.5 disabled:opacity-60 disabled:transform-none"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Heart size={18} />}
            {submitting ? 'Submitting…' : 'Submit Feedback'}
          </button>

          {!user && (
            <p className="text-center text-xs text-slate-400">
              <Link href="/signin?next=/feedback-survey" className="text-violet-600 font-semibold hover:underline">Sign in</Link> so we can link your points when approved.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
