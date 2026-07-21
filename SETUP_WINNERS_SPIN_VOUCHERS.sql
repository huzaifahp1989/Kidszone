-- ============================================================================
-- FULL SETUP: Auto weekly winners → Spin wheel → Vouchers on Rewards
-- Run once in Supabase → SQL Editor → New query → Run
-- Safe to re-run (uses IF NOT EXISTS / drop policy if exists)
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1) Featured winners (who can spin the wheel)
-- ----------------------------------------------------------------------------
create table if not exists public.featured_winners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now()),
  week_start_date date
);

alter table public.featured_winners
  add column if not exists week_start_date date;

alter table public.featured_winners enable row level security;

drop policy if exists "read_featured_winners" on public.featured_winners;
create policy "read_featured_winners"
  on public.featured_winners
  for select
  using (true);

drop policy if exists "Service role manages featured winners" on public.featured_winners;
create policy "Service role manages featured winners"
  on public.featured_winners
  for all
  to service_role
  using (true)
  with check (true);

grant select on public.featured_winners to anon, authenticated;
grant all on public.featured_winners to service_role;

-- ----------------------------------------------------------------------------
-- 2) Legacy weekly_winners table (used by auto-pick for first winner)
-- ----------------------------------------------------------------------------
create table if not exists public.weekly_winners (
  id uuid primary key default gen_random_uuid(),
  week_start_date date not null,
  week_end_date date not null,
  winner_user_id uuid references auth.users(id) on delete set null,
  winning_score integer,
  prize_tier text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  notified boolean default false,
  unique (week_start_date)
);

alter table public.weekly_winners enable row level security;

drop policy if exists "Anyone can view weekly winners" on public.weekly_winners;
create policy "Anyone can view weekly winners"
  on public.weekly_winners
  for select
  to authenticated, anon
  using (true);

drop policy if exists "Service role can manage weekly winners" on public.weekly_winners;
create policy "Service role can manage weekly winners"
  on public.weekly_winners
  for all
  to service_role
  using (true)
  with check (true);

grant select on public.weekly_winners to authenticated, anon;
grant all on public.weekly_winners to service_role;

-- ----------------------------------------------------------------------------
-- 3) Weekly winner announcements (public / home popup)
-- ----------------------------------------------------------------------------
create table if not exists public.weekly_winner_announcements (
  id uuid primary key default gen_random_uuid(),
  winner_name text not null check (char_length(trim(winner_name)) > 0),
  madrasah_name text,
  week_start_date date not null,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.weekly_winner_announcements
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists weekly_winner_announcements_week_idx
  on public.weekly_winner_announcements (week_start_date desc, created_at desc);

alter table public.weekly_winner_announcements enable row level security;

drop policy if exists "Anyone can view weekly winner announcements" on public.weekly_winner_announcements;
create policy "Anyone can view weekly winner announcements"
  on public.weekly_winner_announcements
  for select
  to authenticated, anon
  using (true);

drop policy if exists "Service role manages weekly winner announcements" on public.weekly_winner_announcements;
create policy "Service role manages weekly winner announcements"
  on public.weekly_winner_announcements
  for all
  to service_role
  using (true)
  with check (true);

grant select on public.weekly_winner_announcements to authenticated, anon;
grant all on public.weekly_winner_announcements to service_role;

-- ----------------------------------------------------------------------------
-- 4) Pick log (cooldown / history for auto picker)
-- ----------------------------------------------------------------------------
create table if not exists public.weekly_winner_pick_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start_date date not null,
  weekly_score integer not null default 0,
  weekly_points integer not null default 0,
  is_new_signup boolean not null default false,
  picked_at timestamptz not null default timezone('utc'::text, now()),
  unique (user_id, week_start_date)
);

create index if not exists weekly_winner_pick_log_week_idx
  on public.weekly_winner_pick_log (week_start_date desc);

alter table public.weekly_winner_pick_log enable row level security;

drop policy if exists "Anyone can view weekly winner pick log" on public.weekly_winner_pick_log;
create policy "Anyone can view weekly winner pick log"
  on public.weekly_winner_pick_log
  for select
  to authenticated, anon
  using (true);

drop policy if exists "Service role manages weekly winner pick log" on public.weekly_winner_pick_log;
create policy "Service role manages weekly winner pick log"
  on public.weekly_winner_pick_log
  for all
  to service_role
  using (true)
  with check (true);

grant select on public.weekly_winner_pick_log to authenticated, anon;
grant all on public.weekly_winner_pick_log to service_role;

-- ----------------------------------------------------------------------------
-- 5) Spin wheel results (one spin per user per score week)
-- ----------------------------------------------------------------------------
create table if not exists public.spin_wheel_spins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start_date date not null,
  reward_key text not null,
  reward_label text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (user_id, week_start_date)
);

create index if not exists spin_wheel_spins_week_idx
  on public.spin_wheel_spins (week_start_date);

create index if not exists spin_wheel_spins_reward_week_idx
  on public.spin_wheel_spins (week_start_date, reward_key);

alter table public.spin_wheel_spins enable row level security;

drop policy if exists "read_spin_wheel_spins" on public.spin_wheel_spins;
create policy "read_spin_wheel_spins"
  on public.spin_wheel_spins
  for select
  using (true);

drop policy if exists "Service role manages spin wheel spins" on public.spin_wheel_spins;
create policy "Service role manages spin wheel spins"
  on public.spin_wheel_spins
  for all
  to service_role
  using (true)
  with check (true);

grant select on public.spin_wheel_spins to anon, authenticated;
grant all on public.spin_wheel_spins to service_role;

-- ----------------------------------------------------------------------------
-- 6) Voucher catalog + redemptions (shown on /rewards and /my-vouchers)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('voucher-assets', 'voucher-assets', true)
on conflict (id) do update set public = excluded.public;

create table if not exists public.business_vouchers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  business_name text not null,
  description text not null default '',
  terms_and_conditions text not null default '',
  start_date timestamptz null,
  expiry_date timestamptz not null,
  status text not null default 'active' check (status in ('draft', 'scheduled', 'active', 'expired', 'inactive')),
  approval_mode text not null default 'auto' check (approval_mode in ('auto', 'manual')),
  audience text not null default 'public' check (audience in ('public', 'points', 'activity', 'competition', 'kids_zone', 'location')),
  discount_type text not null default 'custom' check (discount_type in ('percentage', 'fixed', 'free_item', 'buffet', 'custom')),
  discount_label text not null default '',
  logo_url text null,
  image_url text null,
  banner_url text null,
  location_label text null,
  winners_limit integer null,
  total_redeemed integer not null default 0,
  max_redemptions integer null,
  per_user_limit integer not null default 1,
  period_limit integer null,
  period_limit_window text null check (period_limit_window in ('daily', 'weekly', 'monthly')),
  min_points integer null,
  min_activities integer null,
  public_visible boolean not null default true,
  image_only boolean not null default false,
  manual_approval_required boolean not null default false,
  featured boolean not null default false,
  qr_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.voucher_redemptions (
  id uuid primary key default gen_random_uuid(),
  voucher_id uuid not null references public.business_vouchers(id) on delete cascade,
  user_id uuid not null,
  business_name text not null,
  voucher_title text not null,
  voucher_code text not null unique,
  qr_value text null,
  status text not null default 'active' check (status in ('active', 'used', 'expired', 'pending_approval', 'cancelled')),
  redeemed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz null,
  approved_at timestamptz null,
  approval_notes text null,
  device_fingerprint text null,
  share_url text null,
  image_url text null,
  logo_url text null,
  last_seen_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists public.voucher_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('new_voucher', 'expiring_soon', 'voucher_redeemed', 'voucher_approved')),
  title text not null,
  body text not null,
  voucher_id uuid null references public.business_vouchers(id) on delete set null,
  user_id uuid null,
  created_at timestamptz not null default now()
);

create table if not exists public.voucher_admin_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  actor text not null,
  actor_id uuid null,
  target_type text not null check (target_type in ('voucher', 'redemption', 'notification', 'gallery')),
  target_id text not null,
  details text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_business_vouchers_expiry_date on public.business_vouchers(expiry_date);
create index if not exists idx_business_vouchers_public_visible on public.business_vouchers(public_visible, status);
create index if not exists idx_voucher_redemptions_user_id on public.voucher_redemptions(user_id, redeemed_at desc);
create index if not exists idx_voucher_redemptions_voucher_id on public.voucher_redemptions(voucher_id, redeemed_at desc);
create index if not exists idx_voucher_redemptions_status on public.voucher_redemptions(status);
create index if not exists idx_voucher_notifications_created_at on public.voucher_notifications(created_at desc);
create index if not exists idx_voucher_admin_logs_created_at on public.voucher_admin_logs(created_at desc);

create or replace function public.touch_business_vouchers_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_business_vouchers_updated_at on public.business_vouchers;
create trigger trg_touch_business_vouchers_updated_at
before update on public.business_vouchers
for each row
execute function public.touch_business_vouchers_updated_at();

alter table public.business_vouchers enable row level security;
alter table public.voucher_redemptions enable row level security;
alter table public.voucher_notifications enable row level security;
alter table public.voucher_admin_logs enable row level security;

drop policy if exists "Public can view visible vouchers" on public.business_vouchers;
create policy "Public can view visible vouchers"
  on public.business_vouchers
  for select
  using (public_visible = true);

drop policy if exists "Service role manages business vouchers" on public.business_vouchers;
create policy "Service role manages business vouchers"
  on public.business_vouchers
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Users can view own redemptions" on public.voucher_redemptions;
create policy "Users can view own redemptions"
  on public.voucher_redemptions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own redemptions" on public.voucher_redemptions;
create policy "Users can insert own redemptions"
  on public.voucher_redemptions
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Service role manages voucher redemptions" on public.voucher_redemptions;
create policy "Service role manages voucher redemptions"
  on public.voucher_redemptions
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Users can view relevant notifications" on public.voucher_notifications;
create policy "Users can view relevant notifications"
  on public.voucher_notifications
  for select
  using (user_id is null or auth.uid() = user_id);

drop policy if exists "Service role manages voucher notifications" on public.voucher_notifications;
create policy "Service role manages voucher notifications"
  on public.voucher_notifications
  for all
  to service_role
  using (true)
  with check (true);

drop policy if exists "Service role manages voucher admin logs" on public.voucher_admin_logs;
create policy "Service role manages voucher admin logs"
  on public.voucher_admin_logs
  for all
  to service_role
  using (true)
  with check (true);

grant select on public.business_vouchers to authenticated, anon;
grant all on public.business_vouchers to service_role;
grant select, insert on public.voucher_redemptions to authenticated;
grant all on public.voucher_redemptions to service_role;
grant select on public.voucher_notifications to authenticated, anon;
grant all on public.voucher_notifications to service_role;
grant all on public.voucher_admin_logs to service_role;

-- ----------------------------------------------------------------------------
-- 7) Seed spin-wheel voucher offers (names MUST match spin prizes)
--    Safe: on conflict do nothing if slug already exists
-- ----------------------------------------------------------------------------
insert into public.business_vouchers (
  slug, title, business_name, description, terms_and_conditions,
  expiry_date, status, approval_mode, audience, discount_type, discount_label,
  public_visible, featured, winners_limit, per_user_limit
)
values
  (
    'juice4-life',
    'Juice4 Life Winner Prize',
    'Juice4 Life',
    'Weekly spin-wheel prize voucher for Juice4 Life.',
    'Winner prize only. Show this voucher in store. Expires 24 hours after it is granted to the winner.',
    timezone('utc'::text, now()) + interval '365 days',
    'active', 'auto', 'competition', 'custom', 'Winner prize',
    true, true, null, 1
  ),
  (
    'grubbins-eat-out',
    'Grubbins Eat Out Winner Prize',
    'Grubbins Eat Out',
    'Weekly spin-wheel prize voucher for Grubbins Eat Out.',
    'Winner prize only. Show this voucher in store. Expires 24 hours after it is granted to the winner.',
    timezone('utc'::text, now()) + interval '365 days',
    'active', 'auto', 'competition', 'custom', 'Winner prize',
    true, true, null, 1
  ),
  (
    'asli-zaiqa',
    'Asli Zaiqa Winner Prize',
    'Asli Zaiqa',
    'Weekly spin-wheel prize voucher for Asli Zaiqa.',
    'Winner prize only. Show this voucher in store. Expires 24 hours after it is granted to the winner.',
    timezone('utc'::text, now()) + interval '365 days',
    'active', 'auto', 'competition', 'custom', 'Winner prize',
    true, true, null, 1
  ),
  (
    'spin-pin',
    'Spin Pin Winner Prize',
    'Spin Pin',
    'Weekly spin-wheel prize voucher for Spin Pin.',
    'Winner prize only. Show this voucher in store. Expires 24 hours after it is granted to the winner.',
    timezone('utc'::text, now()) + interval '365 days',
    'active', 'auto', 'competition', 'custom', 'Winner prize',
    true, true, null, 1
  ),
  (
    'munch-out-takeaway',
    'Munch Out Takeaway Winner Prize',
    'Munch Out Takeaway',
    'Weekly spin-wheel prize voucher for Munch Out Takeaway.',
    'Winner prize only. Show this voucher in store. Expires 24 hours after it is granted to the winner.',
    timezone('utc'::text, now()) + interval '365 days',
    'active', 'auto', 'competition', 'custom', 'Winner prize',
    true, true, null, 1
  ),
  (
    'al-qasswah',
    'Al Qasswah Winner Prize',
    'Al Qasswah',
    'Weekly spin-wheel prize voucher for Al Qasswah.',
    'Winner prize only. Show this voucher in store. Expires 24 hours after it is granted to the winner.',
    timezone('utc'::text, now()) + interval '365 days',
    'active', 'auto', 'competition', 'custom', 'Winner prize',
    true, true, null, 1
  ),
  (
    'grubbins',
    'Grubbins Winner Prize',
    'Grubbins',
    'Weekly spin-wheel prize voucher for Grubbins.',
    'Winner prize only. Show this voucher in store. Expires 24 hours after it is granted to the winner.',
    timezone('utc'::text, now()) + interval '365 days',
    'active', 'auto', 'competition', 'custom', 'Winner prize',
    true, true, null, 1
  )
on conflict (slug) do nothing;

-- ----------------------------------------------------------------------------
-- 8) Quick verify
-- ----------------------------------------------------------------------------
select 'featured_winners' as table_name, count(*)::text as rows from public.featured_winners
union all
select 'weekly_winners', count(*)::text from public.weekly_winners
union all
select 'weekly_winner_announcements', count(*)::text from public.weekly_winner_announcements
union all
select 'weekly_winner_pick_log', count(*)::text from public.weekly_winner_pick_log
union all
select 'spin_wheel_spins', count(*)::text from public.spin_wheel_spins
union all
select 'business_vouchers (active)', count(*)::text from public.business_vouchers where status = 'active'
union all
select 'voucher_redemptions', count(*)::text from public.voucher_redemptions;
