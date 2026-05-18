import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import {
  createVoucherOffer,
  deleteVoucherOffer,
  fetchVoucherAnalytics,
  fetchVoucherGallery,
  fetchVoucherLogs,
  fetchVoucherNotifications,
  fetchVoucherOffers,
  isVoucherSetupMissing,
  updateVoucherOffer,
} from '@/lib/voucher-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const includeExpired = url.searchParams.get('includeExpired') !== 'false';
    const search = (url.searchParams.get('search') || '').trim().toLowerCase();

    let offers = await fetchVoucherOffers({ includeHidden: true, includeExpired });
    if (search) {
      offers = offers.filter((offer) =>
        [offer.title, offer.businessName, offer.description, offer.discountLabel].join(' ').toLowerCase().includes(search)
      );
    }

    const [analytics, gallery, notifications, logs] = await Promise.all([
      fetchVoucherAnalytics(),
      fetchVoucherGallery(),
      fetchVoucherNotifications(null, 20),
      fetchVoucherLogs(),
    ]);

    return NextResponse.json({ offers, analytics, gallery, notifications, logs });
  } catch (error: any) {
    if (isVoucherSetupMissing(error)) {
      return NextResponse.json({ error: 'Voucher tables are missing. Run VOUCHER_REWARDS_SYSTEM_SETUP.sql.', setupRequired: true, offers: [] }, { status: 503 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to load admin vouchers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const offer = await createVoucherOffer(body);
    return NextResponse.json({ offer });
  } catch (error: any) {
    if (isVoucherSetupMissing(error)) {
      return NextResponse.json({ error: 'Voucher tables are missing. Run VOUCHER_REWARDS_SYSTEM_SETUP.sql.', setupRequired: true }, { status: 503 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to create voucher' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = String(body?.id || '');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    const offer = await updateVoucherOffer(id, body);
    return NextResponse.json({ offer });
  } catch (error: any) {
    if (isVoucherSetupMissing(error)) {
      return NextResponse.json({ error: 'Voucher tables are missing. Run VOUCHER_REWARDS_SYSTEM_SETUP.sql.', setupRequired: true }, { status: 503 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to update voucher' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') || '';
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await deleteVoucherOffer(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (isVoucherSetupMissing(error)) {
      return NextResponse.json({ error: 'Voucher tables are missing. Run VOUCHER_REWARDS_SYSTEM_SETUP.sql.', setupRequired: true }, { status: 503 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to delete voucher' }, { status: 500 });
  }
}