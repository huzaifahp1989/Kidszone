do $$
begin
  if to_regclass('public.site_announcements') is null then
    raise notice 'Skipping 20260607_add_announcement_placement: public.site_announcements does not exist yet.';
    return;
  end if;

  alter table public.site_announcements
    add column if not exists display_mode text not null default 'inline',
    add column if not exists target_paths text[] not null default array['*']::text[];

  if not exists (
    select 1
    from pg_constraint
    where conname = 'site_announcements_display_mode_check'
  ) then
    alter table public.site_announcements
      add constraint site_announcements_display_mode_check
      check (display_mode in ('inline', 'popup', 'bar'));
  end if;

  update public.site_announcements
  set display_mode = coalesce(display_mode, 'inline'),
      target_paths = case
        when target_paths is null or array_length(target_paths, 1) is null then array['*']::text[]
        else target_paths
      end;
end $$;