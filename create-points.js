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

async function createPointsRecords() {
  try {
    const userIds = [
      '45adf717-4bd2-429b-bd4f-23c7c6b97263', // testchild99
      '3e886a7d-a291-4930-a130-ed379210f36a', // ahmed_k123
      'fe6fe460-5994-422a-8921-eda6c2146355'  // fatima_k456
    ];

    console.log('Creating points records...');
    
    for (const uid of userIds) {
      const today = new Date().toISOString().slice(0, 10);
      
      // Try to insert with the assumed column names
      const { data, error } = await supabaseAdmin
        .from('users_points')
        .upsert(
          {
            user_id: uid,
            total_points: 0,
            weekly_points: 0,
            monthly_points: 0,
            today_points: 0,
            badges: 0,
            level: 1,
            last_earned_date: today
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.error(`✗ Failed to create points for ${uid}:`, error.message);
        
        // Try alternate column names
        console.log(`  Trying alternate column names (totalpoints, weeklypoints, monthlypoints)...`);
        const altResult = await supabaseAdmin
          .from('users_points')
          .upsert(
            {
              user_id: uid,
              totalpoints: 0,
              weeklypoints: 0,
              monthlypoints: 0
            },
            { onConflict: 'user_id' }
          );
        
        if (altResult.error) {
          console.error(`  ✗ Also failed with alt names:`, altResult.error.message);
        } else {
          console.log(`  ✓ Created with alternate column names`);
        }
      } else {
        console.log(`✓ Created points record for ${uid}`);
      }
    }

    // Verify the records were created
    console.log('\n📊 Verifying points records:');
    const { data: verify, error: verifyErr } = await supabaseAdmin
      .from('users_points')
      .select('user_id, total_points, weekly_points, monthly_points')
      .in('user_id', userIds);

    if (verifyErr) {
      console.error('Error verifying:', verifyErr.message);
    } else {
      console.log(`Found ${verify ? verify.length : 0} points records:`);
      if (verify) {
        verify.forEach(record => {
          console.log(`  - ${record.user_id}: ${record.total_points || 0} total, ${record.weekly_points || 0} weekly`);
        });
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

createPointsRecords();
