alter table public.site_announcements
  add column if not exists image_urls text[] null;

alter table public.site_announcements
  add column if not exists slide_interval_seconds integer not null default 5;

update public.site_announcements
set image_urls = array[image_url]::text[]
where image_url is not null
  and (image_urls is null or array_length(image_urls, 1) is null);
