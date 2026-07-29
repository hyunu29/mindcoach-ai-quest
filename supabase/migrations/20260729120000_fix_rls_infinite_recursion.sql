-- =============================================================
-- RLS 무한 재귀 fix
-- profiles ↔ academies 상호 참조로 500 (infinite recursion) 발생
-- → SECURITY DEFINER 헬퍼로 우회
-- =============================================================

-- 원생 본인의 학원 id
create or replace function public.my_academy_id()
returns uuid
language sql security definer stable
set search_path = public
as $$ select academy_id from public.profiles where id = auth.uid(); $$;

-- 관리자 본인이 관리하는 학원 id 목록
create or replace function public.my_admin_academy_ids()
returns setof uuid
language sql security definer stable
set search_path = public
as $$ select id from public.academies where admin_user_id = auth.uid(); $$;

-- 관리자 본인이 관리하는 학원의 원생 id 목록
create or replace function public.my_admin_student_ids()
returns setof uuid
language sql security definer stable
set search_path = public
as $$
  select p.id from public.profiles p
  where p.academy_id in (select id from public.academies where admin_user_id = auth.uid());
$$;

grant execute on function public.my_academy_id() to authenticated;
grant execute on function public.my_admin_academy_ids() to authenticated;
grant execute on function public.my_admin_student_ids() to authenticated;

-- 재귀 유발하던 정책들 재작성
drop policy if exists "student selects own academy" on public.academies;
create policy "student selects own academy"
  on public.academies for select to authenticated
  using (id = public.my_academy_id());

drop policy if exists "academy_admin selects own students profiles" on public.profiles;
create policy "academy_admin selects own students profiles"
  on public.profiles for select to authenticated
  using (academy_id in (select public.my_admin_academy_ids()));

drop policy if exists "academy_admin selects own students test_results" on public.test_results;
create policy "academy_admin selects own students test_results"
  on public.test_results for select to authenticated
  using (user_id in (select public.my_admin_student_ids()));

drop policy if exists "academy_admin selects own students emotion_records" on public.emotion_records;
create policy "academy_admin selects own students emotion_records"
  on public.emotion_records for select to authenticated
  using (user_id in (select public.my_admin_student_ids()));

drop policy if exists "academy_admin selects own students vouchers" on public.academy_test_vouchers;
create policy "academy_admin selects own students vouchers"
  on public.academy_test_vouchers for select to authenticated
  using (user_id in (select public.my_admin_student_ids()));
