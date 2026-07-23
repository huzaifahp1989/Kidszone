import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getReadableObjectUrl } from '@/lib/object-storage';
import { getAuthenticatedRequestUser } from '@/lib/request-auth';

export const dynamic = 'force-dynamic';

async function attachAudioUrls<T extends { audio_path?: string }>(recordings: T[]) {
  return Promise.all(
    recordings.map(async (rec) => {
      if (!rec.audio_path) return rec;
      try {
        const audio_url = await getReadableObjectUrl('story-recordings', rec.audio_path, 3600);
        return { ...rec, audio_url };
      } catch {
        return rec;
      }
    })
  );
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const runQuery = async (orderColumn: 'submitted_at' | 'created_at') =>
      supabaseAdmin
        .from('recordings')
        .select(
          `
          *,
          story:stories(title)
        `
        )
        .eq('user_id', user.id)
        .order(orderColumn, { ascending: false });

    let { data, error } = await runQuery('submitted_at');
    if (error && error.message?.includes('submitted_at')) {
      ({ data, error } = await runQuery('created_at'));
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const withUrls = await attachAudioUrls(data || []);
    return NextResponse.json({ recordings: withUrls });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load recordings';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
