import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

// Helper to check admin authorization
// In a real app, this should check a secure cookie or token.
// For this MVP, we'll check a custom header that the frontend sends.
const checkAdminAuth = (request: Request) => {
  const authHeader = request.headers.get('x-admin-auth');
  console.log('Debug: Auth header received:', authHeader);
  return authHeader === 'true'; // Matches localStorage 'admin_auth'
};

const isPlaceholderName = (name: any) => {
  if (typeof name !== 'string') return true;
  const trimmed = name.trim();
  if (!trimmed) return true;
  return /^learner\b/i.test(trimmed);
};

export async function GET(request: Request) {
  if (!checkAdminAuth(request)) {
    console.log('Debug: Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('Debug: Fetching users via admin client...');
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('*');
      // .order('created_at', { ascending: false }); // Commented out as created_at might not exist

    if (error) {
        console.error('Debug: Supabase error fetching users:', error);
        throw error;
    }
    
    const list = users ?? [];
    const candidates = list.filter((u: any) => u?.uid && isPlaceholderName(u?.name));
    if (candidates.length) {
      const updated = await Promise.all(
        candidates.map(async (u: any) => {
          try {
            const { data: authRes, error: authErr } = await supabaseAdmin.auth.admin.getUserById(u.uid);
            if (authErr) return null;
            const metaName =
              (authRes.user?.user_metadata as any)?.name ||
              (authRes.user?.user_metadata as any)?.full_name ||
              (authRes.user?.user_metadata as any)?.fullName ||
              '';
            const betterName = typeof metaName === 'string' ? metaName.trim() : '';
            if (!betterName) return null;

            const { data: saved, error: saveErr } = await supabaseAdmin
              .from('users')
              .update({ name: betterName })
              .eq('uid', u.uid)
              .select('*')
              .maybeSingle();
            if (saveErr) return null;
            return saved ?? null;
          } catch {
            return null;
          }
        })
      );

      const byId = new Map((updated.filter(Boolean) as any[]).map((u: any) => [u.uid, u]));
      for (let i = 0; i < list.length; i++) {
        const replacement = byId.get((list[i] as any).uid);
        if (replacement) list[i] = replacement;
      }
    }

    console.log(`Debug: Successfully fetched ${users?.length || 0} users`);
    return NextResponse.json({ users: list });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, email, password, points, weeklypoints, monthlypoints } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Generate dummy credentials if not provided
    const userEmail = email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Math.floor(Math.random() * 1000)}@temp.com`;
    const userPassword = password || 'temp123456';

    // 1. Create Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userEmail,
      password: userPassword,
      email_confirm: true,
      user_metadata: { name }
    });

    if (authError) throw authError;
    const userId = authData.user.id;

    // 2. Check if profile exists (if trigger created it)
    // Wait a brief moment for trigger
    await new Promise(resolve => setTimeout(resolve, 500));

    const { data: existingProfile } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('uid', userId)
      .single();

    let profile = existingProfile;

    if (!existingProfile) {
      // 3. Create Profile manually if trigger didn't work
      const { data: newProfile, error: profileError } = await supabaseAdmin
        .from('users')
        .insert({
          uid: userId,
          email: userEmail,
          name: name,
          points: points || 0,
          weeklypoints: weeklypoints || 0,
          monthlypoints: monthlypoints || 0,
          role: 'user' // Default role
        })
        .select()
        .single();
      
      if (profileError) {
        // Cleanup auth user if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(userId);
        throw profileError;
      }
      profile = newProfile;
    } else {
      // Update points if provided and profile already existed (via trigger)
      if (points || weeklypoints || monthlypoints) {
        const { data: updatedProfile, error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            points: points || existingProfile.points,
            weeklypoints: weeklypoints || existingProfile.weeklypoints,
            monthlypoints: monthlypoints || existingProfile.monthlypoints
          })
          .eq('uid', userId)
          .select()
          .single();
        
        if (!updateError) profile = updatedProfile;
      }
    }

    return NextResponse.json({ user: profile, auth: { email: userEmail, password: userPassword } });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { uid, name, points, weeklypoints, monthlypoints, password } = body;

    if (!uid) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (points !== undefined) updates.points = points;
    if (weeklypoints !== undefined) updates.weeklypoints = weeklypoints;
    if (monthlypoints !== undefined) updates.monthlypoints = monthlypoints;

    // Update profile fields if provided
    let updatedUser = null as any;
    if (Object.keys(updates).length > 0) {
      const { data, error } = await supabaseAdmin
        .from('users')
        .update(updates)
        .eq('uid', uid)
        .select()
        .single();
      if (error) throw error;
      updatedUser = data;
    } else {
      // If no profile updates, fetch current user to return
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('uid', uid)
        .maybeSingle();
      updatedUser = data;
    }

    // Update password if provided
    if (password && typeof password === 'string' && password.length >= 6) {
      const { error: passErr } = await supabaseAdmin.auth.admin.updateUserById(uid, { password });
      if (passErr) {
        console.error('Admin password update error:', passErr);
        return NextResponse.json({ error: passErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');

    if (!uid) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Delete from Auth (should cascade, but we'll try)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(uid);
    
    if (authError) {
      console.warn('Error deleting auth user (might not exist):', authError);
      // If auth delete fails, try deleting from public.users directly
      const { error: dbError } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('uid', uid);
        
      if (dbError) throw dbError;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
