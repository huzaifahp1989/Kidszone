/**
 * Fallback helper for announcement images.
 * Some stored image URLs point at R2 (uploaded from production). If the local
 * dev environment does not have R2 credentials, or the R2 object is not public,
 * the browser will fail to load them. This function derives the matching
 * Supabase Storage public URL from a stored URL so we can retry loading it.
 */

function getSupabaseProjectUrl(): string {
  // Use the same project URL the app already uses for storage.
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, '') ||
    'https://jlqrbbqsuksncrxjcmbc.supabase.co'
  );
}

export function getAnnouncementImageFallbackUrl(originalUrl: string): string | null {
  const url = String(originalUrl || '').trim();
  if (!url || !/^https?:\/\//i.test(url)) return null;

  try {
    const parsed = new URL(url);
    // Already a Supabase Storage URL — no fallback needed.
    if (parsed.hostname.includes('.supabase.co') && parsed.pathname.includes('/storage/v1/object/public/')) {
      return null;
    }

    // Extract the bucket path from the end of the URL.
    // Expected formats:
    //   https://pub-xxxxx.r2.dev/voucher-assets/announcements/uuid.png
    //   https://custom.domain/voucher-assets/announcements/uuid.png
    // The stored key in site_announcements.image_urls is the full public URL
    // produced by object-storage.ts. We need the path after the bucket name.
    const match = parsed.pathname.match(/\/(voucher-assets|story-recordings)\/(.+)$/);
    if (!match) return null;

    const bucket = match[1];
    const path = match[2];
    return `${getSupabaseProjectUrl()}/storage/v1/object/public/${bucket}/${path}`;
  } catch {
    return null;
  }
}
