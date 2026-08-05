-- =============================================================
-- 이벤트 코드 + 친구초대(추천인) 시스템
-- 1) event_codes: 운영자가 발급하는 코드. 등록 시 valid_until까지
--    전 유료 검사 해금(user_test_access) + 대량 크레딧(user_credits source='event')
--    → 연고티비 촬영팀 등 "기간 내 무제한 이용" 제공용
-- 2) referral: profiles.referral_code(내 초대코드) / referred_by.
--    친구가 코드 입력 시 양쪽 모두 이용권 3개 + 크레딧 10 (30일)
-- =============================================================

-- ── 이벤트 코드 테이블 ──────────────────────────────────────
create table if not exists public.event_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  credits_granted integer not null default 500,
  valid_until timestamptz not null,       -- 등록 가능 기한 = 혜택 만료일
  max_redemptions integer,                -- null = 무제한
  created_at timestamptz not null default now()
);

create table if not exists public.event_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  event_code_id uuid not null references public.event_codes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  unique (event_code_id, user_id)
);

-- RLS: 정책 없이 활성화 → SECURITY DEFINER RPC로만 접근 (코드 열거 방지)
alter table public.event_codes enable row level security;
alter table public.event_code_redemptions enable row level security;

-- ── 추천인 컬럼 ────────────────────────────────────────────
alter table public.profiles add column if not exists referral_code text;
alter table public.profiles add column if not exists referred_by uuid;
create unique index if not exists profiles_referral_code_key
  on public.profiles(referral_code) where referral_code is not null;

-- 바우처 source에 'referral' 허용
alter table public.academy_test_vouchers drop constraint if exists academy_test_vouchers_source_check;
alter table public.academy_test_vouchers add constraint academy_test_vouchers_source_check
  check (source in ('welcome', 'weekly', 'referral'));

-- ── 이벤트 코드 등록 ────────────────────────────────────────
create or replace function public.redeem_event_code(p_code text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_code record;
  v_redeemed integer;
  v_tests integer;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED');
  end if;

  select * into v_code
  from public.event_codes
  where upper(code) = upper(trim(p_code))
  for update;

  if v_code.id is null then
    return jsonb_build_object('ok', false, 'error', 'NOT_FOUND');
  end if;
  if v_code.valid_until <= now() then
    return jsonb_build_object('ok', false, 'error', 'EXPIRED');
  end if;

  if exists (select 1 from public.event_code_redemptions
             where event_code_id = v_code.id and user_id = v_user) then
    return jsonb_build_object('ok', false, 'error', 'ALREADY_REDEEMED');
  end if;

  if v_code.max_redemptions is not null then
    select count(*)::int into v_redeemed
    from public.event_code_redemptions where event_code_id = v_code.id;
    if v_redeemed >= v_code.max_redemptions then
      return jsonb_build_object('ok', false, 'error', 'FULLY_REDEEMED');
    end if;
  end if;

  insert into public.event_code_redemptions(event_code_id, user_id)
  values (v_code.id, v_user);

  -- 크레딧: 코드 만료일까지 사용 가능
  insert into public.user_credits(user_id, period_start, period_end, credits_granted, credits_used, source)
  values (v_user, now(), v_code.valid_until, v_code.credits_granted, 0, 'event');

  -- 전 유료 검사 해금 (만료일까지)
  insert into public.user_test_access(user_id, test_id, expires_at)
  select v_user, t.id, v_code.valid_until
  from public.tests t
  where t.is_free = false and t.is_coming_soon = false;
  get diagnostics v_tests = row_count;

  return jsonb_build_object(
    'ok', true,
    'label', v_code.label,
    'credits', v_code.credits_granted,
    'tests_unlocked', v_tests,
    'valid_until', v_code.valid_until
  );
end;
$$;

-- ── 내 초대코드 조회/생성 ──────────────────────────────────
create or replace function public.get_my_referral_code()
returns text
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_code text;
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_try integer := 0;
begin
  if v_user is null then return null; end if;

  select referral_code into v_code from public.profiles where id = v_user;
  if v_code is not null then return v_code; end if;

  loop
    v_try := v_try + 1;
    v_code := 'MYCH-' || (
      select string_agg(substr(v_alphabet, (floor(random() * 31) + 1)::int, 1), '')
      from generate_series(1, 6)
    );
    begin
      update public.profiles set referral_code = v_code where id = v_user;
      return v_code;
    exception when unique_violation then
      if v_try >= 5 then raise; end if;
    end;
  end loop;
end;
$$;

-- ── 친구 초대코드 등록 (양쪽 보상) ─────────────────────────
create or replace function public.redeem_referral_code(p_code text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_owner uuid;
  v_referred_by uuid;
  v_expires timestamptz := now() + interval '30 days';
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED');
  end if;

  select referred_by into v_referred_by from public.profiles where id = v_user;
  if v_referred_by is not null then
    return jsonb_build_object('ok', false, 'error', 'ALREADY_REDEEMED');
  end if;

  select id into v_owner from public.profiles
  where upper(referral_code) = upper(trim(p_code));

  if v_owner is null then
    return jsonb_build_object('ok', false, 'error', 'NOT_FOUND');
  end if;
  if v_owner = v_user then
    return jsonb_build_object('ok', false, 'error', 'SELF_REFERRAL');
  end if;
  -- 상호 맞초대 이중수령 방지
  if exists (select 1 from public.profiles where id = v_owner and referred_by = v_user) then
    return jsonb_build_object('ok', false, 'error', 'MUTUAL_REFERRAL');
  end if;

  update public.profiles set referred_by = v_owner where id = v_user;

  -- 양쪽 모두: 유료검사 이용권 3개 + 크레딧 10 (30일)
  insert into public.academy_test_vouchers(user_id, academy_id, source, expires_at)
  select u, null, 'referral', v_expires
  from unnest(array[v_user, v_owner]) as u,
       generate_series(1, 3);

  insert into public.user_credits(user_id, period_start, period_end, credits_granted, credits_used, source)
  select u, now(), v_expires, 10, 0, 'referral'
  from unnest(array[v_user, v_owner]) as u;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.redeem_event_code(text) to authenticated;
grant execute on function public.get_my_referral_code() to authenticated;
grant execute on function public.redeem_referral_code(text) to authenticated;

-- ── 연고티비 촬영팀 이벤트 코드 (2026-08-31 KST 자정까지) ──
insert into public.event_codes (code, label, credits_granted, valid_until, max_redemptions)
values ('YONKOTV', '연고티비 촬영팀 무제한 이용', 500, '2026-08-31T23:59:59+09:00', 20)
on conflict (code) do nothing;
