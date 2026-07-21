do $$
begin
  if to_regclass('public.site_announcements') is null then
    raise notice 'Skipping 20260607_add_announcement_schedule: public.site_announcements does not exist yet.';
    return;
  end if;

  alter table public.site_announcements
    add column if not exists start_at timestamp with time zone null,
    add column if not exists end_at timestamp with time zone null,
    add column if not exists repeat_unit text not null default 'always',
    add column if not exists repeat_every integer not null default 1,
    add column if not exists show_for_hours integer not null default 24;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'site_announcements_repeat_unit_check'
  ) then
    alter table public.site_announcements
      add constraint site_announcements_repeat_unit_check
      check (repeat_unit in ('always', 'hours', 'daily', 'weekly', 'monthly'));
  end if;

  update public.site_announcements
  set repeat_unit = case
        when repeat_unit in ('always', 'hours', 'daily', 'weekly', 'monthly') then repeat_unit
        else 'always'
      end,
      repeat_every = greatest(coalesce(repeat_every, 1), 1),
      show_for_hours = greatest(coalesce(show_for_hours, 24), 1);
end $$;
