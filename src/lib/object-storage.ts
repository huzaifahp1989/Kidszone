/**
 * Object storage: Cloudflare R2 (preferred) with Supabase Storage fallback.
 * Set R2_* env vars to stop writing new files into Supabase Storage.
 *
 * Critical: uploadObject has a R2 → Supabase fallback chain so partial/bad
 * R2 env vars do not block recordings. Errors always carry a `provider` field
 * in JSON responses so callers can surface the real problem.
 */

import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { supabaseAdmin } from '@/lib/supabase-admin';

export type StorageBucket = 'voucher-assets' | 'story-recordings';

export class StorageError extends Error {
  public readonly provider: 'r2' | 'supabase' | 'none';
  public readonly inner?: unknown;
  constructor(message: string, provider: StorageError['provider'], inner?: unknown) {
    super(message);
    this.name = 'StorageError';
    this.provider = provider;
    this.inner = inner;
  }

  toJSON() {
    let causeText = '';
    const i = this.inner as any;
    if (i) {
      if (typeof i === 'string') causeText = i;
      else if (typeof i.message === 'string') causeText = i.message;
      else if (i?.Code || i?.code || i?.name) {
        causeText = [i.Code || i.code, i.name, i.message].filter(Boolean).join(' / ');
      }
    }
    return {
      error: this.message,
      provider: this.provider,
      cause: causeText || undefined,
    };
  }
}

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
    // Fail fast so Supabase fallback runs promptly on bad R2 config.
    requestHandler: {
      requestTimeout: 5_000,
      connectionTimeout: 3_000,
    } as any,
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

function normalizeBody(body: Buffer | Uint8Array | ArrayBufferLike | Blob | string): {
  body: Buffer | Uint8Array;
  contentType: string;
} {
  // Already a Node Buffer
  if (Buffer.isBuffer(body)) return { body, contentType: 'application/octet-stream' };
  // Uint8Array (superset of Node Buffer's Uint8Array shape — but keep Buffer if already created)
  if (body instanceof Uint8Array) return { body, contentType: 'application/octet-stream' };
  // ArrayBuffer (from file.arrayBuffer())
  if (typeof (body as any).byteLength === 'number' && typeof (body as any).slice === 'function') {
    return { body: Buffer.from(body as ArrayBufferLike), contentType: 'application/octet-stream' };
  }
  // Blob (edge-runtime formdata)
  if (typeof (body as Blob).arrayBuffer === 'function') {
    throw new StorageError(
      'uploadObject received a Blob — caller must convert to Buffer first in route handlers.',
      'none'
    );
  }
  return { body: Buffer.from(String(body)), contentType: 'text/plain' };
}

export async function uploadObject(input: {
  bucket: StorageBucket;
  path: string;
  body: Buffer | Uint8Array | ArrayBufferLike | Blob;
  contentType: string;
}): Promise<{ path: string; url: string; provider: 'r2' | 'supabase' }> {
  const path = input.path.replace(/^\/+/, '');
  const { body } = normalizeBody(input.body);
  const contentType = input.contentType || 'application/octet-stream';
  let lastError: unknown = null;

  // ---- Try R2 first (if configured) ----
  if (r2Configured()) {
    try {
      const client = getR2Client();
      const key = r2Key(input.bucket, path);
      await client.send(
        new PutObjectCommand({
          Bucket: r2Bucket(),
          Key: key,
          Body: body,
          ContentType: contentType,
        })
      );
      const url = publicBaseUrl()
        ? `${publicBaseUrl()}/${key}`
        : await getReadableObjectUrl(input.bucket, path);
      return { path, url, provider: 'r2' };
    } catch (r2Err) {
      lastError = r2Err;
      // Swallow intentionally; fall through to Supabase Storage fallback below.
      // (If R2 env vars are partially set but invalid, the app keeps working.)
      if (typeof (console as any).warn === 'function') {
        (console as any).warn(`[storage] R2 upload failed, falling back to Supabase:`, r2Err);
      }
    }
  }

  // ---- Fallback (or primary): Supabase Storage ----
  try {
    const { error } = await supabaseAdmin.storage.from(input.bucket).upload(path, body, {
      contentType,
      // upsert=true handles accidental retries / file naming collisions gracefully.
      upsert: true,
    });
    if (error) {
      throw error;
    }
    return {
      path,
      url: getPublicObjectUrl(input.bucket, path),
      provider: 'supabase',
    };
  } catch (sbErr) {
    if (lastError) {
      throw new StorageError(
        'Storage upload failed on both R2 and Supabase.',
        'supabase',
        sbErr,
      );
    }
    throw new StorageError('Failed to upload recording to storage.', 'supabase', sbErr);
  }
}

export async function deleteObject(
  bucket: StorageBucket,
  path: string
): Promise<{ provider: 'r2' | 'supabase' }> {
  const normalized = path.replace(/^\/+/, '');
  let lastError: unknown = null;

  if (r2Configured()) {
    try {
      const client = getR2Client();
      await client.send(
        new DeleteObjectCommand({
          Bucket: r2Bucket(),
          Key: r2Key(bucket, normalized),
        })
      );
      // Also clean up the Supabase copy if one existed so there's no orphan file.
      try {
        await supabaseAdmin.storage.from(bucket).remove([normalized]);
      } catch {
        /* ignore */
      }
      return { provider: 'r2' };
    } catch (r2Err) {
      lastError = r2Err;
    }
  }

  const { error } = await supabaseAdmin.storage.from(bucket).remove([normalized]);
  if (error) {
    throw new StorageError(
      `Failed to delete storage object (${bucket}/${normalized}).`,
      'supabase',
      lastError ?? error,
    );
  }
  return { provider: 'supabase' };
}

export function newAssetPath(folder: string, ext: string): string {
  const safeFolder = String(folder || 'general')
    .replace(/[^a-zA-Z0-9/_-]/g, '')
    .replace(/^\/+|\/+$/g, '') || 'general';
  const safeExt = String(ext || 'bin').replace(/[^a-z0-9]/gi, '') || 'bin';
  return `${safeFolder}/${randomUUID()}.${safeExt}`;
}

export function buildStorageResponsePayload(error: unknown): {
  error: string;
  provider: 'r2' | 'supabase' | 'none';
  cause?: string;
} {
  if (error instanceof StorageError) {
    return error.toJSON() as any;
  }
  const e = error as any;
  const message = typeof e?.message === 'string' ? e.message : 'Failed to upload recording to storage.';
  const cause =
    typeof error === 'string'
      ? error
      : [e?.Code || e?.code, e?.name, e?.message, e?.error_description]
          .filter(Boolean)
          .join(' / ');
  return { error: message, provider: 'none', cause: cause || undefined };
}
