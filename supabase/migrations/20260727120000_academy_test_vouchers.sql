-- =============================================================
-- 학원 이용권 테이블 (환영 팩/주간 grant로 지급)
-- user_test_access는 결제 접근권 유지. 이용권 소진 시 user_test_access row 생성
-- =============================================================

create table public.academy_test_vouchers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  academy_id uuid references public.academies(id) on delete set null,
  source text not null check (source in ('welcome', 'weekly')),
  granted_at timestamptz not null default now(),
  used_at timestamptz,
  used_for_test_id text,
  expires_at timestamptz not null
);

create index idx_academy_test_vouchers_user_unused
  on public.academy_test_vouchers (user_id, expires_at)
  where used_at is null;

create index idx_academy_test_vouchers_academy on public.academy_test_vouchers (academy_id);

comment on table public.academy_test_vouchers is
  '학원 연결 원생에게 지급된 유료 검사 무료 이용권. used_at is null이면 사용 가능.';

alter table public.academy_test_vouchers enable row level security;

create policy "user selects own vouchers"
  on public.academy_test_vouchers for select to authenticated
  using (auth.uid() = user_id);

-- 관리자는 자기 학원 원생 이용권 조회 가능
create policy "academy_admin selects own students vouchers"
  on public.academy_test_vouchers for select to authenticated
  using (
    user_id in (
      select id from public.profiles
      where academy_id in (select id from public.academies where admin_user_id = auth.uid())
    )
  );

-- 미사용 이용권 개수 조회 헬퍼 (원생이 프로필에서 사용)
create or replace function public.count_unused_academy_vouchers(p_user_id uuid)
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::int
  from public.academy_test_vouchers
  where user_id = p_user_id
    and used_at is null
    and expires_at > now();
$$;

grant execute on function public.count_unused_academy_vouchers(uuid) to authenticated;
