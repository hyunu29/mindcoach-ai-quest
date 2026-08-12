-- =============================================================
-- 2026-08-12 정책 개편 v3
-- 1) 무료 검사 = 통합 게이트웨이(INT)만. E-3/A-2/D-1 유료 전환 (STAFF-1 교직원용 무료 유지)
-- 2) 학원 연결 혜택 개편: 이용권 지급 전면 폐지 (이용권은 친구초대 전용)
--    - 환영 팩: 크레딧 10개만
--    - 주간 지급: 크레딧 5개만
-- 3) 배너 광고 인프라 (병원 광고 — 주 수입원 계획)
--    v1은 전국/지역 문자열 타겟팅. GPS 위치 수집은 위치기반서비스사업 신고 후 v2.
-- =============================================================

-- ── 1) 무료 검사 축소 ──────────────────────────────────────
update public.tests set is_free = false, price_krw = 5900
where id in ('E-3', 'A-2', 'D-1');

-- ── 2-1) 환영 팩: 크레딧 10 (이용권 없음) ──────────────────
create or replace function public.grant_academy_welcome_pack(p_user_id uuid, p_academy_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_already_granted int;
begin
  -- 중복 지급 방지 (구버전 이용권 수령자 포함)
  select count(*) into v_already_granted
  from public.user_credits
  where user_id = p_user_id and source = 'academy_welcome';

  if v_already_granted = 0 then
    select count(*) into v_already_granted
    from public.academy_test_vouchers
    where user_id = p_user_id and source = 'welcome';
  end if;

  if v_already_granted > 0 then
    return;
  end if;

  insert into public.user_credits(user_id, period_start, period_end, credits_granted, source)
  values (p_user_id, now(), now() + interval '30 days', 10, 'academy_welcome');
end;
$$;

-- ── 2-2) 주간 지급: 크레딧 5만 ─────────────────────────────
create or replace function public.grant_weekly_academy_benefits()
returns table(granted_count integer)
language plpgsql security definer
set search_path = public
as $$
declare
  v_count int := 0;
  v_kst_now timestamp;
  v_period_start timestamptz;
  v_period_end timestamptz;
begin
  v_kst_now := (now() AT TIME ZONE 'Asia/Seoul')::timestamp;
  v_period_start := (date_trunc('day', v_kst_now) - (EXTRACT(dow FROM v_kst_now) || ' days')::interval) AT TIME ZONE 'Asia/Seoul';
  v_period_end := v_period_start + interval '7 days';

  with credit_insert as (
    insert into public.user_credits(user_id, period_start, period_end, credits_granted, source)
    select p.id, v_period_start, v_period_end, 5, 'academy_weekly'
    from public.profiles p
    where p.academy_id is not null
      and not exists (
        select 1 from public.user_credits c
        where c.user_id = p.id
          and c.source = 'academy_weekly'
          and c.period_start >= v_period_start
      )
    returning user_id
  )
  select count(*)::int into v_count from credit_insert;

  return query select v_count;
end;
$$;

-- ── 3) 배너 광고 ───────────────────────────────────────────
create table if not exists public.ad_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text not null,
  link_url text,
  advertiser text not null,
  category text not null default 'hospital',
  region text,                        -- null = 전국, 예: '서울', '경기 화성'
  priority integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.ad_events (
  id uuid primary key default gen_random_uuid(),
  banner_id uuid not null references public.ad_banners(id) on delete cascade,
  user_id uuid,
  event text not null check (event in ('impression', 'click')),
  created_at timestamptz not null default now()
);
create index if not exists ad_events_banner_idx on public.ad_events(banner_id, event, created_at);

alter table public.ad_banners enable row level security;
alter table public.ad_events enable row level security;

create policy "active banners readable" on public.ad_banners
  for select to anon, authenticated
  using (is_active = true and starts_at <= now() and (ends_at is null or ends_at > now()));

create policy "authenticated can log ad events" on public.ad_events
  for insert to authenticated
  with check (auth.uid() = user_id or user_id is null);
