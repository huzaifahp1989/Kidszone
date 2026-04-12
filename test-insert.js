
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testInsert() {
  console.log('Testing insert with null story_id...');
  
  // First get a valid user
  const { data: users } = await supabase.from('users').select('uid').limit(1);
  if (!users || users.length === 0) {
    console.error('No users found to test with');
    return;
  }
  const userId = users[0].uid;
  console.log('Using user:', userId);

  const { data, error } = await supabase
    .from('recordings')
    .insert({
      user_id: userId,
      story_id: null,
      audio_path: 'test_audio.webm',
      duration: 10,
      status: 'submitted',
      title: 'Test Studio Recording',
      child_name: 'Test Child',
      description: 'This is a test message'
    })
    .select();

  if (error) {
    console.error('Insert failed:', error);
  } else {
    console.log('Insert successful:', data);
    // Clean up
    await supabase.from('recordings').delete().eq('id', data[0].id);
  }
}

testInsert();
