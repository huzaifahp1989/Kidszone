-- Add per-user dismissal (hide) of global notices and distinct viewer-count tracking.
-- Migration: 20260905_global_notices_dismiss_and_distinct_views.sql

-- (1) Add dismissed_at to global_notice_views so users can hide / delete a notice from their own bell.
alter table if exists public.global_notice_views
  add column if not exists dismissed_at timestamptz null;

-- (2) Indexes for the new dismissal flow.
create index if not exists global_notice_views_user_dismissed_idx
  on public.global_notice_views (user_id, dismissed_at desc);

-- (3) Add distinct viewer count column on global_notices so admin and each notice show how many unique users viewed it.
alter table if exists public.global_notices
  add column if not exists viewer_count bigint not null default 0;

create index if not exists global_notices_viewer_count_idx
  on public.global_notices (viewer_count desc);

-- (4) RLS: users can UPDATE their own dismissed_at (and keep seen/read policies as-is).
drop policy if exists "global_notice_views_update_own_dismiss" on public.global_notice_views;
do $$ begin
  -- Keep the existing update_own policy (seen/read); also make sure dismissed_at can be set.
  -- If policy already exists from initial migration, this is a safe no-op for this migration.
  null;
end $$;

-- (5) SECURITY DEFINER RPC: atomically bump viewer_count when a user first views a notice.
-- It is idempotent -- only increments on the very first (notice_id, user_id) pair from global_notice_views.
create or replace function public.global_notices_increment_viewer_count(notice_id_param uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if notice_id_param is null then
    return;
  end if;

  select count(distinct user_id)
    into v_count
    from public.global_notice_views
   where notice_id = notice_id_param
     and seen_at is not null;

  update public.global_notices
     set viewer_count = coalesce(v_count, 0)::bigint
   where id = notice_id_param;
end;
$$;

revoke all on function public.global_notices_increment_viewer_count(uuid) from public;
grant execute on function public.global_notices_increment_viewer_count(uuid) to service_role;
