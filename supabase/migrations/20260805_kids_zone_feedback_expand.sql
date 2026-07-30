-- Expand Kids Zone feedback survey with more options
alter table kids_zone_feedback
  add column if not exists overall_rating integer check (overall_rating between 1 and 5),
  add column if not exists favorite_features text[] default '{}',
  add column if not exists user_role text,
  add column if not exists would_recommend text check (would_recommend in ('yes', 'maybe', 'no')),
  add column if not exists wants_more text[] default '{}',
  add column if not exists heard_from text;
