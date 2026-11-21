-- ---------------------------------------------------------------------
-- 004: 記録の閲覧を承認制にする
--
-- 【なぜ要るか】
--   これまで workouts と workout_sets の閲覧ポリシーが
--     for select using (true)
--   になっていた。「PINなしで覗き見できるように」という意図だったが、
--   anon キーは公開前提の値なので、この設定では
--   **インターネット上の誰でも、ログインせずに全記録とメモを読めてしまう。**
--
-- 【これからの決まり】
--   ・記録を読めるのは、ログインしている人だけ
--   ・他人の記録は、その本人が承認した相手だけ
--   ・承認は一度すれば続く（毎回の申請は不要）
--   ・プロフィール一覧は、ログイン画面に要るので名前だけ公開のまま
--
-- Supabase の SQL Editor にこのファイルの中身を貼って1回実行してください。
-- ---------------------------------------------------------------------

-- 1. 閲覧の申請と承認 ---------------------------------------------------
create table if not exists public.viewer_access (
  owner_id     uuid not null references auth.users on delete cascade,  -- 見られる人
  viewer_id    uuid not null references auth.users on delete cascade,  -- 見たい人
  status       text not null default 'pending' check (status in ('pending', 'approved')),
  requested_at timestamptz not null default now(),
  decided_at   timestamptz,
  primary key (owner_id, viewer_id),
  constraint viewer_access_not_self check (owner_id <> viewer_id)
);

comment on table public.viewer_access is
  '記録の閲覧許可。owner が viewer に対して approved を出すと、viewer は owner の記録を読める。';

alter table public.viewer_access enable row level security;

drop policy if exists va_read    on public.viewer_access;
drop policy if exists va_request on public.viewer_access;
drop policy if exists va_decide  on public.viewer_access;
drop policy if exists va_delete  on public.viewer_access;

-- 自分が関わる行だけ見える
create policy va_read on public.viewer_access for select to authenticated
  using (auth.uid() = owner_id or auth.uid() = viewer_id);

-- 申請できるのは自分の名義でだけ。最初は必ず pending（自分で approved にはできない）
create policy va_request on public.viewer_access for insert to authenticated
  with check (auth.uid() = viewer_id and status = 'pending');

-- 承認できるのは見られる側だけ
create policy va_decide on public.viewer_access for update to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- 申請の取り下げ（申請者）と、許可の取り消し（本人）
create policy va_delete on public.viewer_access for delete to authenticated
  using (auth.uid() = owner_id or auth.uid() = viewer_id);

-- 2. 見てよいかの判定 ---------------------------------------------------
-- ポリシーの中から viewer_access を引くと自分自身のポリシーに引っかかるので、
-- security definer にして判定だけを任せる。返すのは真偽値だけで、
-- 呼び出した本人の権限しか見ないので、これ以上の情報は漏れない。
create or replace function public.can_view(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and (
    target = auth.uid()
    or exists (
      select 1 from public.viewer_access
      where owner_id = target and viewer_id = auth.uid() and status = 'approved'
    )
  );
$$;

revoke all on function public.can_view(uuid) from public, anon;
grant execute on function public.can_view(uuid) to authenticated;

-- 3. 記録の閲覧を絞る ---------------------------------------------------
drop policy if exists workouts_read on public.workouts;
create policy workouts_read on public.workouts for select to authenticated
  using (public.can_view(user_id));

drop policy if exists sets_read on public.workout_sets;
create policy sets_read on public.workout_sets for select to authenticated
  using (public.can_view(user_id));

-- 4. プロフィール -------------------------------------------------------
-- ログイン画面の名前一覧に要るので、行は公開のまま。
-- ただし匿名には「一覧に要る列」しか渡さない。
-- （体重・目標・カレンダーIDまで世界中から読めていたのを止める）
revoke select on public.profiles from anon;
grant select (id, display_name, auth_email, last_login_at) on public.profiles to anon;
grant select on public.profiles to authenticated;

notify pgrst, 'reload schema';
