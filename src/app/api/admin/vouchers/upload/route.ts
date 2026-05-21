import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { isAdminRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg']);

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const folder = String(formData.get('folder') || 'general');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Only JPG/JPEG files are allowed.' }, { status: 400 });
    }

    const key = `${folder}/${randomUUID()}.jpg`;
    const bytes = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage.from('voucher-assets').upload(key, bytes, {
      contentType: 'image/jpeg',
      upsert: false,
    });

    if (uploadError) throw uploadError;

    const { data } = supabaseAdmin.storage.from('voucher-assets').getPublicUrl(key);
    return NextResponse.json({ url: data.publicUrl, path: key });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to upload asset' }, { status: 500 });
  }
}