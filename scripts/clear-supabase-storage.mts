/**
 * Empty Supabase Storage buckets after cutting over to Cloudflare R2.
 * Usage: npx tsx scripts/clear-supabase-storage.mts
 *
 * WARNING: Deletes ALL objects in voucher-assets + story-recordings.
 * Files already on R2 are safe. Older Supabase-only files will stop playing.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env) || !process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(resolve(process.cwd(), '.env.local'));
loadEnvFile(resolve(process.cwd(), '.env'));

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(
  /^["']|["']$/g,
  ''
);
const key = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''
).replace(/^["']|["']$/g, '');

if (!url || url.includes('placeholder') || !key || key.length < 20) {
  console.error('Missing valid NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKETS = ['voucher-assets', 'story-recordings'] as const;

async function listAllPaths(bucket: string, prefix = ''): Promise<string[]> {
  const paths: string[] = [];
  const stack = [prefix];

  while (stack.length) {
    const folder = stack.pop()!;
    let offset = 0;
    for (;;) {
      const { data, error } = await supabase.storage.from(bucket).list(folder || undefined, {
        limit: 100,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw new Error(`${bucket}/${folder}: ${error.message}`);
      if (!data?.length) break;

      for (const item of data) {
        if (!item.name || item.name === '.emptyFolderPlaceholder') continue;
        const full = folder ? `${folder}/${item.name}` : item.name;
        // folders have null id / metadata in some API versions; treat no metadata as folder
        const isFile = item.id != null || (item.metadata && Object.keys(item.metadata).length > 0);
        if (isFile && item.metadata) {
          paths.push(full);
        } else if (!item.metadata && item.id == null) {
          stack.push(full);
        } else if (isFile) {
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

async function emptyBucket(bucket: string) {
  console.log(`\nListing ${bucket}...`);
  let paths: string[];
  try {
    paths = await listAllPaths(bucket);
  } catch (err) {
    console.warn(`  Skip ${bucket}:`, err instanceof Error ? err.message : err);
    return { bucket, deleted: 0, skipped: true };
  }

  console.log(`  Found ${paths.length} object(s)`);
  if (!paths.length) return { bucket, deleted: 0, skipped: false };

  let deleted = 0;
  const chunkSize = 50;
  for (let i = 0; i < paths.length; i += chunkSize) {
    const chunk = paths.slice(i, i + chunkSize);
    const { error } = await supabase.storage.from(bucket).remove(chunk);
    if (error) {
      console.error(`  Delete failed at ${i}:`, error.message);
      // try one-by-one
      for (const p of chunk) {
        const one = await supabase.storage.from(bucket).remove([p]);
        if (!one.error) deleted += 1;
        else console.warn(`    fail ${p}: ${one.error.message}`);
      }
    } else {
      deleted += chunk.length;
      console.log(`  Deleted ${deleted}/${paths.length}`);
    }
  }
  return { bucket, deleted, skipped: false };
}

async function main() {
  console.log('Clearing Supabase Storage (R2 cutover cleanup)');
  console.log('URL:', url.replace(/https?:\/\//, '').slice(0, 40) + '…');

  const results = [];
  for (const bucket of BUCKETS) {
    results.push(await emptyBucket(bucket));
  }

  console.log('\nDone:');
  for (const r of results) {
    console.log(
      `  ${r.bucket}: ${r.skipped ? 'skipped/missing' : `deleted ${r.deleted} file(s)`}`
    );
  }
  console.log(
    '\nTip: In Supabase Dashboard → Storage you can confirm the buckets look empty.'
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
