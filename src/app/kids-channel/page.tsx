'use client';

import { Suspense } from 'react';
import KidsChannelClient from './KidsChannelClient';

export default function KidsChannelRoute() {
  return (
    <Suspense
      fallback={
        <div className="page-inner">
          <div className="mx-auto max-w-6xl py-16 text-center text-sand-600">Loading Kids Channel…</div>
        </div>
      }
    >
      <KidsChannelClient />
    </Suspense>
  );
}
