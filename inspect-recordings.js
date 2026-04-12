
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectTable() {
  console.log('Inspecting recordings table...');
  
  // Try to select one record to see structure
  const { data, error } = await supabase
    .from('recordings')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error selecting *:', error);
  } else {
    if (data.length > 0) {
      console.log('Columns found in data:', Object.keys(data[0]));
    } else {
      console.log('Table is empty, cannot infer columns from data.');
      // Try to insert a dummy record with minimal fields to see what fails?
      // Or just try to run a raw SQL query if we had a function for it.
      // But we can try to guess columns based on the error "Could not find the 'duration' column"
    }
  }
}

inspectTable();
