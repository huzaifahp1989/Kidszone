import { createClient } from '@supabase/supabase-js';
import { ensureUserProfile } from './user-profile';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuthFlow() {
  console.log('🧪 Testing authentication flow...');

  try {
    // Test 1: Check if we can get the current session
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    console.log('Session check:', session ? '✅ Session exists' : '❌ No session');

    if (sessionError) {
      console.error('Session error:', sessionError);
    }

    // Test 2: If we have a session, test profile loading
    if (session?.session?.user) {
      console.log('User ID:', session.session.user.id);

      // Test profile creation/loading
      const profile = await ensureUserProfile(session.session.user.id);
      console.log('Profile loaded:', profile ? '✅ Profile exists' : '❌ Profile missing');

      if (profile) {
        console.log('Profile data:', {
          name: profile.name,
          points: profile.points,
          level: profile.level
        });
      }
    } else {
      console.log('No active session - user needs to sign in');
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testAuthFlow();
