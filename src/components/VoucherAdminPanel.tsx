'use client';

/* eslint-disable @next/next/no-img-element */

import React, { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  BellRing,
  CheckCircle2,
  Clock3,
  Gift,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Save,
  Search,
  Shield,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import { defaultVoucherForm } from '@/lib/vouchers';
import type { VoucherFormInput, VoucherOffer } from '@/types/vouchers';

type AdminVoucherPayload = {
  offers: VoucherOffer[];
  analytics: any;
  gallery: any[];
  notifications: any[];
  logs: any[];
};

type RedemptionRow = {
  id: string;
  voucher_title: string;
  business_name: string;
  voucher_code: string;
  status: string;
  redeemed_at: string;
  expires_at: string;
  approved_at: string | null;
  used_at: string | null;
  user_id: string;
  approval_notes?: string | null;
};

type AdminUserSearchRow = {
  uid: string;
  name?: string;
  email?: string;
  city?: string;
};

const IMAGE_UPLOAD_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

function toDateTimeLocalValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function isAllowedAssetUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return true;

  try {
    const parsed = new URL(trimmed);
    return /\.(jpe?g|png|webp)$/i.test(parsed.pathname);
  } catch {
    const normalized = trimmed.split(/[?#]/)[0];
    return /\.(jpe?g|png|webp)$/i.test(normalized);
  }
}

async function uploadAsset(file: File, folder: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const res = await fetch('/api/admin/vouchers/upload', {
    method: 'POST',
    headers: { 'x-admin-auth': 'true' },
    body: formData,
  });
  const payload = await res.json();
  if (!res.ok) throw new Error(payload.error || 'Upload failed');
  return payload.url as string;
}

export function VoucherAdminPanel() {
  const [payload, setPayload] = useState<AdminVoucherPayload | null>(null);
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [redemptionLoading, setRedemptionLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'scheduled' | 'expired' | 'inactive'>('all');
  const [editingOffer, setEditingOffer] = useState<VoucherOffer | null>(null);
  const [form, setForm] = useState<VoucherFormInput>(defaultVoucherForm());
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [processingRedemption, setProcessingRedemption] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [grantVoucherId, setGrantVoucherId] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<AdminUserSearchRow[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserSearchRow | null>(null);
  const [grantingVoucher, setGrantingVoucher] = useState(false);

  const loadAdmin = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/vouchers?includeExpired=true&search=${encodeURIComponent(search)}`, {
        headers: { 'x-admin-auth': 'true' },
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load vouchers');
      setPayload(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load voucher admin dashboard');
    } finally {
      setLoading(false);
    }
  }, [search]);

  const loadRedemptions = useCallback(async () => {
    setRedemptionLoading(true);
    try {
      const res = await fetch('/api/admin/vouchers/redemptions?status=all', {
        headers: { 'x-admin-auth': 'true' },
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load redemptions');
      setRedemptions(Array.isArray(data.redemptions) ? data.redemptions : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load redemption queue');
    } finally {
      setRedemptionLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdmin();
    loadRedemptions();
  }, [loadAdmin, loadRedemptions]);

  useEffect(() => {
    if (!grantVoucherId && payload?.offers?.length) {
      const defaultOffer = payload.offers.find((offer) => offer.status === 'active') || payload.offers[0];
      setGrantVoucherId(defaultOffer?.id || '');
    }
  }, [payload?.offers, grantVoucherId]);

  useEffect(() => {
    const trimmed = userQuery.trim();
    if (trimmed.length < 2) {
      setUserResults([]);
      setSearchingUsers(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const res = await fetch(`/api/admin/users?q=${encodeURIComponent(trimmed)}`, {
          headers: { 'x-admin-auth': 'true' },
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to search users');
        const users = Array.isArray(data.users) ? data.users : [];
        setUserResults(
          users.slice(0, 8).map((user: any) => ({
            uid: String(user.uid || ''),
            name: String(user.name || ''),
            email: String(user.email || ''),
            city: String(user.city || user.town || user.location || ''),
          }))
        );
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setError(err?.message || 'Failed to search users');
        }
      } finally {
        setSearchingUsers(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [userQuery]);

  const filteredOffers = useMemo(() => {
    const offers = payload?.offers || [];
    return offers.filter((offer) => {
      const matchesStatus = statusFilter === 'all' ? true : offer.status === statusFilter;
      const text = [offer.title, offer.businessName, offer.description, offer.discountLabel].join(' ').toLowerCase();
      const matchesSearch = search.trim() ? text.includes(search.trim().toLowerCase()) : true;
      return matchesStatus && matchesSearch;
    });
  }, [payload?.offers, search, statusFilter]);

  const openCreate = () => {
    setEditingOffer(null);
    setForm(defaultVoucherForm());
  };

  const applyWeeklyPreset = () => {
    const start = new Date();
    const end = addDays(start, 7);
    setEditingOffer(null);
    setForm((prev) => ({
      ...defaultVoucherForm(),
      ...prev,
      title: prev.title || 'Weekly Voucher',
      discountLabel: prev.discountLabel || 'Weekly special',
      startDate: toDateTimeLocalValue(start),
      expiryDate: toDateTimeLocalValue(end),
      perUserLimit: 1,
      periodLimitWindow: 'weekly',
      publicVisible: true,
      active: true,
    }));
    setActionMessage('Weekly preset applied. Add image/details and save.');
  };

  const openEdit = (offer: VoucherOffer) => {
    setEditingOffer(offer);
    setForm({
      id: offer.id,
      title: offer.title,
      businessName: offer.businessName,
      description: offer.description,
      termsAndConditions: offer.termsAndConditions,
      expiryDate: offer.expiryDate.slice(0, 16),
      startDate: offer.startDate?.slice(0, 16) || '',
      discountType: offer.discountType,
      discountLabel: offer.discountLabel,
      approvalMode: offer.approvalMode,
      audience: offer.audience,
      logoUrl: offer.logoUrl || '',
      imageUrl: offer.imageUrl || '',
      bannerUrl: offer.bannerUrl || '',
      locationLabel: offer.locationLabel || '',
      winnersLimit: offer.winnersLimit,
      maxRedemptions: offer.maxRedemptions,
      perUserLimit: offer.perUserLimit,
      periodLimit: offer.periodLimit,
      periodLimitWindow: offer.periodLimitWindow,
      minPoints: offer.minPoints,
      minActivities: offer.minActivities,
      publicVisible: offer.publicVisible,
      imageOnly: offer.imageOnly,
      manualApprovalRequired: offer.manualApprovalRequired,
      featured: offer.featured,
      qrEnabled: offer.qrEnabled,
      active: offer.status !== 'inactive',
    });
  };

  const duplicateForNextWeek = (offer: VoucherOffer) => {
    const offerStart = offer.startDate ? new Date(offer.startDate) : new Date();
    const offerEnd = offer.expiryDate ? new Date(offer.expiryDate) : addDays(offerStart, 7);

    setEditingOffer(null);
    setForm({
      id: undefined,
      title: offer.title,
      businessName: offer.businessName,
      description: offer.description,
      termsAndConditions: offer.termsAndConditions,
      expiryDate: toDateTimeLocalValue(addDays(offerEnd, 7)),
      startDate: toDateTimeLocalValue(addDays(offerStart, 7)),
      discountType: offer.discountType,
      discountLabel: offer.discountLabel,
      approvalMode: offer.approvalMode,
      audience: offer.audience,
      logoUrl: offer.logoUrl || '',
      imageUrl: offer.imageUrl || '',
      bannerUrl: offer.bannerUrl || '',
      locationLabel: offer.locationLabel || '',
      winnersLimit: offer.winnersLimit,
      maxRedemptions: offer.maxRedemptions,
      perUserLimit: offer.perUserLimit,
      periodLimit: offer.periodLimit,
      periodLimitWindow: offer.periodLimitWindow || 'weekly',
      minPoints: offer.minPoints,
      minActivities: offer.minActivities,
      publicVisible: offer.publicVisible,
      imageOnly: offer.imageOnly,
      manualApprovalRequired: offer.manualApprovalRequired,
      featured: offer.featured,
      qrEnabled: offer.qrEnabled,
      active: true,
    });
    setActionMessage(`Copied "${offer.title}" to next week. Save to publish it.`);
  };

  const saveOffer = async () => {
    const normalizedForm: VoucherFormInput = {
      ...form,
    };

    if (normalizedForm.imageOnly) {
      if (!normalizedForm.imageUrl.trim()) {
        normalizedForm.imageUrl = normalizedForm.bannerUrl.trim() || normalizedForm.logoUrl.trim();
      }
      if (!normalizedForm.title.trim()) normalizedForm.title = 'Voucher Poster';
      if (!normalizedForm.businessName.trim()) normalizedForm.businessName = 'Partner Offer';
      if (!normalizedForm.description.trim()) normalizedForm.description = 'Image-only voucher poster. Details can be added later.';
      if (!normalizedForm.termsAndConditions.trim()) normalizedForm.termsAndConditions = 'Refer to the voucher poster image for details.';
      if (!normalizedForm.discountLabel.trim()) normalizedForm.discountLabel = 'See poster';
      if (!normalizedForm.expiryDate) {
        const oneYearAhead = new Date();
        oneYearAhead.setFullYear(oneYearAhead.getFullYear() + 1);
        normalizedForm.expiryDate = oneYearAhead.toISOString().slice(0, 16);
      }
    }

    const hasAnyImage = Boolean(normalizedForm.logoUrl.trim() || normalizedForm.imageUrl.trim() || normalizedForm.bannerUrl.trim());
    if (!hasAnyImage) {
      setError('Add at least one image URL (logo, promotional image, or banner) before saving.');
      return;
    }

    if (!normalizedForm.expiryDate.trim()) {
      setError('Expiry date is required before saving this voucher.');
      return;
    }

    const allImageFields = [normalizedForm.logoUrl, normalizedForm.imageUrl, normalizedForm.bannerUrl].filter(Boolean);
    if (allImageFields.some((url) => !isAllowedAssetUrl(url))) {
      setError('Only JPG/JPEG, PNG, or WebP image URLs are allowed for vouchers.');
      return;
    }

    setSaving(true);
    try {
      const method = editingOffer ? 'PUT' : 'POST';
      const body = editingOffer ? { ...normalizedForm, id: editingOffer.id } : normalizedForm;
      const res = await fetch('/api/admin/vouchers', {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-auth': 'true',
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save voucher');
      await loadAdmin();
      openCreate();
    } catch (err: any) {
      setError(err?.message || 'Failed to save voucher');
    } finally {
      setSaving(false);
    }
  };

  const deleteOffer = async (offer: VoucherOffer) => {
    if (!window.confirm(`Delete ${offer.title}?`)) return;
    try {
      const res = await fetch(`/api/admin/vouchers?id=${offer.id}`, {
        method: 'DELETE',
        headers: { 'x-admin-auth': 'true' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete voucher');
      await loadAdmin();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete voucher');
    }
  };

  const handleUpload = async (field: 'logoUrl' | 'imageUrl' | 'bannerUrl', event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const typeOk = file.type ? IMAGE_UPLOAD_TYPES.has(file.type.toLowerCase()) : false;
    const nameOk = /\.(jpe?g|png|webp)$/i.test(file.name || '');
    if (!typeOk && !nameOk) {
      setError('Only JPG/JPEG, PNG, or WebP files can be uploaded for vouchers.');
      event.target.value = '';
      return;
    }
    setUploadingField(field);
    try {
      const url = await uploadAsset(file, field);
      setForm((prev) => ({ ...prev, [field]: url }));
    } catch (err: any) {
      setError(err?.message || 'Failed to upload asset');
    } finally {
      setUploadingField(null);
      event.target.value = '';
    }
  };

  const updateRedemption = async (redemptionId: string, action: 'approve' | 'mark_used' | 'cancel') => {
    setProcessingRedemption(redemptionId);
    try {
      const res = await fetch('/api/admin/vouchers/redemptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-auth': 'true',
        },
        body: JSON.stringify({ redemptionId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update redemption');
      await loadAdmin();
      await loadRedemptions();
    } catch (err: any) {
      setError(err?.message || 'Failed to update redemption');
    } finally {
      setProcessingRedemption(null);
    }
  };

  const grantVoucherToUser = async () => {
    if (!grantVoucherId) {
      setError('Select a voucher to assign.');
      return;
    }
    if (!selectedUser?.uid) {
      setError('Search and select a user first.');
      return;
    }

    setGrantingVoucher(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/admin/vouchers/grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-auth': 'true',
        },
        body: JSON.stringify({
          voucherId: grantVoucherId,
          userId: selectedUser.uid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign voucher');

      const grantedCode = data?.redemption?.voucherCode || 'generated';
      setActionMessage(`Voucher assigned to ${selectedUser.name || selectedUser.email || selectedUser.uid} (${grantedCode}).`);
      await loadAdmin();
      await loadRedemptions();
    } catch (err: any) {
      setError(err?.message || 'Failed to assign voucher');
    } finally {
      setGrantingVoucher(false);
    }
  };

  const previewAsset = (field: 'logoUrl' | 'imageUrl' | 'bannerUrl') => {
    const value = form[field]?.trim();
    return value ? value : null;
  };

  const statCards = payload?.analytics
    ? [
        { label: 'Total redeemed', value: payload.analytics.totalRedeemed, icon: Gift },
        { label: 'Pending approvals', value: payload.analytics.pendingApprovals, icon: Clock3 },
        { label: 'Active users', value: payload.analytics.activeUsers, icon: Activity },
        { label: 'Expiring soon', value: payload.analytics.expiringSoon, icon: BellRing },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,253,250,0.98))] p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#115e59]">Voucher & Rewards Management</p>
            <h3 className="mt-2 text-3xl font-black text-slate-900">Modern voucher operations for admins</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Create promotions, upload posters, control redemption rules, approve voucher usage, and monitor business performance from one screen.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={openCreate} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">New voucher</button>
            <button onClick={applyWeeklyPreset} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-800 hover:bg-emerald-100">Quick weekly voucher</button>
            <button onClick={() => { loadAdmin(); loadRedemptions(); }} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">Refresh</button>
          </div>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
      {actionMessage && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{actionMessage}</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-black uppercase tracking-[0.18em]">{item.label}</span>
                <Icon size={18} className="text-[#115e59]" />
              </div>
              <p className="mt-4 text-3xl font-black text-slate-900">{item.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search vouchers, businesses, offers..."
                  className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-slate-400"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(['all', 'active', 'scheduled', 'expired', 'inactive'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] transition ${
                      statusFilter === status ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {(loading ? [] : filteredOffers).map((offer) => (
              <div key={offer.id} className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex gap-4">
                    <img src={offer.logoUrl || offer.imageUrl || '/next.svg'} alt={offer.businessName} className="h-16 w-16 rounded-2xl object-cover ring-1 ring-slate-200" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#115e59]">{offer.businessName}</p>
                      <h4 className="mt-1 text-xl font-black text-slate-900">{offer.title}</h4>
                      <p className="mt-2 text-sm text-slate-600">{offer.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                        <span className="rounded-full bg-slate-100 px-3 py-1">{offer.status}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1">{offer.approvalMode}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1">{offer.discountLabel || offer.discountType}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1">Expires {new Date(offer.expiryDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => duplicateForNextWeek(offer)} className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 hover:bg-emerald-100">
                      <Gift size={16} /> Duplicate next week
                    </button>
                    <button onClick={() => openEdit(offer)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
                      <Pencil size={16} /> Edit
                    </button>
                    <button onClick={() => deleteOffer(offer)} className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 hover:bg-red-100">
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {!loading && filteredOffers.length === 0 && (
              <div className="rounded-[1.8rem] border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">No vouchers match the current filters.</div>
            )}
            {loading && (
              <div className="rounded-[1.8rem] border border-slate-200 bg-white p-8 text-center text-slate-500">
                <Loader2 className="mx-auto animate-spin" />
              </div>
            )}
          </div>

          <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900"><Shield size={18} className="text-[#115e59]" /><h4 className="text-lg font-black">Redemption review queue</h4></div>
            <p className="mt-2 text-xs font-semibold text-slate-500">Each redeem creates a one-time code. Codes are valid for 24 hours and then expire automatically.</p>
            <div className="mt-4 space-y-3">
              {redemptionLoading ? (
                <div className="py-10 text-center text-slate-500"><Loader2 className="mx-auto animate-spin" /></div>
              ) : redemptions.length === 0 ? (
                <p className="text-sm text-slate-500">No voucher redemptions yet.</p>
              ) : (
                redemptions.slice(0, 12).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="font-black text-slate-900">{item.voucher_title}</p>
                        <p className="text-sm text-slate-500">{item.business_name} · {item.voucher_code}</p>
                        <p className="mt-1 text-xs text-slate-500">Redeemed {new Date(item.redeemed_at).toLocaleString()} · Expires {new Date(item.expires_at).toLocaleString()}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.status === 'pending_approval' && (
                          <button disabled={processingRedemption === item.id} onClick={() => updateRedemption(item.id, 'approve')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700 disabled:opacity-50">
                            <CheckCircle2 size={14} /> Approve
                          </button>
                        )}
                        {item.status !== 'used' && item.status !== 'cancelled' && (
                          <button disabled={processingRedemption === item.id} onClick={() => updateRedemption(item.id, 'mark_used')} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-50">
                            <Save size={14} /> Mark used
                          </button>
                        )}
                        {item.status !== 'cancelled' && (
                          <button disabled={processingRedemption === item.id} onClick={() => updateRedemption(item.id, 'cancel')} className="inline-flex items-center gap-2 rounded-xl bg-red-100 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-200 disabled:opacity-50">
                            <XCircle size={14} /> Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              <h4 className="text-lg font-black text-slate-900">Assign voucher to a user</h4>
              <p className="text-sm text-slate-500">Search by name, email, city, parent email, phone, or user ID.</p>
            </div>

            <div className="mt-4 space-y-3">
              <select
                value={grantVoucherId}
                onChange={(event) => setGrantVoucherId(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm bg-white"
              >
                <option value="">Select voucher</option>
                {(payload?.offers || []).map((offer) => (
                  <option key={offer.id} value={offer.id}>
                    {offer.title} - {offer.businessName} ({offer.status})
                  </option>
                ))}
              </select>

              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  value={userQuery}
                  onChange={(event) => setUserQuery(event.target.value)}
                  placeholder="Search users to assign voucher..."
                  className="w-full rounded-2xl border border-slate-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-slate-400"
                />
              </div>

              {searchingUsers && <p className="text-xs font-semibold text-slate-500">Searching users...</p>}

              {!searchingUsers && userQuery.trim().length >= 2 && userResults.length > 0 && (
                <div className="max-h-56 space-y-2 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-2">
                  {userResults.map((user) => (
                    <button
                      key={user.uid}
                      onClick={() => {
                        setSelectedUser(user);
                        setUserQuery(user.name || user.email || user.uid);
                        setUserResults([]);
                      }}
                      className="w-full rounded-xl border border-transparent bg-white px-3 py-2 text-left hover:border-slate-200"
                    >
                      <p className="text-sm font-black text-slate-900">{user.name || 'Unnamed user'}</p>
                      <p className="text-xs text-slate-600">{user.email || user.uid}</p>
                      {user.city && <p className="text-xs text-slate-500">{user.city}</p>}
                    </button>
                  ))}
                </div>
              )}

              {selectedUser && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Selected user: <strong>{selectedUser.name || 'Unnamed user'}</strong> ({selectedUser.email || selectedUser.uid})
                </div>
              )}

              <button
                onClick={grantVoucherToUser}
                disabled={grantingVoucher || !grantVoucherId || !selectedUser}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#115e59] px-5 py-3 text-sm font-black text-white hover:bg-[#115e59] disabled:opacity-50"
              >
                {grantingVoucher ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
                Assign voucher to selected user
              </button>
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-lg font-black text-slate-900">{editingOffer ? 'Edit voucher' : 'Create voucher'}</h4>
                <p className="text-sm text-slate-500">Designed to be easy for non-technical admins.</p>
              </div>
              {editingOffer && (
                <button onClick={openCreate} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">Clear</button>
              )}
            </div>
            <div className="mt-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Voucher title" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                <input value={form.businessName} onChange={(e) => setForm((prev) => ({ ...prev, businessName: e.target.value }))} placeholder="Restaurant or business name" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
              </div>
              <textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Full description" className="min-h-[92px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
              <textarea value={form.termsAndConditions} onChange={(e) => setForm((prev) => ({ ...prev, termsAndConditions: e.target.value }))} placeholder="Terms & conditions" className="min-h-[92px] w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
              {form.imageOnly && (
                <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
                  JPG poster mode is on. You can upload the JPG now and fill details later.
                </p>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <input type="datetime-local" value={form.startDate} onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                <input type="datetime-local" value={form.expiryDate} onChange={(e) => setForm((prev) => ({ ...prev, expiryDate: e.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <select value={form.discountType} onChange={(e) => setForm((prev) => ({ ...prev, discountType: e.target.value as any }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm bg-white">
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed amount</option>
                  <option value="free_item">Free item</option>
                  <option value="buffet">Buffet offer</option>
                  <option value="custom">Custom text</option>
                </select>
                <input value={form.discountLabel} onChange={(e) => setForm((prev) => ({ ...prev, discountLabel: e.target.value }))} placeholder="20% off, Free kids meal..." className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <select value={form.approvalMode} onChange={(e) => setForm((prev) => ({ ...prev, approvalMode: e.target.value as any }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm bg-white">
                  <option value="auto">Auto approve</option>
                  <option value="manual">Manual approve</option>
                </select>
                <select value={form.audience} onChange={(e) => setForm((prev) => ({ ...prev, audience: e.target.value as any }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm bg-white">
                  <option value="public">Public</option>
                  <option value="points">Points based</option>
                  <option value="activity">Activity based</option>
                  <option value="competition">Competition winners</option>
                  <option value="kids_zone">Kids Zone rewards</option>
                  <option value="location">Location restricted</option>
                </select>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <input type="number" value={form.perUserLimit} onChange={(e) => setForm((prev) => ({ ...prev, perUserLimit: Number(e.target.value || 1) }))} placeholder="Per user limit" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                <input type="number" value={form.maxRedemptions ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, maxRedemptions: e.target.value ? Number(e.target.value) : null }))} placeholder="Max redemptions" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                <input type="number" value={form.winnersLimit ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, winnersLimit: e.target.value ? Number(e.target.value) : null }))} placeholder="Number of winners" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <input type="number" value={form.periodLimit ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, periodLimit: e.target.value ? Number(e.target.value) : null }))} placeholder="Daily / weekly / monthly limit" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                <select value={form.periodLimitWindow || ''} onChange={(e) => setForm((prev) => ({ ...prev, periodLimitWindow: e.target.value ? (e.target.value as any) : null }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm bg-white">
                  <option value="">No period limit</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <input value={form.locationLabel} onChange={(e) => setForm((prev) => ({ ...prev, locationLabel: e.target.value }))} placeholder="Location restriction" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <input type="number" value={form.minPoints ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, minPoints: e.target.value ? Number(e.target.value) : null }))} placeholder="Minimum points required" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                <input type="number" value={form.minActivities ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, minActivities: e.target.value ? Number(e.target.value) : null }))} placeholder="Minimum activities required" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
              </div>

              {([
                ['logoUrl', 'Logo only'],
                ['imageUrl', 'Promotional image'],
                ['bannerUrl', 'Banner image'],
              ] as const).map(([field, label]) => (
                <div key={field} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-900">{label}</p>
                      <p className="text-xs text-slate-500">Upload JPG/PNG/WebP, or paste an image URL.</p>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50">
                      {uploadingField === field ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      Upload
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        className="hidden"
                        onChange={(event) => handleUpload(field, event)}
                      />
                    </label>
                  </div>
                  <input value={form[field]} onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))} placeholder="https://..." className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                  {previewAsset(field) && (
                    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <img src={previewAsset(field)!} alt={`${label} preview`} className="h-32 w-full object-cover" />
                    </div>
                  )}
                </div>
              ))}

              <div className="grid gap-3 md:grid-cols-2">
                {([
                  ['publicVisible', 'Publicly visible (shown on /vouchers)'],
                  ['imageOnly', 'Poster only (details optional)'],
                  ['manualApprovalRequired', 'Manual approval required'],
                  ['featured', 'Featured offer'],
                  ['qrEnabled', 'QR enabled'],
                  ['active', 'Voucher active'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">
                    <input type="checkbox" checked={Boolean(form[key])} onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.checked }))} />
                    {label}
                  </label>
                ))}
              </div>

              <button onClick={saveOffer} disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-4 text-sm font-black text-white hover:bg-slate-800 disabled:opacity-50">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {editingOffer ? 'Update voucher' : 'Create voucher'}
              </button>
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900"><BarChart3 size={18} className="text-[#115e59]" /><h4 className="text-lg font-black">Business performance</h4></div>
            <div className="mt-4 space-y-3">
              {(payload?.analytics?.businessPerformance || []).slice(0, 5).map((item: any) => (
                <div key={item.businessName} className="rounded-2xl bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-black text-slate-900">{item.businessName}</p>
                    <p className="text-sm font-black text-[#115e59]">{item.redeemed} redeemed</p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{item.activeOffers} active offers · conversion {item.conversionRate}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900"><BellRing size={18} className="text-[#115e59]" /><h4 className="text-lg font-black">Notification feed</h4></div>
            <div className="mt-4 space-y-3">
              {(payload?.notifications || []).slice(0, 6).map((item: any) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#115e59]">{String(item.type).replace(/_/g, ' ')}</p>
                  <p className="mt-2 font-bold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900"><ImageIcon size={18} className="text-[#115e59]" /><h4 className="text-lg font-black">Gallery posters</h4></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(payload?.gallery || []).slice(0, 4).map((item: any) => (
                <div key={item.id} className="overflow-hidden rounded-2xl border border-slate-200">
                  <img src={item.imageUrl} alt={item.title} className="h-36 w-full object-cover" />
                  <div className="p-3">
                    <p className="font-black text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.businessName}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
