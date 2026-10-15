-- Tracks per-month per-user-- Monthly certificates table + RLS.
 awards for:
--   category = 'monthly_points'   (top monthly point earners)
--   category = 'always_active'    (kids with consistent activity across many weeks)

set check_function_bodies = off;

do $$ begin
  create table if not exists public.monthly_certificates (
    id uuid primary key default gen_random_uuid(),
    month_start_date date not null,
    user_id uuid not null references auth.users(id) on delete cascade,
    user_name text not null,
    category text not null check (category in ('monthly_points','always_active')),
    rank int not null default 0 check (rank >= 0),
    tier text not null check (tier in ('gold','silver','bronze','participation','activity')),
    monthly_points int not null default 0 check (monthly_points >= 0),
    monthly_activity_count int not null default 0 check (monthly_activity_count >= 0),
    active_weeks_in_month int not null default 0 check (active_weeks_in_month >= 0),
    consecutive_active_months int not null default 0 check (consecutive_active_months >= 0),
    badges_at_award int not null default 0 check (badges_at_award >= 0),
    level_at_award int not null default 1 check (level_at_award >= 1),
    points_awarded int not null default 0 check (points_awarded >= 0),
    issued_by text,
    issued_at timestamptz not null default timezone('utc'::text, now()),
    unique (month_start_date, user_id, category)
  );
exception when duplicate_table then null;
end $$;

create index if not exists monthly_certificates_user_month_idx
  on public.monthly_certificates (user_id, month_start_date desc);

create index if not exists monthly_certificates_month_rank_idx
  on public.monthly_certificates (month_start_date desc, category, rank asc);

do $$ begin alter table public.monthly_certificates enable row level security; exception when others then null; end $$;

drop policy if exists "Users can view their own monthly certificates" on public.monthly_certificates;
create policy "Users can view their own monthly certificates"
  on public.monthly_certificates
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Admins can insert monthly certificates via service_role only" on public.monthly_certificates;
create policy "Admins can insert monthly certificates via service_role only"
  on public.monthly_certificates
  for insert
  to service_role
  with check (true);

do $$ begin
  grant select on public.monthly_certificates to authenticated;
  grant all on public.monthly_certificates to service_role;
exception when insufficient_privilege then null;
end $$;
