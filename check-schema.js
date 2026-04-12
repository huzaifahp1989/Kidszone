
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
  console.log('Checking recordings table schema...');
  const { data: recordings, error: recError } = await supabase
    .from('recordings')
    .select('*')
    .limit(1);

  if (recError) {
    console.error('Error fetching recordings:', recError);
  } else {
    console.log('Recordings table sample:', recordings);
    if (recordings.length > 0) {
      console.log('Recordings columns:', Object.keys(recordings[0]));
    } else {
      console.log('Recordings table is empty. Trying to insert a dummy row to see errors or just assuming schema is partial.');
    }
  }

  console.log('\nChecking buckets...');
  const { data: buckets, error: bucketsError } = await supabase
    .storage
    .listBuckets();

  if (bucketsError) {
    console.error('Error fetching buckets:', bucketsError);
  } else {
    console.log('Buckets:', buckets.map(b => b.name));
    const storyRecordings = buckets.find(b => b.name === 'story-recordings');
    if (!storyRecordings) {
      console.log('Creating story-recordings bucket...');
      const { data, error } = await supabase.storage.createBucket('story-recordings', {
        public: true, // Make it public for easier access, or keep private and use signed URLs
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['audio/webm', 'audio/mp3', 'audio/wav']
      });
      if (error) console.error('Error creating bucket:', error);
      else console.log('Bucket created:', data);
    } else {
      console.log('story-recordings bucket exists.');
    }
  }
}

checkSchema();
