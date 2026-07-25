'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CreateShell } from '@/components/CreateShell';
import { useAuth } from '@/lib/auth-context';
import { authFetch } from '@/lib/auth-headers';

type GalleryItem = {
  id: string;
  kind: string;
  title: string;
  imageUrl: string;
  createdAt: string;
};

export default function MyGalleryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch(`/api/kids-zone/gallery?userId=${user.id}`);
      const data = await res.json();
      if (res.ok) setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <CreateShell title="My Gallery">
      <p className="text-sm text-sand-600">
        Artworks you saved from colouring and drawing. Show a parent — or make more in{' '}
        <Link href="/create" className="font-bold text-teal-700 underline">
          Create & Play
        </Link>
        .
      </p>
      {!user?.id && <p className="font-semibold text-amber-800">Sign in to see your gallery.</p>}
      {loading && <p className="text-sand-500">Loading…</p>}
      {!loading && user?.id && items.length === 0 && (
        <p className="rounded-2xl border border-sand-200 bg-white px-4 py-6 text-center text-sand-600">
          No saved art yet. Colour or draw, then tap <strong>Save to My Gallery</strong>.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <figure key={item.id} className="overflow-hidden rounded-3xl border border-sand-200 bg-white shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.imageUrl} alt={item.title} className="h-48 w-full object-contain bg-sand-50" />
            <figcaption className="space-y-1 px-3 py-2">
              <p className="font-extrabold text-sand-900">{item.title}</p>
              <p className="text-xs font-semibold uppercase text-sand-500">
                {item.kind} · {new Date(item.createdAt).toLocaleDateString()}
              </p>
            </figcaption>
          </figure>
        ))}
      </div>
    </CreateShell>
  );
}
