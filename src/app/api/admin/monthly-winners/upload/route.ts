import { NextResponse } from 'next/server';
import { isAdminSessionRequest } from '@/lib/admin-session';
import { isR2Enabled, newAssetPath, uploadObject } from '@/lib/object-storage';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FOLDER = 'monthly-winners';

function normalizeUploadType(file: File): { contentType: string; ext: string } | null {
  const type = (file.type || '').toLowerCase();
  if (type === 'image/jpeg' || type === 'image/jpg') return { contentType: 'image/jpeg', ext: 'jpg' };
  if (type === 'image/png') return { contentType: 'image/png', ext: 'png' };
  if (type === 'image/webp') return { contentType: 'image/webp', ext: 'webp' };

  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return { contentType: 'image/jpeg', ext: 'jpg' };
  if (name.endsWith('.png')) return { contentType: 'image/png', ext: 'png' };
  if (name.endsWith('.webp')) return { contentType: 'image/webp', ext: 'webp' };

  return null;
}

export async function POST(request: Request) {
  if (!isAdminSessionRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    const normalizedType = normalizeUploadType(file);
    if (!normalizedType) {
      return NextResponse.json({ error: 'Only JPG/JPEG, PNG, and WebP files are allowed.' }, { status: 400 });
    }

    const key = newAssetPath(FOLDER, normalizedType.ext);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const uploaded = await uploadObject({
      bucket: 'voucher-assets',
      path: key,
      body: bytes,
      contentType: normalizedType.contentType,
    });

    return NextResponse.json({
      url: uploaded.url,
      path: uploaded.path,
      provider: uploaded.provider,
      r2Enabled: isR2Enabled(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to upload photo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
