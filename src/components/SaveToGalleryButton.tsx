'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { authJsonFetch } from '@/lib/auth-headers';
import { tryUnlockStickersClient } from '@/lib/stickers-client';

export function SaveToGalleryButton({
  kind,
  title,
  getDataUrl,
  disabled,
}: {
  kind: 'coloring' | 'draw';
  title: string;
  getDataUrl: () => string | null;
  disabled?: boolean;
}) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onSave = async () => {
    if (!user?.id || disabled || busy) return;
    const dataUrl = getDataUrl();
    if (!dataUrl) {
      setMessage('Could not capture your artwork yet.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await authJsonFetch('/api/kids-zone/gallery', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, kind, title, imageDataUrl: dataUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || 'Could not save to gallery.');
        return;
      }
      setMessage('Saved to My Gallery!');
      await tryUnlockStickersClient(user.id, ['gallery_save']);
    } catch {
      setMessage('Could not connect. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1">
      {message && (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900">
          {message}
        </p>
      )}
      <button
        type="button"
        disabled={!user?.id || disabled || busy}
        onClick={onSave}
        className="rounded-xl border border-sand-200 bg-white px-4 py-2 font-bold text-sand-900 disabled:opacity-50"
      >
        {!user?.id ? 'Sign in to save' : busy ? 'Saving…' : 'Save to My Gallery'}
      </button>
    </div>
  );
}
