-- Run in Supabase SQL editor for shareable parent Stripe payment links

create table if not exists public.donation_payment_requests (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_pence integer not null check (amount_pence > 0),
  description text not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'cancelled')),
  stripe_checkout_session_id text,
  expires_at timestamptz not null,
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists donation_payment_requests_user_created_idx
  on public.donation_payment_requests (user_id, created_at desc);

create unique index if not exists donation_payment_requests_stripe_session_uidx
  on public.donation_payment_requests (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

alter table public.donation_payment_requests enable row level security;

drop policy if exists "Service role manages donation payment requests" on public.donation_payment_requests;
create policy "Service role manages donation payment requests"
  on public.donation_payment_requests for all
  to service_role
  using (true)
  with check (true);

grant all on public.donation_payment_requests to service_role;
