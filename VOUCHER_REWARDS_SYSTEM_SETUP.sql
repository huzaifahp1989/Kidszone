create extension if not exists pgcrypto;

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

update public.voucher_redemptions
set status = 'expired'
where status in ('active', 'pending_approval')
  and expires_at < now();

alter table public.business_vouchers enable row level security;
alter table public.voucher_redemptions enable row level security;
alter table public.voucher_notifications enable row level security;
alter table public.voucher_admin_logs enable row level security;

drop policy if exists "Public can view visible vouchers" on public.business_vouchers;
create policy "Public can view visible vouchers"
on public.business_vouchers
for select
using (public_visible = true);

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

drop policy if exists "Users can view relevant notifications" on public.voucher_notifications;
create policy "Users can view relevant notifications"
on public.voucher_notifications
for select
using (user_id is null or auth.uid() = user_id);