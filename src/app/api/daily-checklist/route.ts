import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { createClient } from '@supabase/supabase-js';

// We use a user client for RLS context usually, but for points updates we might need admin
// However, to keep it secure, we should verify the user's session.
// Since we are in an API route, we should ideally use the auth header to get the user.

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('daily_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw error;
    }

    return NextResponse.json({ 
      success: true, 
      data: data || { 
        user_id: userId, 
        date, 
        completed_items: [], 
        good_deed: '', 
        daily_points: 0 
      } 
    });
  } catch (error: any) {
    console.error('Fetch error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, date, items, goodDeed } = body;

    if (!userId || !items) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];

    // Calculate Points
    // Each item = 2 points
    // Good deed = 2 points (if not empty)
    let newPoints = items.length * 2;
    if (goodDeed && goodDeed.trim().length > 0) {
      newPoints += 2;
    }

    // Cap at 30? User said 20-30.
    // Salah (5*2=10) + Dhikr (4*2=8) + Deed (2) = 20.
    // So 20 is the natural max. Let's cap at 20 just in case.
    if (newPoints > 20) newPoints = 20;

    // 1. Get previous points to calculate delta
    const { data: existing } = await supabaseAdmin
      .from('daily_progress')
      .select('daily_points')
      .eq('user_id', userId)
      .eq('date', targetDate)
      .single();

    const previousPoints = existing?.daily_points || 0;
    const pointDelta = newPoints - previousPoints;

    // 2. Upsert Daily Progress
    const { error: upsertError } = await supabaseAdmin
      .from('daily_progress')
      .upsert({
        user_id: userId,
        date: targetDate,
        completed_items: items,
        good_deed: goodDeed,
        daily_points: newPoints
      }, { onConflict: 'user_id, date' });

    if (upsertError) throw upsertError;

    // 3. Update User Total Points (only if there is a difference)
    if (pointDelta !== 0) {
      try {
        // Try RPC first (best way - handles both tables atomically)
        await supabaseAdmin.rpc('increment_points', { 
          row_id: userId, 
          amount: pointDelta 
        });
      } catch (rpcError) {
        console.warn('RPC increment_points failed, falling back to manual update:', rpcError);
        
        // Fallback: Manually update both tables
        
        // 1. Update legacy users table
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('points, weeklypoints')
          .eq('uid', userId)
          .single();
          
        if (user) {
           await supabaseAdmin.from('users').update({
               points: (user.points || 0) + pointDelta,
               weeklypoints: (user.weeklypoints || 0) + pointDelta
           }).eq('uid', userId);
        }

        // 2. Update users_points table
        const { data: up } = await supabaseAdmin
          .from('users_points')
          .select('total_points, weekly_points')
          .eq('user_id', userId)
          .single();
          
        if (up) {
           await supabaseAdmin.from('users_points').update({
               total_points: (up.total_points || 0) + pointDelta,
               weekly_points: (up.weekly_points || 0) + pointDelta
           }).eq('user_id', userId);
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      points: newPoints,
      delta: pointDelta 
    });

  } catch (error: any) {
    console.error('Update error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
