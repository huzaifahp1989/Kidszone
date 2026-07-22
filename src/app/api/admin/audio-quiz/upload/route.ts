import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { uploadObject, newAssetPath, getReadableObjectUrl } from '@/lib/object-storage';
import { AUDIO_MAX_FILE_BYTES, QUESTION_AUDIO_MIME, extForAudioType } from '@/lib/audio-quiz';
import { AUDIO_QUIZ_BUCKET, QUESTION_AUDIO_PREFIX } from '@/lib/audio-quiz-server';

export const dynamic = 'force-dynamic';

const IMAGE_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const form = await request.formData();
    const file = form.get('file');
    const kind = String(form.get('kind') || 'audio');
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'A file is required.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!buffer.byteLength) return NextResponse.json({ error: 'File is empty.' }, { status: 400 });
    if (buffer.byteLength > AUDIO_MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'File is too large (max 20MB).' }, { status: 400 });
    }

    const type = (file as File).type || '';

    if (kind === 'banner') {
      const base = type.split(';')[0].trim().toLowerCase();
      const ext = IMAGE_MIME[base];
      if (!ext) return NextResponse.json({ error: 'Banner must be JPG, PNG or WebP.' }, { status: 400 });
      const path = newAssetPath('audio-quiz/banners', ext);
      const uploaded = await uploadObject({
        bucket: 'voucher-assets',
        path,
        body: buffer,
        contentType: base,
      });
      return NextResponse.json({ url: uploaded.url, path: uploaded.path });
    }

    // Audio question
    const ext = extForAudioType(type, QUESTION_AUDIO_MIME);
    if (!ext) {
      return NextResponse.json({ error: 'Audio must be MP3, WAV or M4A.' }, { status: 400 });
    }
    const path = `${QUESTION_AUDIO_PREFIX}/${newAssetPath('', ext).replace(/^\//, '')}`;
    await uploadObject({
      bucket: AUDIO_QUIZ_BUCKET,
      path,
      body: buffer,
      contentType: type.split(';')[0].trim().toLowerCase(),
    });
    const url = await getReadableObjectUrl(AUDIO_QUIZ_BUCKET, path, 86400 * 30);
    return NextResponse.json({ url, path });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
