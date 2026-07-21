import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

interface SignupLearner {
  name: string;
  username: string;
  age: number;
  city: string;
  madrasahName: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { familyEmail, password, learners } = body as {
      familyEmail: string;
      password: string;
      learners: SignupLearner[];
    };

    // Validation
    if (!familyEmail || !password || !learners || learners.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (learners.length > 6) {
      return NextResponse.json({ error: 'Maximum 6 learners per family' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Check username uniqueness
    const usernames = learners.map(l => l.username.toLowerCase());
    const { data: existingUsers, error: checkErr } = await supabaseAdmin
      .from('users')
      .select('username')
      .in('username', usernames);

    if (checkErr && checkErr.code !== '42P01') {
      console.error('Username check error:', checkErr);
      return NextResponse.json({ error: 'Could not verify usernames' }, { status: 500 });
    }

    const takenUsernames = (existingUsers || []).map((u: any) => u.username);
    if (takenUsernames.length > 0) {
      return NextResponse.json(
        { error: `Username(s) already taken: ${takenUsernames.join(', ')}` },
        { status: 400 }
      );
    }

    // Create auth users and profiles
    const createdUsers = [];

    for (const learner of learners) {
      try {
        // Create auth user
        const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
          email: `${learner.username}@${familyEmail.split('@')[1]}`,
          password,
          email_confirm: false,
          user_metadata: {
            name: learner.name,
            username: learner.username.toLowerCase(),
            family_email: familyEmail.toLowerCase(),
            age: learner.age,
            city: learner.city,
            madrasahName: learner.madrasahName,
            needsSignupForm: false,
          },
        });

        if (authErr) {
          console.error(`Auth creation error for ${learner.username}:`, authErr);
          return NextResponse.json(
            { error: `Failed to create account for ${learner.name}: ${authErr.message}` },
            { status: 400 }
          );
        }

        const uid = authData.user.id;

        // Create profile
        const { error: profileErr } = await supabaseAdmin
          .from('users')
          .upsert(
            {
              uid,
              role: 'kid',
              name: learner.name,
              username: learner.username.toLowerCase(),
              family_email: familyEmail.toLowerCase(),
              age: learner.age,
              city: learner.city,
              madrasahname: learner.madrasahName || null,
              email: `${learner.username}@${familyEmail.split('@')[1]}`,
              points: 0,
              weeklypoints: 0,
              monthlypoints: 0,
              level: 'Beginner',
            },
            { onConflict: 'uid', ignoreDuplicates: false }
          );

        if (profileErr && profileErr.code !== '42703') {
          console.error(`Profile creation error for ${learner.username}:`, profileErr);
        }

        // Create points record
        console.log(`Creating points record for ${learner.username} (${uid})`);
        const { data: pointsData, error: pointsErr } = await supabaseAdmin
          .from('users_points')
          .upsert(
            {
              user_id: uid,
              total_points: 0,
              weekly_points: 0,
              monthly_points: 0,
              today_points: 0,
            },
            { onConflict: 'user_id', ignoreDuplicates: false }
          );

        console.log(`Points upsert result: error=${!!pointsErr}, data=${JSON.stringify(pointsData)}`);
        if (pointsErr) {
          console.error(`Points record creation error for ${learner.username}:`, pointsErr);
          // Continue anyway - profile is created, points record can be created manually if needed
        }

        createdUsers.push({
          uid,
          name: learner.name,
          username: learner.username.toLowerCase(),
          email: `${learner.username}@${familyEmail.split('@')[1]}`,
        });
      } catch (err: any) {
        console.error(`Error creating account for ${learner.name}:`, err);
        return NextResponse.json(
          { error: `Failed to create account for ${learner.name}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created ${createdUsers.length} learner account(s)`,
      users: createdUsers,
    });
  } catch (error: any) {
    console.error('Family signup error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create family accounts' },
      { status: 500 }
    );
  }
}
