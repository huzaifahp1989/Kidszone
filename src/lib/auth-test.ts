import { supabase } from '@/lib/supabase';

export async function testAuthentication() {
  try {
    console.log('🧪 Testing authentication setup...');
    
    // Test 1: Check if Supabase is configured
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session check failed:', sessionError);
      return { success: false, error: 'Session check failed' };
    }
    
    console.log('✅ Session check passed:', { hasSession: !!session });
    
    // Test 2: Check if we can fetch users table (basic connectivity)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (usersError) {
      console.error('❌ Users table access failed:', usersError);
      return { success: false, error: 'Database connection failed' };
    }
    
    console.log('✅ Database connection test passed');
    
    // Test 3: Check environment variables
    const envCheck = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...'
    };
    
    console.log('🔧 Environment check:', envCheck);
    
    return {
      success: true,
      session: !!session,
      envCheck
    };
    
  } catch (error) {
    console.error('🚨 Authentication test failed:', error);
    return { success: false, error: 'Test failed' };
  }
}

export async function testSignIn(email: string, password: string) {
  try {
    console.log(`🧪 Testing sign in for: ${email}`);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('❌ Sign in failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Sign in successful:', { userId: data.user?.id });
    
    // Test session persistence
    const { data: sessionData } = await supabase.auth.getSession();
    
    return {
      success: true,
      userId: data.user?.id,
      sessionPersisted: !!sessionData.session
    };
    
  } catch (error) {
    console.error('🚨 Sign in test failed:', error);
    return { success: false, error: 'Test failed' };
  }
}

export async function testLeaderboardVisibility() {
  try {
    console.log('🧪 Testing leaderboard visibility for current user...');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'No authenticated user' };
    }
    const orderField = 'weekly_points';
    const { data, error } = await supabase
      .from('users_points')
      .select('user_id, total_points, weekly_points, monthly_points')
      .gte(orderField, 0)
      .order(orderField, { ascending: false })
      .limit(50);
    if (error) {
      console.error('❌ Leaderboard query failed:', error.message);
      return { success: false, error: 'Leaderboard query failed' };
    }
    const appears = !!data?.find((row: any) => row.user_id === user.id);
    console.log('✅ Leaderboard test:', { appears });
    return { success: true, appears };
  } catch (error) {
    console.error('🚨 Leaderboard visibility test failed:', error);
    return { success: false, error: 'Test failed' };
  }
}
