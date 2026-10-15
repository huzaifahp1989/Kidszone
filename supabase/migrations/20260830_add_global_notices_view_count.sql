-- ****************************************
-- Add view_count counter to global_notices
-- Increments every time a user (signed-in OR guest) opens the bell panel.
-- ****************************************

alter table public.global_notices
    add column if not exists view_count bigint not null default 0;

create index if not exists global_notices_view_count_idx
    on public.global_notices (view_count desc);

-- ****************************************
-- Optional: true atomic increment RPC
-- (fallback in app code is read+write if this RPC is missing.)
-- ****************************************

create or replace function public.global_notices_increment_view_count(notice_id_param uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
    update public.global_notices
    set view_count = coalesce(view_count, 0) + 1
    where id = notice_id_param;
end; $$;

revoke all on function public.global_notices_increment_view_count(uuid) from public;
