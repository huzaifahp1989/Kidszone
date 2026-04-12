
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  const sqlPath = path.join(__dirname, 'RECREATE_RECORDINGS_TABLE.sql');
  console.log(`Reading SQL from ${sqlPath}...`);
  
  try {
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    console.log('SQL content loaded. Length:', sqlContent.length);

    console.log('Attempting to execute SQL via exec_sql RPC...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: sqlContent });

    if (error) {
      console.error('RPC exec_sql failed:', error);
      console.log('Checking if we can use direct query (unlikely)...');
      // If exec_sql fails, we can't do much programmatically without a direct DB connection string
      // which we don't have (only HTTP API).
      
      // Try to see if maybe the error is just permissions or function missing
      if (error.code === 'PGRST202') { // Function not found
         console.error('The exec_sql function does not exist in the database.');
         console.log('Please run the SQL script manually in the Supabase Dashboard SQL Editor.');
      }
    } else {
      console.log('Migration executed successfully via RPC!');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

runMigration();
