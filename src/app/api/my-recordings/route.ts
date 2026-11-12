import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getReadableObjectUrl } from '@/lib/object-storage';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';
import { isRecordingCategory, isRecordingStatus } from '@/lib/recording-categories';

const RECORDING_SELECT =
  'id, user_id, story_id, category, title, description, child_name, audio_path, duration, status, points_awarded, admin_notes, admin_feedback, is_published, submitted_at, reviewed_at, created_at';

/** Strip characters that would break a PostgREST `.or()` filter expression. */
function sanitizeSearchTerm(value: string): string {
  return value.replace(/[,()%*\\]/g, ' ').trim().slice(0, 80);
}

/**
 * GET /api/my-recordings
 * Returns the signed-in user's OWN recordings only (enforced server-side with the
 * service role but always filtered by user_id). Audio is returned as short-lived
 * signed URLs so private storage is never exposed directly.
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthenticatedRequestUser(request);
    if (!authUser?.id) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = sanitizeSearchTerm(searchParams.get('search') || '');

    let query = supabaseAdmin
      .from('recordings')
      .select(RECORDING_SELECT)
      .eq('user_id', authUser.id)
      .order('created_at', { ascending: false })
      .limit(200);

    if (category && isRecordingCategory(category)) {
      query = query.eq('category', category);
    }
    if (status && isRecordingStatus(status)) {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('my-recordings list error:', error);
      return NextResponse.json({ error: error.message || 'Failed to load recordings' }, { status: 500 });
    }

    const recordings = await Promise.all(
      (data || []).map(async (rec: Record<string, unknown>) => {
        let audio_url: string | null = null;
        if (typeof rec.audio_path === 'string' && rec.audio_path.length > 0) {
          try {
            audio_url = await getReadableObjectUrl('story-recordings', rec.audio_path, 3600);
          } catch {
            audio_url = null;
          }
        }
        return { ...rec, audio_url };
      })
    );

    return NextResponse.json({ recordings });
  } catch (error) {
    console.error('Error in my-recordings GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
