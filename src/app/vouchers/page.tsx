'use client';

import React from 'react';
import { Navbar, VoucherHub } from '@/components';

export default function VouchersPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7fffc_0%,#fdf8f3_55%,#ffffff_100%)]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 rounded-[2rem] border border-[#dbe4ea] bg-white/90 p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#0f766e]">Vouchers & Offers</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">Browse and redeem exclusive vouchers</h1>
          <p className="mt-2 text-sm text-slate-600">Explore available offers, manage your active vouchers, and check your redemption history.</p>
        </div>
        <VoucherHub initialView="offers" />
      </main>
    </div>
  );
}
