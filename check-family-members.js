const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function checkFamily() {
  try {
    // Check for users with the test family email
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('uid, username, name, family_email, age')
      .or(`family_email.eq.testfamily2@example.com,family_email.eq.testfamily@example.com`);

    if (error) {
      console.error('Error querying users:', error);
      return;
    }

    console.log('\n✅ Family Members Found:');
    console.log(JSON.stringify(data, null, 2));
    
    // Check if users_points exist for these users
    if (data && data.length > 0) {
      console.log('\n📊 Checking points records for these users:');
      for (const user of data) {
        const { data: points, error: pErr } = await supabaseAdmin
          .from('users_points')
          .select('user_id, total_points, weekly_points, monthly_points')
          .eq('user_id', user.uid)
          .maybeSingle();
        
        if (!pErr && points && points.user_id) {
          console.log(`\n${user.username} (${user.name}):`);
          console.log(`  ✓ Points record exists:`);
          console.log(`    Total: ${points.total_points || 0}`);
          console.log(`    Weekly: ${points.weekly_points || 0}`);
          console.log(`    Monthly: ${points.monthly_points || 0}`);
        } else {
          console.log(`\n${user.username} (${user.name}):`);
          console.log(`  ✗ Points record NOT FOUND`);
        }
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkFamily();
