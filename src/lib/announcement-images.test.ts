import { describe, expect, it } from 'vitest';
import { getAnnouncementSlides, getStableAnnouncementImageUrl } from '@/lib/announcement-images';

describe('announcement image URLs', () => {
  it('converts an R2 URL to the durable announcement endpoint', () => {
    expect(
      getStableAnnouncementImageUrl(
        'https://assets.example.com/voucher-assets/announcements/banner.png?X-Amz-Expires=3600'
      )
    ).toBe('/api/announcement-image?path=announcements%2Fbanner.png');
  });

  it('converts a Supabase signed URL to the durable announcement endpoint', () => {
    expect(
      getStableAnnouncementImageUrl(
        'https://example.supabase.co/storage/v1/object/sign/voucher-assets/announcements/banner.webp?token=expired'
      )
    ).toBe('/api/announcement-image?path=announcements%2Fbanner.webp');
  });

  it('repairs stored slide arrays while preserving unrelated URLs', () => {
    expect(
      getAnnouncementSlides({
        image_urls: [
          'https://pub.example/voucher-assets/announcements/one.jpg',
          'https://images.example.com/two.jpg',
        ],
      })
    ).toEqual([
      '/api/announcement-image?path=announcements%2Fone.jpg',
      'https://images.example.com/two.jpg',
    ]);
  });
});