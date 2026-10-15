'use client';

import React from 'react';
import { MessageCircle, Radio, Send } from 'lucide-react';
import { Modal } from '@/components/Modal';

const WHATSAPP_NUMBER = '447404644610';
const SESSION_KEY = 'live-session-popup-seen';
const BLOCKED_PATH_PREFIXES = ['/admin', '/signin', '/signup', '/reset-password'];

export function LiveSessionPopup({ pathname }: { pathname: string }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [age, setAge] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (BLOCKED_PATH_PREFIXES.some((path) => pathname.startsWith(path))) return;
    if (window.sessionStorage.getItem(SESSION_KEY)) return;

    const timer = window.setTimeout(() => setOpen(true), 3500);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  const close = () => {
    window.sessionStorage.setItem(SESSION_KEY, '1');
    setOpen(false);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const numericAge = Number(age);

    if (trimmedName.length < 2) {
      setError('Please enter the child\'s name.');
      return;
    }
    if (!Number.isInteger(numericAge) || numericAge < 1 || numericAge > 17) {
      setError('Please enter an age from 1 to 17.');
      return;
    }
    if (trimmedPhone.replace(/\D/g, '').length < 7) {
      setError('Please enter a valid WhatsApp number.');
      return;
    }

    const message = [
      'Assalamu alaikum, I would like my child to join the live sessions broadcast on Islam Media Radio and social media.',
      `Name: ${trimmedName}`,
      `Age: ${numericAge}`,
      `Contact number: ${trimmedPhone}`,
    ].join('\n');

    try {
      const response = await fetch('/api/live-session-signups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, age: numericAge, phoneNumber: trimmedPhone }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || 'We could not save your details. Please try again.');
        return;
      }
    } catch {
      setError('We could not save your details. Please check your connection and try again.');
      return;
    }

    window.sessionStorage.setItem(SESSION_KEY, '1');
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  return (
    <Modal isOpen={open} onClose={close} title="Join our live sessions" size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-teal-950">
          <Radio className="mt-0.5 shrink-0 text-teal-600" size={21} />
          <p className="text-sm font-semibold leading-relaxed">
            Share your child&apos;s details and we&apos;ll message you about live sessions on Islam Media Radio and our social channels.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm font-bold text-slate-700">
            Child&apos;s name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-semibold text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
              required
            />
          </label>

          <label className="block text-sm font-bold text-slate-700">
            Age
            <input
              type="number"
              min="1"
              max="17"
              value={age}
              onChange={(event) => setAge(event.target.value)}
              inputMode="numeric"
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-semibold text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
              required
            />
          </label>

          <label className="block text-sm font-bold text-slate-700">
            WhatsApp number
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="tel"
              placeholder="e.g. +44 7404 644610"
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 font-semibold text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
              required
            />
          </label>

          {error && <p className="text-sm font-bold text-rose-600" role="alert">{error}</p>}

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#2563eb] px-4 py-3.5 text-sm font-black text-white shadow-md transition hover:bg-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-green-300"
          >
            <MessageCircle size={19} />
            Continue to WhatsApp
            <Send size={16} />
          </button>
        </form>

        <button type="button" onClick={close} className="w-full text-sm font-bold text-slate-500 hover:text-slate-700">
          Maybe later
        </button>
      </div>
    </Modal>
  );
}