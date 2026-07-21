'use client';

import React from 'react';

export function AdminNotificationBadge({ count }: { count: number }) {
  if (!count || count <= 0) return null;

  const label = count > 99 ? '99+' : String(count);

  return (
    <span
      className="inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white shadow-sm ring-2 ring-white"
      aria-label={`${count} pending`}
    >
      {label}
    </span>
  );
}
