-- =============================================================
-- 학원 연결 즉시 지급: 이용권 3개(30일) + 크레딧 20개
-- 재연결 시 중복 지급 방지 (source = 'welcome' 이미 있으면 skip)
-- =============================================================

create or replace function public.grant_academy_welcome_pack(p_user_id uuid, p_academy_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_already_granted int;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_kst_now timestamp;
begin
  -- 이미 welcome pack 지급받았는지 확인 (재연결 방지)
  select count(*) into v_already_granted
  from public.academy_test_vouchers
  where user_id = p_user_id
    and source = 'welcome';

  if v_already_granted > 0 then
    return;
  end if;

  -- 이용권 3장 (30일 유효)
  insert into public.academy_test_vouchers(user_id, academy_id, source, expires_at)
  select p_user_id, p_academy_id, 'welcome', now() + interval '30 days'
  from generate_series(1, 3);

  -- 크레딧 +20 (이번 주 user_credits 행 없으면 새로 만듦)
  v_kst_now := (now() AT TIME ZONE 'Asia/Seoul')::timestamp;
  v_period_start := (date_trunc('day', v_kst_now) - (EXTRACT(dow FROM v_kst_now) || ' days')::interval) AT TIME ZONE 'Asia/Seoul';
  v_period_end := v_period_start + interval '7 days';

  insert into public.user_credits(user_id, period_start, period_end, credits_granted, source)
  values (p_user_id, v_period_start, v_period_end, 20, 'academy_welcome');
end;
$$;

grant execute on function public.grant_academy_welcome_pack(uuid, uuid) to authenticated;
