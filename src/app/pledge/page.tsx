'use client';

import dynamic from 'next/dynamic';

const PledgeClient = dynamic(() => import('./PledgeClient'), { ssr: false });

export default function PledgePage() {
  return <PledgeClient />;
}
