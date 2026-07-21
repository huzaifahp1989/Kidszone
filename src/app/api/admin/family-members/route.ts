import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { ensureUserRecords } from '@/lib/ensure-user-records';
import {
  normalizeFamilyEmail,
  normalizeUsername,
  isValidUsername,
  createSiblingAuthEmail,
  countFamilyMembers,
  MAX_FAMILY_MEMBERS,
} from '@/lib/family-accounts';

export const dynamic = 'force-dynamic';

const checkAdminAuth = (request: Request) => {
  return request.headers.get('x-admin-auth') === 'true';
};

type AddFamilyMembersBody = {
  familyEmail: string;
  members: Array<{
    name: string;
    username: string;
    age: number | string;
    password: string;
  }>;
};

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as AddFamilyMembersBody;
    const { familyEmail: rawEmail, members } = body;

    if (!rawEmail || !Array.isArray(members) || members.length === 0) {
      return NextResponse.json(
        { error: 'Family email and at least one member are required.' },
        { status: 400 }
      );
    }

    const familyEmail = normalizeFamilyEmail(rawEmail);
    if (!familyEmail.includes('@')) {
      return NextResponse.json(
        { error: 'Please enter a valid family email.' },
        { status: 400 }
      );
    }

    // Validate all members first
    const validatedMembers: Array<{
      name: string;
      username: string;
      age: number;
      password: string;
    }> = [];

    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      const name = String(m.name || '').trim();
      if (!name || name.length < 2) {
        return NextResponse.json(
          { error: `Member ${i + 1}: Please enter a full name (minimum 2 characters).` },
          { status: 400 }
        );
      }

      const username = normalizeUsername(String(m.username || ''));
      if (!isValidUsername(username)) {
        return NextResponse.json(
          {
            error: `Member ${i + 1}: Username must be 3-20 characters with only letters, numbers, or underscores.`,
          },
          { status: 400 }
        );
      }

      const ageNumber = typeof m.age === 'number' ? m.age : parseInt(String(m.age || ''), 10);
      if (!Number.isFinite(ageNumber) || ageNumber < 1 || ageNumber > 120) {
        return NextResponse.json(
          { error: `Member ${i + 1}: Please enter a valid age (1-120).` },
          { status: 400 }
        );
      }

      const password = String(m.password || '').trim();
      if (password.length < 6) {
        return NextResponse.json(
          { error: `Member ${i + 1}: Password must be at least 6 characters.` },
          { status: 400 }
        );
      }

      validatedMembers.push({ name, username, age: ageNumber, password });
    }

    // Check username uniqueness
    for (const m of validatedMembers) {
      const { data: existing } = await supabaseAdmin
        .from('users')
        .select('uid')
        .eq('username', m.username)
        .maybeSingle();

      if (existing?.uid) {
        return NextResponse.json(
          { error: `Username "${m.username}" is already taken.` },
          { status: 409 }
        );
      }
    }

    // Check family member count
    const currentCount = await countFamilyMembers(familyEmail);
    if (currentCount + validatedMembers.length > MAX_FAMILY_MEMBERS) {
      return NextResponse.json(
        {
          error: `Adding ${validatedMembers.length} members would exceed the maximum of ${MAX_FAMILY_MEMBERS} learners per family.`,
        },
        { status: 400 }
      );
    }

    // Create all members
    const createdMembers: Array<{
      uid: string;
      username: string;
      name: string;
      age: number;
      email: string;
    }> = [];

    for (const m of validatedMembers) {
      const siblingEmail = createSiblingAuthEmail(familyEmail, m.username);

      try {
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: siblingEmail,
          password: m.password,
          email_confirm: true,
          user_metadata: {
            name: m.name,
            age: m.age,
            username: m.username,
            family_email: familyEmail,
            needsSignupForm: false,
            signupFormCompletedAt: new Date().toISOString(),
          },
        });

        if (createErr || !created.user?.id) {
          const msg = createErr?.message || 'Could not create user account.';
          return NextResponse.json({ error: `Failed to create "${m.name}": ${msg}` }, { status: 500 });
        }

        const uid = created.user.id;

        // Create user profile
        const baseProfile: Record<string, unknown> = {
          uid,
          role: 'kid',
          name: m.name,
          age: m.age,
          email: siblingEmail,
          username: m.username,
          family_email: familyEmail,
          points: 0,
          weeklypoints: 0,
          monthlypoints: 0,
          level: 'Beginner',
        };

        let profileRes = await supabaseAdmin
          .from('users')
          .upsert(baseProfile, { onConflict: 'uid' });

        if (profileRes.error?.code === '42703') {
          const { username: _u, family_email: _f, ...legacy } = baseProfile;
          profileRes = await supabaseAdmin.from('users').upsert(legacy, { onConflict: 'uid' });
        }

        if (profileRes.error) {
          await supabaseAdmin.auth.admin.deleteUser(uid).catch(() => {});
          return NextResponse.json(
            { error: `Failed to create profile for "${m.name}": ${profileRes.error.message}` },
            { status: 500 }
          );
        }

        // Ensure user records (points table, etc.)
        const ensureResult = await ensureUserRecords(uid);
        if (!ensureResult.ok) {
          console.error(`[admin/family-members] ensureUserRecords failed for ${uid}:`, ensureResult.error);
        }

        createdMembers.push({
          uid,
          username: m.username,
          name: m.name,
          age: m.age,
          email: siblingEmail,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: `Failed to create "${m.name}": ${msg}` }, { status: 500 });
      }
    }

    return NextResponse.json({
      ok: true,
      familyEmail,
      createdMembers,
      message: `Successfully created ${createdMembers.length} learner(s) under ${familyEmail}. They can sign in with their individual usernames using the provided passwords.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
