-- Stripe checkout idempotency for paid Kids Sadaqah donations

alter table public.kids_donations
  add column if not exists stripe_checkout_session_id text;

create unique index if not exists kids_donations_stripe_session_uidx
  on public.kids_donations (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
