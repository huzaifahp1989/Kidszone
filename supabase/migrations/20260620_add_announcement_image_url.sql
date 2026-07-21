alter table public.site_announcements
  add column if not exists image_url text null;

comment on column public.site_announcements.image_url is 'Optional image shown in popup/inline announcements';
