-- Avatar + XP leveling.
-- Persists each learner's chosen collectible emoji avatar (emoji-only, no image assets,
-- no personal data). Level itself is derived from lifetime points in app code, so no
-- extra level column is needed here.
-- Safe to re-run.

alter table public.users add column if not exists avatar_id text;

-- Optional: lightweight unlock/collection history. One row per avatar a learner has
-- ever chosen, so we can show a "my collection" list later without another migration.
-- Kept minimal; written best-effort by /api/me/avatar.
do $$ begin
  create table if not exists public.user_avatars (
    user_id uuid not null references auth.users(id) on delete cascade,
    avatar_id text not null,
    unlocked_at timestamptz not null default timezone('utc'::text, now()),
    primary key (user_id, avatar_id)
  );
exception when duplicate_table then null;
end $$;

do $$ begin alter table public.user_avatars enable row level security; exception when others then null; end $$;

drop policy if exists "Users can view their own avatars" on public.user_avatars;
create policy "Users can view their own avatars"
  on public.user_avatars
  for select
  to authenticated
  using (auth.uid() = user_id);

do $$ begin
  grant select on public.user_avatars to authenticated;
  grant all on public.user_avatars to service_role;
exception when insufficient_privilege then null;
end $$;
