"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

const GOOGLE_FORM_VIEW_URL = 'https://docs.google.com/forms/d/1BUqre1m5LhF9ImlIgJ-C3s_r-2xV66M1y1WUWXmIfoY/viewform';

const shouldShowOnboardingForm = (meta: any): boolean => {
  const needs = meta?.needsSignupForm === true || meta?.needs_signup_form === true;
  const completedAt = meta?.signupFormCompletedAt || meta?.signup_form_completed_at;
  return needs && !completedAt;
};

export default function OnboardingFormPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);

  const embedUrl = useMemo(() => `${GOOGLE_FORM_VIEW_URL}?embedded=true`, []);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      if (!user?.id) return;
      const { data } = await supabase.auth.getUser();
      const meta = data.user?.user_metadata || {};
      const show = shouldShowOnboardingForm(meta);
      if (!mounted) return;
      setAllowed(show);
      if (!show) router.replace('/');
    };

    if (!loading && !user) {
      router.replace('/signin?next=/onboarding-form');
      return;
    }

    if (user?.id) {
      check();
    }

    return () => {
      mounted = false;
    };
  }, [loading, user, router]);

  const completeOnboarding = async () => {
    setSaving(true);
    setError(null);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({
        data: {
          needsSignupForm: false,
          signupFormCompletedAt: new Date().toISOString(),
        },
      });

      if (updateErr) throw updateErr;
      router.replace('/');
    } catch (err: any) {
      setError(err?.message || 'Could not save form completion. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || allowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f3ff] px-4">
        <p className="text-[#1e1b4b] font-semibold">Loading your form...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f3ff] px-4 py-6">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl border border-[#c4b5fd]/40 shadow-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-[#c4b5fd]/30">
          <h1 className="text-2xl font-extrabold text-[#1e1b4b]">Welcome! Please fill this form first</h1>
          <p className="text-sm text-[#475569] mt-1">New members need to complete this form before continuing.</p>
          <a
            href={GOOGLE_FORM_VIEW_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-3 text-sm font-bold text-[#6d28d9] hover:underline"
          >
            Open form in a new tab
          </a>
        </div>

        <div className="h-[70vh] min-h-[520px] bg-white">
          <iframe
            src={embedUrl}
            title="New User Form"
            className="w-full h-full border-0"
            loading="lazy"
          />
        </div>

        <div className="px-6 py-4 border-t border-[#c4b5fd]/30 bg-[#fffaf4] flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <p className="text-xs text-[#8b5a3c]">After submitting the form, click the button below.</p>
          <button
            onClick={completeOnboarding}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[#6d28d9] text-white font-bold hover:bg-[#0b7f75] disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'I have submitted the form'}
          </button>
        </div>

        {error && <p className="px-6 pb-5 text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
