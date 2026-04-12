const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testStudioConstraints() {
  console.log('Testing Studio Recording Constraints...');

  // 1. Try to insert with story_id: null and user_id: valid_uuid
  // We need a valid user_id first. Let's get one.
  const { data: users, error: userError } = await supabase.from('users').select('uid').limit(1);
  if (userError || !users || users.length === 0) {
    console.error('Could not fetch a user for testing:', userError);
    return;
  }
  const userId = users[0].uid;
  console.log(`Using User ID: ${userId}`);

  // Check table structure
  const { data: checkData, error: checkError } = await supabase.from('recordings').select('*').limit(1);
  if (checkError) {
      console.error('Error checking recordings table:', checkError);
  } else {
      console.log('Recordings table sample:', checkData);
  }

  const testRecord1 = {
    user_id: userId,
    story_id: null, // Testing if nullable
    audio_path: 'test/studio_test.webm',
    // duration: 10, // Removed to test column existence
    status: 'submitted'
  };

  console.log('Attempting insert with story_id: null...');
  const { data: data1, error: error1 } = await supabase.from('recordings').insert(testRecord1).select();
  
  if (error1) {
    console.error('Insert failed (story_id: null):', error1.message);
  } else {
    console.log('Insert success (story_id: null)! ID:', data1[0].id);
    // Cleanup
    await supabase.from('recordings').delete().eq('id', data1[0].id);
  }

  // 2. Try to insert with user_id: null (for guest)
  // We need a valid story_id if step 1 failed, but let's assume we want both null for a pure guest studio recording.
  // If step 1 failed, step 2 will likely fail on story_id too, so let's try with a valid story_id if possible.
  
  // Get a story ID
  const { data: stories } = await supabase.from('stories').select('id').limit(1);
  const storyId = stories?.[0]?.id;

  if (storyId) {
      const testRecord2 = {
        user_id: null, // Testing if nullable
        story_id: storyId,
        audio_path: 'test/studio_guest_test.webm',
        // duration: 10,
        status: 'submitted'
      };

      console.log('Attempting insert with user_id: null...');
      const { data: data2, error: error2 } = await supabase.from('recordings').insert(testRecord2).select();

      if (error2) {
        console.error('Insert failed (user_id: null):', error2.message);
      } else {
        console.log('Insert success (user_id: null)! ID:', data2[0].id);
        // Cleanup
        await supabase.from('recordings').delete().eq('id', data2[0].id);
      }
  } else {
      console.log("No stories found to test user_id: null with valid story_id");
  }

}

testStudioConstraints();