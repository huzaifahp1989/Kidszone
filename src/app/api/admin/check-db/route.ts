import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const results: any = {
      connection: false,
      storiesTable: false,
      contentColumn: false,
      storiesCount: 0,
      error: null
    };

    // 1. Check Connection
    const { error: healthError } = await supabaseAdmin.from('users').select('count', { count: 'exact', head: true });
    if (!healthError) {
      results.connection = true;
    } else {
        results.error = `Connection failed: ${healthError.message}`;
        return NextResponse.json(results);
    }

    // 2. Check Stories Table
    const { data: stories, error: storiesError } = await supabaseAdmin.from('stories').select('*').limit(1);
    
    if (storiesError) {
      if (storiesError.message.includes('relation "stories" does not exist')) {
        results.storiesTable = false;
      } else {
         results.storiesTable = true; // Exists but maybe other error
         results.error = `Stories check error: ${storiesError.message}`;
      }
    } else {
      results.storiesTable = true;
      results.storiesCount = stories.length;

      // 3. Check for 'content' column
      // We can check by trying to select it specifically if we suspect it's missing,
      // or just inspect the returned object if we had data.
      // Since we might have 0 rows, we can't check keys.
      // We can try to insert a dummy row with content and rollback? No, can't rollback easily via API.
      // We can try to select 'content' column specifically.
      
      const { error: colError } = await supabaseAdmin.from('stories').select('content').limit(1);
      if (colError) {
        results.contentColumn = false;
        results.error = `Column check error: ${colError.message}`;
      } else {
        results.contentColumn = true;
      }
    }

    // 4. Check Daily Progress Table
    const { error: dailyError } = await supabaseAdmin.from('daily_progress').select('count', { count: 'exact', head: true });
    results.dailyProgressTable = !dailyError;
    if (dailyError && !dailyError.message.includes('relation "public.daily_progress" does not exist')) {
        // If it's a different error, log it but don't assume table is missing
        console.error('Daily progress check error:', dailyError);
    }

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
