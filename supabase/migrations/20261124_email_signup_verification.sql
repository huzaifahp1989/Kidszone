-- Email signup verification.
--
-- Accounts are no longer created straight from the signup form. The form first
-- creates a pending verification row here, we email a 6-digit code, and the
-- Supabase auth user + profile are only created once that code is verified.
-- That guarantees every account in the database has a verified email address.
--
-- Run in the Supabase SQL editor (or via `supabase db push`) before deploying
-- the signup changes.

create extension if not exists pgcrypto;

create table if not exists public.email_verifications (
  id uuid primary key default gen_random_uuid(),
  -- Lowercased address the code was sent to.
  email text not null,
  -- 'single' (one learner) or 'family' (several learners sharing one email).
  kind text not null default 'single',
  -- sha256(email + code + server secret). The plain code is never stored.
  code_hash text not null,
  -- Signup details captured before the account exists.
  payload jsonb not null default '{}'::jsonb,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_verifications_email_idx
  on public.email_verifications (lower(email), created_at desc);

-- Service-role only: no policies are defined, so anon/authenticated clients
-- cannot read or write verification codes.
alter table public.email_verifications enable row level security;
