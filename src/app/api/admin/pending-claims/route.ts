import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { awardPointsWithDailyCapByUserId } from '@/lib/server-points';

// GET  /api/admin/pending-claims          — list all claims (optionally filtered by status)
// POST /api/admin/pending-claims          — approve or reject a claim

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'pending';

  try {
    let query = supabaseAdmin
      .from('pending_reward_claims')
      .select('*')
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json(
          {
            error: 'Table not found. Run CREATE_PENDING_CLAIMS.sql in your Supabase SQL Editor first.',
            setupRequired: true,
            claims: [],
          },
          { status: 503 }
        );
      }
      throw error;
    }

    return NextResponse.json({ claims: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { claimId, action } = body || {};

    if (!claimId || typeof claimId !== 'string') {
      return NextResponse.json({ error: 'claimId is required' }, { status: 400 });
    }
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 });
    }

    // Fetch the claim
    const { data: claim, error: fetchError } = await supabaseAdmin
      .from('pending_reward_claims')
      .select('*')
      .eq('id', claimId)
      .single();

    if (fetchError || !claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    if (claim.status !== 'pending') {
      return NextResponse.json(
        { error: `Claim has already been ${claim.status}.` },
        { status: 409 }
      );
    }

    // Update the claim status first
    const { error: updateError } = await supabaseAdmin
      .from('pending_reward_claims')
      .update({ status: action === 'approve' ? 'approved' : 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', claimId);

    if (updateError) throw updateError;

    let pointsAwarded = 0;
    if (action === 'approve') {
      const result = await awardPointsWithDailyCapByUserId(
        claim.user_id,
        claim.points_requested,
        {
          countTowardDailyLimit: false,
          successMessage: `+${claim.points_requested} points approved for ${claim.claim_label}!`,
        }
      );
      pointsAwarded = result.pointsAwarded;
    }

    return NextResponse.json({
      success: true,
      action,
      pointsAwarded,
      message:
        action === 'approve'
          ? `Approved. ${pointsAwarded} points awarded to ${claim.user_name || claim.user_id}.`
          : `Rejected. No points awarded.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
