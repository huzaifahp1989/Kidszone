'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

type WinnerDetailsFormProps = {
  compact?: boolean;
  sectionId?: string;
};

const MADRASAH_COLUMNS = ['madrasahname', 'madrasah_name', 'madrasahName'];
const CONTACT_COLUMNS = ['contactnumber', 'contact_number', 'contactNumber'];
const CITY_COLUMNS = ['city', 'town', 'location'];
const ABOUT_COLUMNS = ['winner_note', 'winner_notes', 'about_me', 'about_text'];

const ABOUT_CACHE_KEY_PREFIX = 'winner-about-';

export function WinnerDetailsForm({ compact = false, sectionId }: WinnerDetailsFormProps) {
  const { user, profile, refreshProfile, updateLocalProfile } = useAuth() as any;

  const [name, setName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [city, setCity] = useState('');
  const [madrasahName, setMadrasahName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [about, setAbout] = useState('');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(profile?.name ?? '');
    setAge(typeof profile?.age === 'number' ? profile.age : '');
    setCity((profile as any)?.city ?? (profile as any)?.town ?? (profile as any)?.location ?? '');
    setMadrasahName(profile?.madrasahName ?? '');
    setParentEmail((profile as any)?.parentEmail ?? profile?.email ?? user?.email ?? '');
    setContactNumber(profile?.contactNumber ?? '');
  }, [profile, user?.email]);

  useEffect(() => {
    if (!user?.id) return;
    try {
      const cached = window.localStorage.getItem(`${ABOUT_CACHE_KEY_PREFIX}${user.id}`);
      if (cached) setAbout(cached);
    } catch {
      // Ignore localStorage read errors.
    }
  }, [user?.id]);

  const canSubmit = useMemo(() => {
    if (!user?.id) return false;
    if (!name.trim()) return false;
    if (!parentEmail.trim()) return false;
    if (!contactNumber.trim()) return false;
    return true;
  }, [user?.id, name, parentEmail, contactNumber]);

  const saveAboutFallback = () => {
    if (!user?.id) return;
    try {
      window.localStorage.setItem(`${ABOUT_CACHE_KEY_PREFIX}${user.id}`, about.trim());
    } catch {
      // Ignore localStorage write errors.
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    const cleanName = name.trim();
    const cleanCity = city.trim();
    const cleanMadrasah = madrasahName.trim();
    const cleanParentEmail = parentEmail.trim().toLowerCase();
    const cleanContact = contactNumber.trim();
    const cleanAbout = about.trim();

    if (!cleanName) {
      setError('Please enter your child name.');
      return;
    }

    if (!cleanParentEmail) {
      setError('Please enter a parent email so we can contact winners.');
      return;
    }

    if (!cleanContact) {
      setError('Please enter a contact number for winner announcements.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const { error: metaErr } = await supabase.auth.updateUser({
        data: {
          name: cleanName,
          age: age === '' ? null : Number(age),
          city: cleanCity || null,
          madrasahName: cleanMadrasah || null,
          contactNumber: cleanContact,
          parentEmail: cleanParentEmail || null,
          winnerAbout: cleanAbout || null,
          winnerFormSubmittedAt: new Date().toISOString(),
        },
      });
      if (metaErr) {
        // Non-blocking; DB profile update below is the source of truth.
      }

      const basePayload: Record<string, any> = {
        name: cleanName,
        age: age === '' ? null : Number(age),
        parent_email: cleanParentEmail || null,
      };

      let profileUpdated = false;
      let lastColumnError: any = null;

      for (const madrasahColumn of MADRASAH_COLUMNS) {
        for (const contactColumn of CONTACT_COLUMNS) {
          for (const cityColumn of CITY_COLUMNS) {
            const payload: Record<string, any> = {
              ...basePayload,
              [madrasahColumn]: cleanMadrasah || null,
              [contactColumn]: cleanContact,
              [cityColumn]: cleanCity || null,
            };

            const { error: updateError } = await supabase
              .from('users')
              .update(payload)
              .eq('uid', user.id);

            if (!updateError) {
              profileUpdated = true;
              break;
            }

            lastColumnError = updateError;
            if (updateError.code !== '42703') {
              throw updateError;
            }
          }
          if (profileUpdated) break;
        }
        if (profileUpdated) break;
      }

      if (!profileUpdated) {
        const { error: fallbackError } = await supabase
          .from('users')
          .update(basePayload)
          .eq('uid', user.id);

        if (fallbackError) {
          throw fallbackError;
        }

        if (lastColumnError) {
          setMessage('Basic winner details saved. Please update madrasah/contact fields from your profile if needed.');
        }
      }

      let aboutSavedToDatabase = false;
      if (cleanAbout) {
        for (const aboutColumn of ABOUT_COLUMNS) {
          const { error: aboutError } = await supabase
            .from('users')
            .update({ [aboutColumn]: cleanAbout })
            .eq('uid', user.id);

          if (!aboutError) {
            aboutSavedToDatabase = true;
            break;
          }

          if (aboutError.code !== '42703') {
            break;
          }
        }
      }

      saveAboutFallback();

      updateLocalProfile({
        name: cleanName,
        age: age === '' ? undefined : Number(age),
        madrasahName: cleanMadrasah,
        contactNumber: cleanContact,
        parentEmail: cleanParentEmail,
      });
      await refreshProfile();

      if (!message) {
        setMessage(
          aboutSavedToDatabase
            ? 'Winner contact details saved successfully.'
            : "Winner contact details saved successfully."
        );
      }
    } catch (submitError: any) {
      setError(submitError?.message || 'Could not save winner details right now. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!user?.id) {
    return (
      <section id={sectionId} className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
        <p className="font-semibold text-amber-900">Sign in to fill the winner contact form.</p>
        <Link
          href="/signin?next=%2Frewards%23winner-contact-form"
          className="mt-3 inline-flex rounded-lg bg-amber-500 px-4 py-2 font-bold text-white hover:bg-amber-600"
        >
          Sign In
        </Link>
      </section>
    );
  }

  return (
    <section id={sectionId} className="rounded-2xl border border-teal-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-800">Winner Contact Form</h3>
        <p className="text-sm text-gray-600 mt-1">
          Please fill this in so we can get to know your child better and contact your family if your child is selected as a winner.
        </p>
      </div>

      {message && <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>}
      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-gray-700">Child Full Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="e.g. Aisha Khan"
            required
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-gray-700">Age</span>
          <input
            type="number"
            min={5}
            max={14}
            value={age}
            onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="5-14"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-gray-700">Madrasah Name</span>
          <input
            value={madrasahName}
            onChange={(e) => setMadrasahName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="Your madrasah"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-gray-700">City / Town</span>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="e.g. Birmingham"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-gray-700">Parent Email</span>
          <input
            type="email"
            value={parentEmail}
            onChange={(e) => setParentEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="parent@example.com"
            required
          />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-semibold text-gray-700">Contact Number (WhatsApp preferred)</span>
          <input
            type="tel"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="07..."
            required
          />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm font-semibold text-gray-700">Tell us about your child (optional)</span>
          <textarea
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            className="min-h-24 w-full rounded-lg border border-gray-300 px-3 py-2"
            placeholder="Favourite Islamic topic, strengths, or anything you want us to know"
          />
        </label>

        <div className="md:col-span-2 flex items-center justify-end">
          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="rounded-lg bg-gradient-to-r from-[#0d9488] to-[#0f766e] px-5 py-2.5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Winner Details'}
          </button>
        </div>
      </form>
    </section>
  );
}
