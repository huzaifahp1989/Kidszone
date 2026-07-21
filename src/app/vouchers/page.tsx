'use client';

import React from 'react';
import { VoucherHub } from '@/components';

export default function VouchersPage() {
  return (
    <div className="page-inner">
      <div className="hero-panel mb-6 p-6 sm:p-8">
        <p className="badge-chip mb-3">Vouchers & Offers</p>
        <h1 className="font-heading text-3xl font-bold text-sand-900 sm:text-4xl">Browse and redeem exclusive vouchers</h1>
        <p className="mt-2 max-w-2xl text-sm text-sand-700 sm:text-base">
          Explore available offers, manage your active vouchers, and check your redemption history.
        </p>
      </div>
      <VoucherHub initialView="offers" />
    </div>
  );
}
