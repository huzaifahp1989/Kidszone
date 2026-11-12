-- Optional link from a public monthly winner to a learner account.
-- When set and the winner is published, the learner is highlighted with a
-- winner tick on the public leaderboard, while the winners page keeps showing
-- only the child-safe details (first name, age bracket, city).

alter table public.monthly_public_winners
  add column if not exists user_id uuid;

create index if not exists monthly_public_winners_user_idx
  on public.monthly_public_winners (user_id);

-- Optional photo shown next to the winner on the winners page.
alter table public.monthly_public_winners
  add column if not exists photo_url text,
  add column if not exists photo_path text;
