/**
 * Object storage: Cloudflare R2 (preferred) with Supabase Storage fallback.
 * Set R2_* env vars to stop writing new files into Supabase Storage.
 */

import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { supabaseAdmin } from '@/lib/supabase-admin';

export type StorageBucket = 'voucher-assets' | 'story-recordings';

function clean(value: string | undefined | null): string {
  return String(value || '')
    .trim()
    .replace(/^["']|["']$/g, '');
}

function r2Secret(): string {
  return clean(process.env.R2_SECRET_ACCESS_KEY) || clean(process.env.SECRET_ACCESS_KEY);
}

function r2Configured(): boolean {
  return Boolean(
    clean(process.env.R2_ACCOUNT_ID) &&
      clean(process.env.R2_ACCESS_KEY_ID) &&
      r2Secret() &&
      clean(process.env.R2_BUCKET)
  );
}

export function isR2Enabled(): boolean {
  return r2Configured();
}

function getR2Client(): S3Client {
  const accountId = clean(process.env.R2_ACCOUNT_ID);
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: clean(process.env.R2_ACCESS_KEY_ID),
      secretAccessKey: r2Secret(),
    },
  });
}

function r2Bucket(): string {
  return clean(process.env.R2_BUCKET);
}

/** Object key in R2 (bucket folder prefix = logical Supabase bucket name). */
function r2Key(bucket: StorageBucket, path: string): string {
  const normalized = path.replace(/^\/+/, '');
  if (normalized.startsWith(`${bucket}/`)) return normalized;
  return `${bucket}/${normalized}`;
}

function publicBaseUrl(): string {
  return clean(process.env.R2_PUBLIC_URL).replace(/\/$/, '');
}

export function getPublicObjectUrl(bucket: StorageBucket, path: string): string {
  if (r2Configured() && publicBaseUrl()) {
    return `${publicBaseUrl()}/${r2Key(bucket, path)}`;
  }

  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function getReadableObjectUrl(
  bucket: StorageBucket,
  path: string,
  expiresInSeconds = 3600
): Promise<string> {
  const normalized = String(path || '').replace(/^\/+/, '');
  if (/^https?:\/\//i.test(normalized)) return normalized;

  if (r2Configured()) {
    const key = r2Key(bucket, normalized);
    try {
      const client = getR2Client();
      await client.send(
        new HeadObjectCommand({
          Bucket: r2Bucket(),
          Key: key,
        })
      );
      const base = publicBaseUrl();
      if (base) return `${base}/${key}`;
      return getSignedUrl(
        client,
        new GetObjectCommand({ Bucket: r2Bucket(), Key: key }),
        { expiresIn: expiresInSeconds }
      );
    } catch {
      // Not on R2 — fall through to legacy Supabase object
    }
  }

  try {
    const { data: signed } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(normalized, expiresInSeconds);
    if (signed?.signedUrl) return signed.signedUrl;
  } catch {
    /* ignore */
  }

  return getPublicObjectUrl(bucket, normalized);
}

export async function uploadObject(input: {
  bucket: StorageBucket;
  path: string;
  body: Buffer | Uint8Array;
  contentType: string;
}): Promise<{ path: string; url: string; provider: 'r2' | 'supabase' }> {
  const path = input.path.replace(/^\/+/, '');

  if (r2Configured()) {
    const client = getR2Client();
    const key = r2Key(input.bucket, path);
    await client.send(
      new PutObjectCommand({
        Bucket: r2Bucket(),
        Key: key,
        Body: input.body,
        ContentType: input.contentType,
      })
    );
    const url = publicBaseUrl()
      ? `${publicBaseUrl()}/${key}`
      : await getReadableObjectUrl(input.bucket, path);
    return { path, url, provider: 'r2' };
  }

  const { error } = await supabaseAdmin.storage.from(input.bucket).upload(path, input.body, {
    contentType: input.contentType,
    upsert: false,
  });
  if (error) throw error;
  return {
    path,
    url: getPublicObjectUrl(input.bucket, path),
    provider: 'supabase',
  };
}

export async function deleteObject(
  bucket: StorageBucket,
  path: string
): Promise<{ provider: 'r2' | 'supabase' }> {
  const normalized = path.replace(/^\/+/, '');

  if (r2Configured()) {
    const client = getR2Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: r2Bucket(),
        Key: r2Key(bucket, normalized),
      })
    );
    return { provider: 'r2' };
  }

  const { error } = await supabaseAdmin.storage.from(bucket).remove([normalized]);
  if (error) throw error;
  return { provider: 'supabase' };
}

export function newAssetPath(folder: string, ext: string): string {
  const safeFolder = String(folder || 'general')
    .replace(/[^a-zA-Z0-9/_-]/g, '')
    .replace(/^\/+|\/+$/g, '') || 'general';
  const safeExt = String(ext || 'bin').replace(/[^a-z0-9]/gi, '') || 'bin';
  return `${safeFolder}/${randomUUID()}.${safeExt}`;
}
