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

const firstString = (...values: any[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

const syncUsersPointsSnapshot = async (
  uid: string,
  points: number,
  weeklypoints: number,
  monthlypoints: number
) => {
  const safeTotal = Number.isFinite(points) ? Math.max(0, Number(points || 0)) : 0;
  const safeWeekly = Number.isFinite(weeklypoints) ? Math.max(0, Number(weeklypoints || 0)) : 0;
  const safeMonthly = Number.isFinite(monthlypoints) ? Math.max(0, Number(monthlypoints || 0)) : 0;
  const badges = Math.floor(safeTotal / 100);
  const level = 1 + Math.floor(badges / 5);

  const { error } = await supabaseAdmin
    .from('users_points')
    .upsert({
      user_id: uid,
      total_points: safeTotal,
      weekly_points: safeWeekly,
      monthly_points: safeMonthly,
      today_points: 0,
      badges,
      level,
      last_earned_date: new Date().toISOString().slice(0, 10),
    }, { onConflict: 'user_id' });

  if (error) {
    console.warn('[admin/users] Failed syncing users_points snapshot:', error.message);
  }
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

    const userIds = list.map((u: any) => u?.uid).filter(Boolean);
    const quizAttemptsByUser = new Map<string, number>();

    if (userIds.length > 0) {
      const { data: attemptRows, error: attemptsError } = await supabaseAdmin
        .from('quiz_attempts')
        .select('user_id')
        .in('user_id', userIds);

      if (attemptsError) {
        console.warn('[admin/users] Failed fetching quiz attempts:', attemptsError.message);
      } else {
        for (const row of attemptRows || []) {
          const uid = String((row as any).user_id || '');
          if (!uid) continue;
          quizAttemptsByUser.set(uid, (quizAttemptsByUser.get(uid) || 0) + 1);
        }
      }
    }

    let metadataByUserId = new Map<string, any>();
    try {
      const { data: authUsers, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (authUsersError) {
        console.warn('[admin/users] Failed fetching auth metadata:', authUsersError.message);
      } else {
        metadataByUserId = new Map(
          (authUsers?.users || []).map((authUser: any) => [authUser.id, authUser.user_metadata || {}])
        );
      }
    } catch (authListError: any) {
      console.warn('[admin/users] Auth metadata fetch threw:', authListError?.message || authListError);
    }

    const enrichedUsers = list.map((user: any) => {
      const meta = metadataByUserId.get(user.uid) || {};

      const normalizedMadrasah = firstString(
        user.madrasah_name,
        user.madrasahname,
        user.madrasahName,
        meta.madrasahName,
        meta.madrasah_name,
        meta.madrasahname
      );

      const normalizedContact = firstString(
        user.contact_number,
        user.contactnumber,
        user.contactNumber,
        meta.contactNumber,
        meta.contact_number,
        meta.contactnumber
      );

      const normalizedParentEmail = firstString(
        user.parent_email,
        user.parentEmail,
        meta.parentEmail,
        meta.parent_email
      );

      const normalizedAbout = firstString(
        user.winner_note,
        user.winner_notes,
        user.about_me,
        user.about_text,
        meta.winnerAbout,
        meta.winner_about
      );

      const winnerFormSubmittedAt = firstString(
        meta.winnerFormSubmittedAt,
        meta.winner_form_submitted_at
      );

      return {
        ...user,
        quizAttempts: quizAttemptsByUser.get(user.uid) || 0,
        madrasahNameNormalized: normalizedMadrasah,
        contactNumberNormalized: normalizedContact,
        parentEmailNormalized: normalizedParentEmail,
        winnerAboutNormalized: normalizedAbout,
        winnerFormSubmittedAtNormalized: winnerFormSubmittedAt,
      };
    });

    console.log(`Debug: Successfully fetched ${users?.length || 0} users`);
    return NextResponse.json({ users: enrichedUsers });
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
          role: 'kid' // Use kid role for standard learner accounts
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
      if (points !== undefined || weeklypoints !== undefined || monthlypoints !== undefined) {
        const resolvedPoints = points ?? existingProfile.points ?? 0;
        const resolvedWeekly = weeklypoints ?? existingProfile.weeklypoints ?? 0;
        const resolvedMonthly = monthlypoints ?? existingProfile.monthlypoints ?? 0;

        const { data: updatedProfile, error: updateError } = await supabaseAdmin
          .from('users')
          .update({
            points: resolvedPoints,
            weeklypoints: resolvedWeekly,
            monthlypoints: resolvedMonthly
          })
          .eq('uid', userId)
          .select()
          .single();
        
        if (!updateError) profile = updatedProfile;
      }
    }

    // Always ensure leaderboard source row exists for admin-created users.
    await syncUsersPointsSnapshot(
      userId,
      Number(profile?.points || 0),
      Number(profile?.weeklypoints || 0),
      Number(profile?.monthlypoints || 0)
    );

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

    // Ensure a users row exists for admin edits and point synchronization.
    let existingUser = null as any;
    const { data: existingUserData } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('uid', uid)
      .maybeSingle();
    existingUser = existingUserData;

    if (!existingUser) {
      const { data: authRes } = await supabaseAdmin.auth.admin.getUserById(uid);
      const fallbackName =
        ((authRes?.user?.user_metadata as any)?.name as string) ||
        (authRes?.user?.email ? authRes.user.email.split('@')[0] : `Learner-${uid.slice(0, 8)}`);
      const fallbackEmail = authRes?.user?.email || `user-${uid.slice(0, 8)}@local`;

      const { data: createdUser, error: createUserErr } = await supabaseAdmin
        .from('users')
        .insert({
          uid,
          email: fallbackEmail,
          name: fallbackName,
          role: 'kid',
          points: 0,
          weeklypoints: 0,
          monthlypoints: 0,
        })
        .select('*')
        .single();

      if (createUserErr) {
        throw createUserErr;
      }
      existingUser = createdUser;
    }

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

    // Always ensure leaderboard source row is present and synchronized.
    await syncUsersPointsSnapshot(
      uid,
      Number(updatedUser?.points || 0),
      Number(updatedUser?.weeklypoints || 0),
      Number(updatedUser?.monthlypoints || 0)
    );

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
