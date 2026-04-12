
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRecordings() {
  console.log('Fetching recordings with join...');
  const { data, error } = await supabase
    .from('recordings')
    .select(`
      *,
      story:stories(title, summary),
      profile:users(name, email)
    `)
    .limit(5);

  if (error) {
    console.error('Error fetching recordings:', error);
    
    // Fallback check without join
    console.log('Checking recordings without join...');
    const { data: simpleData, error: simpleError } = await supabase
      .from('recordings')
      .select('*')
      .limit(5);
      
    if (simpleError) {
        console.error('Error fetching simple recordings:', simpleError);
    } else {
        console.log('Simple recordings:', simpleData);
    }
  } else {
    console.log('Recordings with join:', JSON.stringify(data, null, 2));
  }
}

checkRecordings();
