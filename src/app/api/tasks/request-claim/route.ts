import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const POINTS_MAP: Record<string, number> = {
  feedback_ios: 30,
  feedback_android: 30,
  referral: 50,
};

const LABEL_MAP: Record<string, string> = {
  feedback_ios: 'App Store Review Reward',
  feedback_android: 'Google Play Review Reward',
  referral: 'Friend Referral Reward',
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, userName, claimType, notes } = body || {};

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const validTypes = ['feedback_ios', 'feedback_android', 'referral'];
    if (!claimType || !validTypes.includes(claimType)) {
      return NextResponse.json(
        { error: 'claimType must be one of: feedback_ios, feedback_android, referral' },
        { status: 400 }
      );
    }

    const pointsRequested = POINTS_MAP[claimType];
    const claimLabel = LABEL_MAP[claimType];

    // Prevent duplicate pending/approved claims of the same type for this user.
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('pending_reward_claims')
      .select('id, status')
      .eq('user_id', userId)
      .eq('claim_type', claimType)
      .in('status', ['pending', 'approved'])
      .limit(1);

    if (checkError) {
      // Table likely doesn't exist yet — guide the admin.
      if (checkError.code === '42P01') {
        return NextResponse.json(
          {
            error:
              'The pending_reward_claims table does not exist yet. Please run CREATE_PENDING_CLAIMS.sql in your Supabase SQL Editor.',
            setupRequired: true,
          },
          { status: 503 }
        );
      }
      throw checkError;
    }

    if (existing && existing.length > 0) {
      const existingStatus = existing[0].status;
      return NextResponse.json(
        {
          error:
            existingStatus === 'approved'
              ? `You have already received the ${claimLabel}.`
              : `You already have a pending ${claimLabel} request. Please wait for admin approval.`,
          alreadySubmitted: true,
          status: existingStatus,
        },
        { status: 409 }
      );
    }

    // Resolve the user name if not supplied — look it up in the users table.
    let resolvedName = typeof userName === 'string' && userName.trim() ? userName.trim() : null;
    if (!resolvedName) {
      const { data: userRow } = await supabaseAdmin
        .from('users')
        .select('name')
        .eq('uid', userId)
        .maybeSingle();
      resolvedName = userRow?.name || null;
    }

    const { data: claim, error: insertError } = await supabaseAdmin
      .from('pending_reward_claims')
      .insert({
        user_id: userId,
        user_name: resolvedName,
        claim_type: claimType,
        claim_label: claimLabel,
        points_requested: pointsRequested,
        status: 'pending',
        notes: typeof notes === 'string' ? notes.slice(0, 500) : null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      claim,
      message: `Your ${claimLabel} request has been submitted. You will receive ${pointsRequested} points once the admin approves it.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}
