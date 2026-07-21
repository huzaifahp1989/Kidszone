import { NextResponse } from 'next/server';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { ensureUserRecords } from '@/lib/ensure-user-records';
import {
  MAX_FAMILY_MEMBERS,
  createSiblingAuthEmail,
  countFamilyMembers,
  isValidUsername,
  listFamilyMembers,
  normalizeFamilyEmail,
  normalizeUsername,
} from '@/lib/family-accounts';

export const dynamic = 'force-dynamic';

async function loadCallerProfile(uid: string) {
  const full = await supabaseAdmin
    .from('users')
    .select('uid, email, family_email, madrasahname, contactnumber, contact_number')
    .eq('uid', uid)
    .maybeSingle();

  if (full.error?.code === '42703') {
    const basic = await supabaseAdmin
      .from('users')
      .select('uid, email, madrasahname')
      .eq('uid', uid)
      .maybeSingle();
    return { data: basic.data as Record<string, unknown> | null, error: basic.error };
  }

  return { data: full.data as Record<string, unknown> | null, error: full.error };
}

export async function GET(request: Request) {
  const authUser = await getAuthenticatedRequestUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: me, error } = await loadCallerProfile(authUser.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const familyEmail = normalizeFamilyEmail(
      String(me?.family_email || me?.email || authUser.email || '')
    );
    if (!familyEmail) {
      return NextResponse.json({ members: [], familyEmail: '', maxMembers: MAX_FAMILY_MEMBERS });
    }

    const members = await listFamilyMembers(familyEmail);
    return NextResponse.json({
      familyEmail,
      maxMembers: MAX_FAMILY_MEMBERS,
      members: members.map((m) => ({
        uid: m.uid,
        username: m.username,
        name: m.name,
        age: m.age,
        isCurrent: m.uid === authUser.id,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type AddMemberBody = {
  name?: string;
  username?: string;
  age?: number | string;
  password?: string;
};

export async function POST(request: Request) {
  const authUser = await getAuthenticatedRequestUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as AddMemberBody;
    const name = String(body.name || '').trim();
    const username = normalizeUsername(String(body.username || ''));
    const ageNumber = typeof body.age === 'number' ? body.age : parseInt(String(body.age || ''), 10);
    const password = String(body.password || '');

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Please enter the learner full name.' }, { status: 400 });
    }
    if (!isValidUsername(username)) {
      return NextResponse.json(
        { error: 'Username must be 3-20 characters and use only letters, numbers, or underscores.' },
        { status: 400 }
      );
    }
    if (!Number.isFinite(ageNumber) || ageNumber < 1 || ageNumber > 120) {
      return NextResponse.json({ error: 'Please enter a valid age.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Please re-enter the family password (at least 6 characters).' },
        { status: 400 }
      );
    }

    const { data: me, error: meErr } = await loadCallerProfile(authUser.id);
    if (meErr) {
      return NextResponse.json({ error: meErr.message }, { status: 500 });
    }

    const familyEmail = normalizeFamilyEmail(
      String(me?.family_email || me?.email || authUser.email || '')
    );
    if (!familyEmail.includes('@')) {
      return NextResponse.json({ error: 'Your account is missing a family email.' }, { status: 400 });
    }

    const myAuthEmail = String(me?.email || authUser.email || '').trim().toLowerCase();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server auth is not configured.' }, { status: 500 });
    }

    const verifyRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ email: myAuthEmail, password }),
    });
    if (!verifyRes.ok) {
      return NextResponse.json({ error: 'Family password is incorrect.' }, { status: 401 });
    }

    const memberCount = await countFamilyMembers(familyEmail);
    if (memberCount >= MAX_FAMILY_MEMBERS) {
      return NextResponse.json(
        { error: `This family already has the maximum of ${MAX_FAMILY_MEMBERS} learners.` },
        { status: 400 }
      );
    }

    const { data: existingUsername, error: usernameErr } = await supabaseAdmin
      .from('users')
      .select('uid')
      .eq('username', username)
      .maybeSingle();

    if (usernameErr?.code === '42703') {
      return NextResponse.json(
        { error: 'Family usernames are not set up yet. Run SETUP_FAMILY_USERNAMES.sql in Supabase.' },
        { status: 503 }
      );
    }
    if (existingUsername?.uid) {
      return NextResponse.json({ error: 'That username is already taken. Try another.' }, { status: 409 });
    }

    const siblingEmail = createSiblingAuthEmail(familyEmail, username);
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: siblingEmail,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        age: ageNumber,
        username,
        family_email: familyEmail,
        needsSignupForm: false,
        signupFormCompletedAt: new Date().toISOString(),
      },
    });

    if (createErr || !created.user?.id) {
      const msg = createErr?.message || 'Could not create sibling account.';
      if (/already|exists|registered/i.test(msg)) {
        return NextResponse.json(
          { error: 'A learner with that username already exists. Try a different username.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const uid = created.user.id;
    const madrasah = String(me?.madrasahname || '');
    const contact = String(me?.contactnumber || me?.contact_number || '');

    const baseProfile: Record<string, unknown> = {
      uid,
      role: 'kid',
      name,
      age: ageNumber,
      email: siblingEmail,
      username,
      family_email: familyEmail,
      madrasahname: madrasah,
      points: 0,
      weeklypoints: 0,
      monthlypoints: 0,
      level: 'Beginner',
    };

    let profileRes = await supabaseAdmin
      .from('users')
      .upsert({ ...baseProfile, contactnumber: contact }, { onConflict: 'uid' });

    if (profileRes.error?.code === '42703') {
      profileRes = await supabaseAdmin
        .from('users')
        .upsert({ ...baseProfile, contact_number: contact }, { onConflict: 'uid' });
    }
    if (profileRes.error?.code === '42703') {
      profileRes = await supabaseAdmin.from('users').upsert(baseProfile, { onConflict: 'uid' });
    }
    if (profileRes.error?.code === '42703') {
      const { username: _u, family_email: _f, ...legacy } = baseProfile;
      profileRes = await supabaseAdmin.from('users').upsert(legacy, { onConflict: 'uid' });
    }

    if (profileRes.error) {
      await supabaseAdmin.auth.admin.deleteUser(uid).catch(() => {});
      return NextResponse.json({ error: profileRes.error.message }, { status: 500 });
    }

    await supabaseAdmin
      .from('users')
      .update({ username, family_email: familyEmail, age: ageNumber, name, email: siblingEmail })
      .eq('uid', uid);

    await ensureUserRecords(uid);

    if (me?.uid) {
      await supabaseAdmin.from('users').update({ family_email: familyEmail }).eq('uid', String(me.uid));
    }

    return NextResponse.json({
      ok: true,
      member: { uid, username, name, age: ageNumber, familyEmail },
      message: `${name} can now sign in with username "${username}" or the family email, using the same password.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
