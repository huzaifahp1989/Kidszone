create extension if not exists "pgcrypto";

-- ****************************************
-- Global Notices (admin -> all users)
-- ****************************************

create table if not exists public.global_notices (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    body text not null,
    url text null,
    icon text not null default '🔔',
    priority text not null default 'normal' check (priority in ('normal','urgent','info')),
    active boolean not null default true,
    created_by uuid null references auth.users (id) on delete set null,
    publish_at timestamptz not null default now(),
    expire_at timestamptz null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists global_notices_active_publish_idx
    on public.global_notices (active, publish_at desc);

create table if not exists public.global_notice_views (
    notice_id uuid not null references public.global_notices (id) on delete cascade,
    user_id uuid not null references auth.users (id) on delete cascade,
    seen_at timestamptz not null default now(),
    read_at timestamptz null,
    primary key (notice_id, user_id)
);

create index if not exists global_notice_views_user_idx
    on public.global_notice_views (user_id, notice_id);

-- ****************************************
-- RLS
-- ****************************************

alter table public.global_notices enable row level security;
alter table public.global_notice_views enable row level security;

-- global_notices: anyone can SELECT active, non-expired, published notices
drop policy if exists "global_notices_select_active" on public.global_notices;
create policy "global_notices_select_active" on public.global_notices
    for select
    using (
        active = true
        and publish_at <= now()
        and (expire_at is null or expire_at > now())
    );

-- global_notices: service role (admin) handles writes via API. Don't open RLS for anon.

-- global_notice_views: users can see only their own rows
drop policy if exists "global_notice_views_select_own" on public.global_notice_views;
create policy "global_notice_views_select_own" on public.global_notice_views
    for select
    using (auth.uid() = user_id);

drop policy if exists "global_notice_views_insert_own" on public.global_notice_views;
create policy "global_notice_views_insert_own" on public.global_notice_views
    for insert
    with check (auth.uid() = user_id);

drop policy if exists "global_notice_views_update_own" on public.global_notice_views;
create policy "global_notice_views_update_own" on public.global_notice_views
    for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- ****************************************
-- Triggers: updated_at
-- ****************************************

create or replace function public.tg_global_notices_set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end; $$;

drop trigger if exists trg_global_notices_updated_at on public.global_notices;
create trigger trg_global_notices_updated_at
before update on public.global_notices
for each row execute function public.tg_global_notices_set_updated_at();
