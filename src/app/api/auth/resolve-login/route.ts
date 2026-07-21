import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  isEmailLike,
  listFamilyMembers,
  normalizeFamilyEmail,
  normalizeUsername,
  type FamilyMemberPublic,
} from '@/lib/family-accounts';

export const dynamic = 'force-dynamic';

type ResolveBody = {
  identifier?: string;
  selectedUsername?: string;
};

function publicMember(m: { username: string; name: string; age: number }): FamilyMemberPublic {
  return { username: m.username, name: m.name, age: m.age };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as ResolveBody;
    const identifier = String(body.identifier || '').trim();
    const selectedUsername = body.selectedUsername
      ? normalizeUsername(body.selectedUsername)
      : '';

    if (!identifier) {
      return NextResponse.json({ error: 'Email or username is required.' }, { status: 400 });
    }

    // Username path: resolve directly to that learner's Auth email.
    if (!isEmailLike(identifier)) {
      const username = normalizeUsername(identifier);
      if (!username) {
        return NextResponse.json({ error: 'Please enter a valid email or username.' }, { status: 400 });
      }

      const { data, error } = await supabaseAdmin
        .from('users')
        .select('uid, email, username, name, age, family_email')
        .eq('username', username)
        .maybeSingle();

      if (error) {
        if (error.code === '42703') {
          return NextResponse.json(
            { error: 'Username login is not set up yet. Run SETUP_FAMILY_USERNAMES.sql in Supabase.' },
            { status: 503 }
          );
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!data?.email) {
        return NextResponse.json({ error: 'No account found for that username.' }, { status: 404 });
      }

      const member: FamilyMemberPublic = {
        username: String(data.username || username),
        name: String(data.name || 'Friend'),
        age: typeof data.age === 'number' ? data.age : Number(data.age) || 0,
      };

      return NextResponse.json({
        needsMemberPick: false,
        authEmail: String(data.email).trim().toLowerCase(),
        familyEmail: normalizeFamilyEmail(String(data.family_email || data.email)),
        member,
        members: [member],
      });
    }

    const familyEmail = normalizeFamilyEmail(identifier);
    const members = await listFamilyMembers(familyEmail);

    if (!members.length) {
      // Fall back to treating the email as a direct Auth email (legacy accounts).
      return NextResponse.json({
        needsMemberPick: false,
        authEmail: familyEmail,
        familyEmail,
        members: [],
      });
    }

    if (selectedUsername) {
      const chosen = members.find((m) => m.username === selectedUsername);
      if (!chosen) {
        return NextResponse.json(
          {
            error: 'That learner is not part of this family account.',
            needsMemberPick: true,
            members: members.map(publicMember),
          },
          { status: 400 }
        );
      }
      return NextResponse.json({
        needsMemberPick: false,
        authEmail: chosen.authEmail,
        familyEmail,
        member: publicMember(chosen),
        members: members.map(publicMember),
      });
    }

    if (members.length === 1) {
      const only = members[0];
      return NextResponse.json({
        needsMemberPick: false,
        authEmail: only.authEmail,
        familyEmail,
        member: publicMember(only),
        members: members.map(publicMember),
      });
    }

    return NextResponse.json({
      needsMemberPick: true,
      familyEmail,
      members: members.map(publicMember),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
