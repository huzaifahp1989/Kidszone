'use client';

import React from 'react';
import { VoucherHub } from '@/components';

export default function MyVouchersPage() {
  return (
    <div className="page-inner">
      <div className="hero-panel mb-6 p-6 sm:p-8">
        <p className="badge-chip mb-3">My Vouchers</p>
        <h1 className="font-heading text-3xl font-bold text-sand-900 sm:text-4xl">Your active, used, and expired voucher history</h1>
        <p className="mt-2 max-w-2xl text-sm text-sand-700 sm:text-base">
          Open any voucher to copy the code, scan the QR, share it, or save the pass as an image.
        </p>
      </div>
      <VoucherHub initialView="history" />
    </div>
  );
}
