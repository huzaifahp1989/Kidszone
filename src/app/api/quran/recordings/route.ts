import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { deleteObject, getReadableObjectUrl, uploadObject } from '@/lib/object-storage';

export const dynamic = 'force-dynamic';

async function attachAudioUrls(recordings: Array<{ audio_path?: string; audio_url?: string }>) {
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
  const surahNumber = Number(request.nextUrl.searchParams.get('surahNumber'));
  const userId = request.nextUrl.searchParams.get('userId');

  if (!Number.isInteger(surahNumber) || surahNumber < 78 || surahNumber > 114) {
    return NextResponse.json({ error: 'Invalid surah number' }, { status: 400 });
  }
  if (!userId) {
    return NextResponse.json({ recordings: [] });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('recordings')
      .select('id, title, duration, status, created_at, submitted_at, audio_path, child_name')
      .eq('category', 'quran')
      .eq('user_id', userId)
      .ilike('title', `Surah ${surahNumber}:%`)
      .order('created_at', { ascending: false })
      .limit(10);

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

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('recording');
    const surahNumber = Number(formData.get('surahNumber'));
    const surahName = (formData.get('surahName') as string) || 'Surah';
    const duration = formData.get('duration') as string | null;
    const childName = formData.get('childName') as string | null;
    const userId = formData.get('userId') as string | null;

    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'Recording file is required' }, { status: 400 });
    }
    if (!Number.isInteger(surahNumber) || surahNumber < 78 || surahNumber > 114) {
      return NextResponse.json({ error: 'Invalid surah number' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.byteLength === 0) {
      return NextResponse.json({ error: 'Recording is empty' }, { status: 400 });
    }

    const uploadedFile = file as File & { type?: string; name?: string };
    const mimeType = uploadedFile.type || 'audio/webm';
    const extension = mimeType.includes('mp4')
      ? 'm4a'
      : mimeType.includes('mpeg')
        ? 'mp3'
        : mimeType.includes('ogg')
          ? 'ogg'
          : 'webm';

    const timestamp = Date.now();
    const filename = `quran/${userId || 'guest'}/surah-${surahNumber}_${timestamp}.${extension}`;
    const title = `Surah ${surahNumber}: ${surahName}`;

    try {
      await uploadObject({
        bucket: 'story-recordings',
        path: filename,
        body: buffer,
        contentType: mimeType,
      });
    } catch (uploadError) {
      console.error('Quran recording upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload recording' }, { status: 500 });
    }

    const { data: inserted, error: dbError } = await supabaseAdmin
      .from('recordings')
      .insert({
        user_id: userId || null,
        story_id: null,
        category: 'quran',
        child_name: childName?.trim() || null,
        title,
        description: JSON.stringify({ surahNumber, source: 'juz-amma-learn' }),
        audio_path: filename,
        duration: parseInt(duration || '0', 10),
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .select('id, title, duration, status, created_at, audio_path')
      .single();

    if (dbError) {
      try {
        await deleteObject('story-recordings', filename);
      } catch {
        /* ignore */
      }
      console.error('Quran recording DB error:', dbError);
      return NextResponse.json({ error: 'Failed to save recording' }, { status: 500 });
    }

    const [withUrl] = await attachAudioUrls([inserted]);
    return NextResponse.json({ success: true, recording: withUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to submit recording';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
