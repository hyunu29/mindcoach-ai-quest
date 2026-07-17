-- =============================================================
-- Academies + admin dashboard RLS (B2B POC)
-- 학원 관리자가 자기 학원 원생들의 심리 신호를 열람
-- =============================================================

-- 1. academies 테이블
create table public.academies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  admin_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index idx_academies_code_lower on public.academies (lower(code));
create index idx_academies_admin_user_id on public.academies (admin_user_id);

comment on table public.academies is '학원 조직 (B2B POC)';
comment on column public.academies.code is '원생이 입력해서 학원에 연결하는 공유 코드';
comment on column public.academies.admin_user_id is '학원 관리자 (profile.user_type = academy_admin)';

alter table public.academies enable row level security;

create policy "academy_admin selects own academy"
  on public.academies for select to authenticated
  using (admin_user_id = auth.uid());

-- 2. profiles.academy_id 컬럼
alter table public.profiles
  add column academy_id uuid references public.academies(id) on delete set null,
  add column academy_joined_at timestamptz;

create index idx_profiles_academy_id on public.profiles (academy_id);

comment on column public.profiles.academy_id is '연결된 학원 (nullable, 원생당 학원 1개)';
comment on column public.profiles.academy_joined_at is '학원 코드로 연결한 시점';

-- 관리자: 자기 학원 원생 profiles select
create policy "academy_admin selects own students profiles"
  on public.profiles for select to authenticated
  using (
    academy_id in (select id from public.academies where admin_user_id = auth.uid())
  );

-- 3. test_results / emotion_records 관리자 select 정책 (정량 데이터만)
create policy "academy_admin selects own students test_results"
  on public.test_results for select to authenticated
  using (
    user_id in (
      select id from public.profiles
      where academy_id in (select id from public.academies where admin_user_id = auth.uid())
    )
  );

create policy "academy_admin selects own students emotion_records"
  on public.emotion_records for select to authenticated
  using (
    user_id in (
      select id from public.profiles
      where academy_id in (select id from public.academies where admin_user_id = auth.uid())
    )
  );

-- 4. 학원 코드로 학원 조회 (원생용 SECURITY DEFINER)
create or replace function public.get_academy_by_code(p_code text)
returns table (id uuid, name text)
language sql security definer
set search_path = public
as $$
  select id, name from public.academies where lower(code) = lower(p_code);
$$;

grant execute on function public.get_academy_by_code(text) to authenticated;
