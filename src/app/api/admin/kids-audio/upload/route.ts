import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { deleteObject, getReadableObjectUrl, newAssetPath, uploadObject } from '@/lib/object-storage';
import {
  KIDS_AUDIO_BUCKET,
  KIDS_AUDIO_MAX_BYTES,
  KIDS_AUDIO_PREFIX,
} from '@/lib/kids-audio';

export const dynamic = 'force-dynamic';

const AUDIO_EXT: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
};

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'A file is required.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!buffer.byteLength) {
      return NextResponse.json({ error: 'File is empty.' }, { status: 400 });
    }
    if (buffer.byteLength > KIDS_AUDIO_MAX_BYTES) {
      return NextResponse.json({ error: 'File is too large (max 30MB).' }, { status: 400 });
    }

    const type = ((file as File).type || '').split(';')[0].trim().toLowerCase();
    const originalName = typeof (file as File).name === 'string' ? (file as File).name : '';
    const extFromName = originalName.includes('.')
      ? originalName.split('.').pop()?.toLowerCase()
      : undefined;
    const ext = AUDIO_EXT[type] || extFromName || 'mp3';
    if (!['mp3', 'm4a', 'aac', 'wav', 'ogg', 'webm'].includes(ext)) {
      return NextResponse.json({ error: 'Unsupported audio format.' }, { status: 400 });
    }

    const path = `${KIDS_AUDIO_PREFIX}/${newAssetPath('', ext).replace(/^\//, '')}`;
    await uploadObject({
      bucket: KIDS_AUDIO_BUCKET,
      path,
      body: buffer,
      contentType: type || `audio/${ext === 'mp3' ? 'mpeg' : ext}`,
    });
    const url = await getReadableObjectUrl(KIDS_AUDIO_BUCKET, path, 86400 * 30);
    return NextResponse.json({ url, path });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const path = String(searchParams.get('path') || '').trim();
    if (!path) return NextResponse.json({ error: 'path is required' }, { status: 400 });
    try {
      await deleteObject(KIDS_AUDIO_BUCKET, path);
    } catch {
      /* ignore */
    }
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Delete failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
