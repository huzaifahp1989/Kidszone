do $$
begin
  if to_regclass('public.site_announcements') is null then
    raise notice 'Skipping 20260607_add_popup_timer_to_announcements: public.site_announcements does not exist yet.';
    return;
  end if;

  alter table public.site_announcements
    add column if not exists popup_delay_seconds integer not null default 0,
    add column if not exists popup_repeat_minutes integer not null default 1440;

  update public.site_announcements
  set popup_delay_seconds = greatest(coalesce(popup_delay_seconds, 0), 0),
      popup_repeat_minutes = greatest(coalesce(popup_repeat_minutes, 1440), 1);
end $$;
