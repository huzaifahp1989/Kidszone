require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking database connection...');
  
  // 1. Check if we can connect
  const { data: health, error: healthError } = await supabase.from('users').select('count', { count: 'exact', head: true });
  if (healthError) {
    console.error('Connection check failed (users table):', healthError.message);
  } else {
    console.log('Connection successful.');
  }

  // 2. Check stories table
  console.log('Checking stories table...');
  const { data: stories, error: storiesError } = await supabase.from('stories').select('*').limit(1);
  
  if (storiesError) {
    console.error('Stories table check FAILED:', storiesError.message);
    if (storiesError.message.includes('relation "stories" does not exist')) {
        console.log('\n>>> DIAGNOSIS: The "stories" table does not exist.');
        console.log('>>> ACTION: You must run the SQL setup script in Supabase SQL Editor.');
    }
  } else {
    console.log('Stories table exists.');
    console.log('Count:', stories.length);
    
    // 3. Check for content column explicitly
    console.log('Checking for content column...');
    const { error: colError } = await supabase.from('stories').select('content').limit(1);
    if (colError) {
        console.error('Content column check FAILED:', colError.message);
    } else {
        console.log('Content column exists.');
    }

    // 4. Try to Insert (simulate seeding)
    console.log('Attempting to insert a test story...');
    const { error: insertError } = await supabase.from('stories').upsert([
        {
            title: 'Test Story ' + Date.now(),
            summary: 'Test summary',
            content: 'Test content',
            age_min: 5,
            age_max: 10
        }
    ], { onConflict: 'title' });
    
    if (insertError) {
        console.error('Insert/Upsert failed:', insertError.message);
        if (insertError.message.includes('constraint')) {
             console.log('>>> DIAGNOSIS: Missing unique constraint on "title".');
        }
    } else {
        console.log('Insert successful!');
    }
  }
}

check();
