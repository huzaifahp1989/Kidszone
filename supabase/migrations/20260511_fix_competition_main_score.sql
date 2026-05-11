-- Fix: ensure main_score/total_score are always recalculated from question_marks + bonus_marks.
-- This fixes cases where only bonus_marks updates were reflected (main_score stayed 0).

create or replace function public.compute_competition_scores()
returns trigger
language plpgsql
as $$
declare
  qm int[];
  main_sum int;
  bonus int;
begin
  qm := coalesce(new.question_marks, '{}'::int[]);
  select coalesce(sum(x), 0) into main_sum from unnest(qm) as x;
  bonus := coalesce(new.bonus_marks, 0);

  new.main_score := main_sum;
  new.total_score := main_sum + bonus;
  new.updated_at := timezone('utc'::text, now());

  return new;
end;
$$;

do $$
declare
  r record;
begin
  -- Apply trigger to any table that looks like a competition submissions table
  -- (must have: question_marks, bonus_marks, main_score, total_score).
  for r in
    select table_schema, table_name
    from information_schema.columns
    where table_schema = 'public'
      and column_name in ('question_marks', 'bonus_marks', 'main_score', 'total_score')
    group by table_schema, table_name
    having count(distinct column_name) = 4
  loop
    execute format('drop trigger if exists trg_compute_competition_scores on %I.%I;', r.table_schema, r.table_name);
    execute format(
      'create trigger trg_compute_competition_scores
       before insert or update of question_marks, bonus_marks
       on %I.%I
       for each row
       execute function public.compute_competition_scores();',
      r.table_schema,
      r.table_name
    );

    -- Backfill existing rows (so already-reviewed submissions are fixed immediately)
    execute format(
      'update %I.%I
       set main_score = coalesce((select sum(x) from unnest(coalesce(question_marks, ''{}''::int[])) as x), 0),
           total_score = coalesce((select sum(x) from unnest(coalesce(question_marks, ''{}''::int[])) as x), 0) + coalesce(bonus_marks, 0),
           updated_at = timezone(''utc''::text, now());',
      r.table_schema,
      r.table_name
    );
  end loop;
end;
$$;

