'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Button } from '@/components';

export function CreateShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="page-inner">
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="outline" onClick={() => router.push('/create')}>
            ← Create hub
          </Button>
          <Link href="/" className="text-sm font-bold text-teal-700 underline-offset-2 hover:underline">
            Home
          </Link>
        </div>
        <h1 className="font-heading text-2xl font-extrabold text-sand-900 sm:text-3xl">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export function PointsBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900">
      {message}
    </p>
  );
}
