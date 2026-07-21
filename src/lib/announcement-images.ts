export type AnnouncementImageFields = {
  image_url?: string | null;
  image_urls?: string[] | null;
};

export function getAnnouncementSlides(row: AnnouncementImageFields): string[] {
  const fromArray = Array.isArray(row.image_urls)
    ? row.image_urls.map((url) => String(url || '').trim()).filter(Boolean)
    : [];
  if (fromArray.length > 0) return fromArray;

  const single = typeof row.image_url === 'string' ? row.image_url.trim() : '';
  return single ? [single] : [];
}

export function normalizeAnnouncementImages(input: {
  image_url?: string | null;
  image_urls?: string[] | null;
}): { image_url: string | null; image_urls: string[] } {
  const fromArray = Array.isArray(input.image_urls)
    ? input.image_urls.map((url) => String(url || '').trim()).filter(Boolean)
    : [];
  const single = typeof input.image_url === 'string' ? input.image_url.trim() : '';
  const slides = fromArray.length > 0 ? fromArray : single ? [single] : [];

  return {
    image_urls: slides,
    image_url: slides[0] || null,
  };
}

export function announcementHasVisualContent(text: string, slides: string[]): boolean {
  return Boolean(text.trim()) || slides.length > 0;
}
