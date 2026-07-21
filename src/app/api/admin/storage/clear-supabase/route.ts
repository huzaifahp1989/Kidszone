import { NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const runtime = 'nodejs';

const BUCKETS = ['voucher-assets', 'story-recordings'] as const;

async function listAllPaths(bucket: string): Promise<string[]> {
  const paths: string[] = [];
  const stack: string[] = [''];

  while (stack.length) {
    const folder = stack.pop()!;
    let offset = 0;
    for (;;) {
      const { data, error } = await supabaseAdmin.storage.from(bucket).list(folder || undefined, {
        limit: 100,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw new Error(`${bucket}: ${error.message}`);
      if (!data?.length) break;

      for (const item of data) {
        if (!item.name || item.name === '.emptyFolderPlaceholder') continue;
        const full = folder ? `${folder}/${item.name}` : item.name;
        if (item.metadata) {
          paths.push(full);
        } else {
          stack.push(full);
        }
      }
      if (data.length < 100) break;
      offset += data.length;
    }
  }
  return paths;
}

async function emptyBucket(bucket: (typeof BUCKETS)[number]) {
  const paths = await listAllPaths(bucket);
  let deleted = 0;
  for (let i = 0; i < paths.length; i += 50) {
    const chunk = paths.slice(i, i + 50);
    const { error } = await supabaseAdmin.storage.from(bucket).remove(chunk);
    if (error) {
      for (const p of chunk) {
        const one = await supabaseAdmin.storage.from(bucket).remove([p]);
        if (!one.error) deleted += 1;
      }
    } else {
      deleted += chunk.length;
    }
  }
  return { bucket, found: paths.length, deleted };
}

/**
 * POST { confirm: "DELETE_SUPABASE_STORAGE" }
 * Empties Supabase Storage buckets after R2 cutover.
 */
export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    if (String(body?.confirm || '') !== 'DELETE_SUPABASE_STORAGE') {
      return NextResponse.json(
        {
          error: 'Confirmation required',
          hint: 'Send { "confirm": "DELETE_SUPABASE_STORAGE" }',
        },
        { status: 400 }
      );
    }

    const results = [];
    for (const bucket of BUCKETS) {
      try {
        results.push(await emptyBucket(bucket));
      } catch (err: unknown) {
        results.push({
          bucket,
          found: 0,
          deleted: 0,
          error: err instanceof Error ? err.message : 'failed',
        });
      }
    }

    return NextResponse.json({
      ok: true,
      results,
      note: 'Old Supabase-only media will no longer load. New uploads use Cloudflare R2.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Cleanup failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
