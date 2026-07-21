#!/usr/bin/env node
/**
 * Initialize points records for users created via family signup
 * This script creates points records for any users that don't have one
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function initializeMissingPointsRecords() {
  try {
    console.log('Fetching users without points records...');

    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('uid, username, name');

    if (usersError) {
      console.error('Error fetching users:', usersError);
      process.exit(1);
    }

    console.log(`Found ${users.length} total users`);

    // Get users with points records
    const { data: usersWithPoints, error: pointsError } = await supabase
      .from('users_points')
      .select('user_id');

    if (pointsError) {
      console.error('Error fetching users with points:', pointsError);
      process.exit(1);
    }

    const usersWithPointsIds = new Set(usersWithPoints.map(p => p.user_id));
    const usersWithoutPoints = users.filter(u => !usersWithPointsIds.has(u.uid));

    console.log(`Found ${usersWithoutPoints.length} users without points records`);

    if (usersWithoutPoints.length === 0) {
      console.log('✓ All users already have points records');
      process.exit(0);
    }

    // Create points records for missing users
    let created = 0;
    for (const user of usersWithoutPoints) {
      const { error } = await supabase
        .from('users_points')
        .insert({
          user_id: user.uid,
          total_points: 0,
          weekly_points: 0,
          monthly_points: 0,
          today_points: 0,
        });

      if (error) {
        console.error(`✗ Failed to create points for ${user.username}:`, error);
      } else {
        console.log(`✓ Created points record for ${user.username} (${user.uid})`);
        created++;
      }
    }

    console.log(`\nSummary: Created ${created}/${usersWithoutPoints.length} points records`);
    process.exit(created === usersWithoutPoints.length ? 0 : 1);
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

initializeMissingPointsRecords();
