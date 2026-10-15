import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Admin · Islam Media Central Kids Zone',
  description: 'Admin dashboards and tooling for Islam Media Central Kids Zone.',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {children}
    </div>
  );
}
