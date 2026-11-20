-- ---------------------------------------------------------------------
-- 003: 自重種目とMAX測定への対応
--
--  1. 体重を profiles に持つ。懸垂のような自重種目のボリュームに使う。
--  2. 補助（アシスト）はマイナスの重量として記録する。weight に制約は無いので、
--     そのまま入る。表示側で「補助 -20kg」と読ませる。
--  3. MAX測定（1レップ）を記録できるようにする。失敗は 0 レップ。
--     もとの reps > 0 では入らないので、制約を >= 0 に緩める。
--  4. ボリュームと推定1RMを「体重＋追加重量」で計算し直す。
--     生成列は後から定義を変えられないので、ビューごと作り直す。
--
-- Supabase の SQL Editor にこのファイルの中身を貼って1回実行してください。
-- ---------------------------------------------------------------------

alter table public.profiles
  add column if not exists body_weight numeric(5,2)
  check (body_weight is null or body_weight between 20 and 300);

comment on column public.profiles.body_weight is
  '自重種目のボリューム計算に使う体重(kg)。未設定なら自重ぶんは 0 として扱う。';

alter table public.workout_sets
  add column if not exists is_max boolean not null default false;
alter table public.workout_sets
  add column if not exists body_weight_used numeric(5,2);

comment on column public.workout_sets.is_max is
  'MAX測定（1レップ）か。失敗した場合は reps = 0 で記録する。';
comment on column public.workout_sets.body_weight_used is
  'その日の体重(kg)。自重種目だけ入る。後から体重が変わっても過去の記録は動かない。';

-- MAX失敗を 0 レップで残せるようにする
alter table public.workout_sets drop constraint if exists workout_sets_reps_check;
alter table public.workout_sets add constraint workout_sets_reps_check check (reps >= 0);

-- 生成列はビューから参照されているので、先にビューを落とす
drop view if exists public.v_exercise_best;
drop view if exists public.v_exercise_monthly_best;
drop view if exists public.v_daily_volume;

alter table public.workout_sets drop column if exists volume;
alter table public.workout_sets drop column if exists est_1rm;

alter table public.workout_sets add column volume numeric generated always as (
  case when is_warmup or reps = 0 then 0
       else (weight + coalesce(body_weight_used, 0)) * reps end
) stored;

alter table public.workout_sets add column est_1rm numeric generated always as (
  case when is_warmup or reps = 0 then null
       else round((weight + coalesce(body_weight_used, 0)) * (1 + reps::numeric / 30), 1) end
) stored;

create or replace view public.v_daily_volume
with (security_invoker = true) as
  select user_id, date,
         sum(volume)                 as volume,
         count(*) filter (where not is_warmup) as sets,
         array_agg(distinct part)    as parts
  from public.workout_sets
  where not is_warmup
  group by user_id, date;

create or replace view public.v_exercise_monthly_best
with (security_invoker = true) as
  select user_id, part, exercise,
         date_trunc('month', date)::date as month,
         max(est_1rm) as best_est_1rm,
         max(weight + coalesce(body_weight_used, 0)) as best_weight
  from public.workout_sets
  where not is_warmup and reps > 0
  group by user_id, part, exercise, date_trunc('month', date);

notify pgrst, 'reload schema';

create or replace view public.v_exercise_best
with (security_invoker = true) as
  select user_id, part, exercise,
         max(est_1rm) as best_est_1rm,
         max(date)    as last_date
  from public.workout_sets
  where not is_warmup and reps > 0
  group by user_id, part, exercise;

-- 実測MAX（is_max で成功したセット）。ヒーローのBIG3表示に使う
create or replace view public.v_exercise_max
with (security_invoker = true) as
  select user_id, part, exercise,
         max(weight + coalesce(body_weight_used, 0)) as max_weight,
         max(date) as last_date
  from public.workout_sets
  where is_max and reps > 0
  group by user_id, part, exercise;

notify pgrst, 'reload schema';
