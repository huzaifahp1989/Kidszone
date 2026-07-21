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

const normalizeAge = (...values: any[]): number | null => {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) continue;
    const rounded = Math.floor(parsed);
    if (rounded >= 0) return rounded;
  }
  return null;
};

const toDateMs = (value: any): number => {
  if (!value || typeof value !== 'string') return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
};

const normalizeSearch = (value: any) => String(value || '').trim().toLowerCase();

const userMatchesSearch = (user: any, q: string) => {
  const normalized = normalizeSearch(q);
  if (!normalized) return true;

  const tokens = normalized.split(/\s+/).filter(Boolean);
  const searchableText = [
    user.name,
    user.email,
    user.username,
    user.family_email,
    user.familyEmail,
    user.parentEmailNormalized,
    user.parent_email,
    user.parentEmail,
    user.contactNumberNormalized,
    user.contact_number,
    user.contactnumber,
    user.contactNumber,
    user.cityNormalized,
    user.city,
    user.town,
    user.location,
    user.madrasahNameNormalized,
    user.madrasah_name,
    user.madrasahname,
    user.madrasahName,
    user.winnerAboutNormalized,
    user.winner_note,
    user.winner_notes,
    user.about_me,
    user.about_text,
    user.uid,
    user.ageNormalized,
    user.age,
    user.child_age,
  ]
    .map((v) => String(v ?? ''))
    .join(' ')
    .toLowerCase();

  return tokens.every((token) => searchableText.includes(token));
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
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim();

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
    const winnerTickByUser = new Set<string>();

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

    if (userIds.length > 0) {
      const { data: winnerRows, error: winnerErr } = await supabaseAdmin
        .from('featured_winners')
        .select('user_id')
        .in('user_id', userIds);

      if (winnerErr) {
        if (winnerErr.code !== '42P01') {
          console.warn('[admin/users] Failed fetching featured winners:', winnerErr.message);
        }
      } else {
        for (const row of winnerRows || []) {
          const uid = String((row as any).user_id || '');
          if (!uid) continue;
          winnerTickByUser.add(uid);
        }
      }
    }

    let metadataByUserId = new Map<string, any>();
    let authUsersById = new Map<string, any>();
    try {
      const { data: authUsers, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (authUsersError) {
        console.warn('[admin/users] Failed fetching auth metadata:', authUsersError.message);
      } else {
        authUsersById = new Map((authUsers?.users || []).map((authUser: any) => [authUser.id, authUser]));
        metadataByUserId = new Map(
          (authUsers?.users || []).map((authUser: any) => [authUser.id, authUser.user_metadata || {}])
        );
      }
    } catch (authListError: any) {
      console.warn('[admin/users] Auth metadata fetch threw:', authListError?.message || authListError);
    }

    const enrichedUsers = list.map((user: any) => {
      const meta = metadataByUserId.get(user.uid) || {};
      const authUser = authUsersById.get(user.uid) || {};

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

      const normalizedCity = firstString(
        user.city,
        user.town,
        user.location,
        user.city_name,
        user.address_city,
        meta.city,
        meta.town,
        meta.location,
        meta.cityName,
        meta.addressCity,
        meta.address_city
      );

      const normalizedAge = normalizeAge(
        user.age,
        user.child_age,
        meta.age,
        meta.childAge,
        meta.child_age
      );

      const winnerFormSubmittedAt = firstString(
        meta.winnerFormSubmittedAt,
        meta.winner_form_submitted_at
      );

      const joinedAt = firstString(user.created_at, authUser.created_at);
      const lastActiveAt = firstString(user.updated_at, authUser.last_sign_in_at, joinedAt);

      return {
        ...user,
        created_at: joinedAt || user.created_at,
        updated_at: lastActiveAt || user.updated_at,
        quizAttempts: quizAttemptsByUser.get(user.uid) || 0,
        winnerTick: winnerTickByUser.has(String(user.uid)),
        madrasahNameNormalized: normalizedMadrasah,
        contactNumberNormalized: normalizedContact,
        parentEmailNormalized: normalizedParentEmail,
        winnerAboutNormalized: normalizedAbout,
        cityNormalized: normalizedCity,
        ageNormalized: normalizedAge,
        winnerFormSubmittedAtNormalized: winnerFormSubmittedAt,
      };
    });

    const sortedUsers = [...enrichedUsers].sort((a: any, b: any) => {
      return toDateMs(b.created_at) - toDateMs(a.created_at);
    });

    const filteredUsers = q
      ? sortedUsers.filter((user: any) => userMatchesSearch(user, q))
      : sortedUsers;

    console.log(`Debug: Successfully fetched ${users?.length || 0} users`);
    return NextResponse.json({ users: filteredUsers });
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
    const {
      name,
      email,
      password,
      username,
      age,
      city,
      points,
      weeklypoints,
      monthlypoints,
    } = body;

    const trimmedName = String(name || '').trim();
    if (!trimmedName) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { assertValidUsername, normalizeFamilyEmail, normalizeUsername } = await import(
      '@/lib/family-accounts'
    );

    const emailNormalized = normalizeFamilyEmail(String(email || ''));
    if (!emailNormalized || !emailNormalized.includes('@')) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }

    const userPassword = String(password || '');
    if (userPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    let normalizedUsername = '';
    if (username) {
      const check = assertValidUsername(String(username));
      if (!check.ok) {
        return NextResponse.json({ error: check.error }, { status: 400 });
      }
      normalizedUsername = check.username;

      const takenRes = await supabaseAdmin
        .from('users')
        .select('uid')
        .eq('username', normalizedUsername)
        .maybeSingle();
      if (takenRes.error && takenRes.error.code !== '42703' && !/family_email|username|column/i.test(takenRes.error.message || '')) {
        console.warn('[admin/users] username check error:', takenRes.error.message);
      } else if (takenRes.data?.uid) {
        return NextResponse.json({ error: 'That username is already taken' }, { status: 409 });
      }
    } else {
      // Derive a usable username from the name if admin skips it
      const base = normalizeUsername(trimmedName).replace(/[^a-z0-9_]/g, '').slice(0, 16) || 'learner';
      normalizedUsername = `${base}_${Math.floor(Math.random() * 900 + 100)}`;
    }

    const safeAge = normalizeAge(age) ?? 10;
    const safeCity = typeof city === 'string' ? city.trim() : '';
    const safePoints = Number(points || 0) || 0;
    const safeWeekly = Number(weeklypoints || 0) || 0;
    const safeMonthly = Number(monthlypoints || 0) || 0;

    // 1. Create Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: emailNormalized,
      password: userPassword,
      email_confirm: true,
      user_metadata: {
        name: trimmedName,
        username: normalizedUsername,
        family_email: emailNormalized,
        age: safeAge,
        city: safeCity || undefined,
      },
    });

    if (authError) {
      const msg = authError.message || 'Failed to create auth user';
      if (/already|registered|exists/i.test(msg)) {
        return NextResponse.json(
          {
            error:
              'That email is already registered in Auth. Use a different email, or add a sibling from the family profile after signing in.',
          },
          { status: 409 }
        );
      }
      throw authError;
    }
    const userId = authData.user.id;

    // 2. Upsert profile — strip optional columns if schema is older
    await new Promise((resolve) => setTimeout(resolve, 300));

    const isMissingColumnError = (err: { code?: string; message?: string } | null) => {
      if (!err) return false;
      if (err.code === '42703') return true;
      return /Could not find the '[\w_]+' column|column .* does not exist/i.test(err.message || '');
    };

    const baseProfile: Record<string, unknown> = {
      uid: userId,
      email: emailNormalized,
      name: trimmedName,
      age: safeAge,
      role: 'kid',
      points: safePoints,
      weeklypoints: safeWeekly,
      monthlypoints: safeMonthly,
      level: 'Beginner',
    };

    const attempts: Record<string, unknown>[] = [
      {
        ...baseProfile,
        family_email: emailNormalized,
        username: normalizedUsername,
        ...(safeCity ? { city: safeCity } : {}),
      },
      {
        ...baseProfile,
        username: normalizedUsername,
        ...(safeCity ? { city: safeCity } : {}),
      },
      {
        ...baseProfile,
        ...(safeCity ? { city: safeCity } : {}),
      },
      baseProfile,
    ];

    let profile: any = null;
    let lastProfileError: { code?: string; message?: string } | null = null;

    for (const payload of attempts) {
      const res = await supabaseAdmin.from('users').upsert(payload, { onConflict: 'uid' }).select().single();
      if (!res.error) {
        profile = res.data;
        lastProfileError = null;
        break;
      }
      lastProfileError = res.error;
      if (!isMissingColumnError(res.error)) break;
    }

    // Older schemas: city may be town/location
    if (profile && safeCity) {
      const hasCity =
        Boolean(profile.city) || Boolean(profile.town) || Boolean(profile.location);
      if (!hasCity) {
        for (const col of ['city', 'town', 'location'] as const) {
          const alt = await supabaseAdmin
            .from('users')
            .update({ [col]: safeCity })
            .eq('uid', userId)
            .select()
            .single();
          if (!alt.error) {
            profile = alt.data;
            break;
          }
          if (!isMissingColumnError(alt.error)) break;
        }
      }
    }

    if (lastProfileError || !profile) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw lastProfileError || new Error('Failed to create user profile');
    }

    await syncUsersPointsSnapshot(userId, safePoints, safeWeekly, safeMonthly);

    return NextResponse.json({
      user: profile,
      auth: { email: emailNormalized, username: normalizedUsername, password: userPassword },
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: error.message || 'Failed to create user' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      uid,
      name,
      points,
      weeklypoints,
      monthlypoints,
      pointsDelta,
      weeklypointsDelta,
      monthlypointsDelta,
      password,
      winnerTick,
      city,
      age,
    } = body;

    if (!uid) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (age !== undefined) {
      const safeAge = normalizeAge(age);
      updates.age = safeAge;
    }
    if (city !== undefined) {
      const safeCity = typeof city === 'string' ? city.trim() : '';
      updates.city = safeCity || null;
    }

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

    const hasPointDelta = pointsDelta !== undefined || weeklypointsDelta !== undefined || monthlypointsDelta !== undefined;
    if (
      points !== undefined ||
      weeklypoints !== undefined ||
      monthlypoints !== undefined ||
      hasPointDelta
    ) {
      const basePoints = Number(points !== undefined ? points : existingUser?.points || 0);
      const baseWeekly = Number(weeklypoints !== undefined ? weeklypoints : existingUser?.weeklypoints || 0);
      const baseMonthly = Number(monthlypoints !== undefined ? monthlypoints : existingUser?.monthlypoints || 0);

      const safePointsDelta = Number(pointsDelta || 0);
      const safeWeeklyDelta = Number(weeklypointsDelta || 0);
      const safeMonthlyDelta = Number(monthlypointsDelta || 0);

      updates.points = Math.max(0, basePoints + safePointsDelta);
      updates.weeklypoints = Math.max(0, baseWeekly + safeWeeklyDelta);
      updates.monthlypoints = Math.max(0, baseMonthly + safeMonthlyDelta);
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

      if (error) {
        // Older schemas may use town/location instead of city
        if (error.code === '42703' && updates.city !== undefined) {
          const { city: cityValue, ...rest } = updates;
          let saved = false;
          for (const col of ['town', 'location'] as const) {
            const { data: altData, error: altErr } = await supabaseAdmin
              .from('users')
              .update({ ...rest, [col]: cityValue })
              .eq('uid', uid)
              .select()
              .single();
            if (!altErr) {
              updatedUser = altData;
              saved = true;
              break;
            }
            if (altErr.code !== '42703') throw altErr;
          }
          if (!saved) throw error;
        } else {
          throw error;
        }
      } else {
        updatedUser = data;
      }
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

    if (typeof winnerTick === 'boolean') {
      if (winnerTick) {
        const { error: winnerUpsertErr } = await supabaseAdmin
          .from('featured_winners')
          .upsert({ user_id: uid }, { onConflict: 'user_id' });

        if (winnerUpsertErr) {
          if (winnerUpsertErr.code === '42P01') {
            return NextResponse.json(
              { error: 'Missing featured_winners table. Run the Supabase migration 20260508_create_featured_winners.sql.' },
              { status: 503 }
            );
          }
          throw winnerUpsertErr;
        }
      } else {
        const { error: winnerDeleteErr } = await supabaseAdmin
          .from('featured_winners')
          .delete()
          .eq('user_id', uid);

        if (winnerDeleteErr) {
          if (winnerDeleteErr.code === '42P01') {
            return NextResponse.json(
              { error: 'Missing featured_winners table. Run the Supabase migration 20260508_create_featured_winners.sql.' },
              { status: 503 }
            );
          }
          throw winnerDeleteErr;
        }
      }
    }

    if (city !== undefined || age !== undefined) {
      const { data: authRes, error: authReadErr } = await supabaseAdmin.auth.admin.getUserById(uid);
      if (authReadErr) {
        console.error('Admin metadata fetch error:', authReadErr);
        return NextResponse.json({ error: authReadErr.message }, { status: 500 });
      }

      const currentMeta = ((authRes?.user?.user_metadata as any) || {}) as Record<string, any>;
      const nextMeta: Record<string, any> = { ...currentMeta };

      if (city !== undefined) {
        const safeCity = typeof city === 'string' ? city.trim() : '';
        if (safeCity) {
          nextMeta.city = safeCity;
        } else {
          delete nextMeta.city;
        }
      }

      if (age !== undefined) {
        const safeAge = normalizeAge(age);
        if (safeAge === null) {
          delete nextMeta.age;
        } else {
          nextMeta.age = safeAge;
        }
      }

      const { error: authUpdateErr } = await supabaseAdmin.auth.admin.updateUserById(uid, {
        user_metadata: nextMeta,
      });

      if (authUpdateErr) {
        console.error('Admin metadata update error:', authUpdateErr);
        return NextResponse.json({ error: authUpdateErr.message }, { status: 500 });
      }
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
