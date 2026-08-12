-- =============================================================
-- 2026-08-12 확정 반영
-- 1) 가격 개편: 검사 단품 개인 5,900원 (학원 연결 학생은 2,900원 — 서버 분기)
-- 2) 친구초대 v2: 등록 시 즉시 지급 → "초대받은 친구가 통합검사(INT) 완료 시"
--    양측에 유료검사 이용권 1개 + 크레딧 5개 지급으로 변경
-- =============================================================

-- ── 1) 표시 가격 갱신 (유료 검사 전체) ─────────────────────
update public.tests set price_krw = 5900 where is_free = false;

-- ── 2) 친구초대 보상 이연 ──────────────────────────────────
-- 초대받은 사용자의 보상 지급 완료 마커
alter table public.profiles add column if not exists referral_rewarded_at timestamptz;

-- 기존(v1) 등록자는 이미 3장+10크레딧을 받았으므로 재지급 방지
update public.profiles set referral_rewarded_at = now()
where referred_by is not null and referral_rewarded_at is null;

-- redeem_referral_code: 관계만 기록, 보상은 INT 완료 시
create or replace function public.redeem_referral_code(p_code text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_owner uuid;
  v_referred_by uuid;
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
  if exists (select 1 from public.profiles where id = v_owner and referred_by = v_user) then
    return jsonb_build_object('ok', false, 'error', 'MUTUAL_REFERRAL');
  end if;

  update public.profiles set referred_by = v_owner where id = v_user;

  -- 이미 통합검사를 완료한 상태에서 코드를 등록하면 즉시 지급
  if exists (select 1 from public.test_results where user_id = v_user and test_id = 'INT') then
    perform public.grant_referral_rewards(v_user);
    return jsonb_build_object('ok', true, 'rewarded', true);
  end if;

  return jsonb_build_object('ok', true, 'rewarded', false);
end;
$$;

-- 보상 지급 (양측 1 이용권 + 5 크레딧, 30일) — 멱등
create or replace function public.grant_referral_rewards(p_invitee uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_rewarded timestamptz;
  v_expires timestamptz := now() + interval '30 days';
begin
  select referred_by, referral_rewarded_at into v_owner, v_rewarded
  from public.profiles where id = p_invitee
  for update;

  if v_owner is null or v_rewarded is not null then
    return;
  end if;

  update public.profiles set referral_rewarded_at = now() where id = p_invitee;

  insert into public.academy_test_vouchers(user_id, academy_id, source, expires_at)
  select u, null, 'referral', v_expires
  from unnest(array[p_invitee, v_owner]) as u;

  insert into public.user_credits(user_id, period_start, period_end, credits_granted, credits_used, source)
  select u, now(), v_expires, 5, 0, 'referral'
  from unnest(array[p_invitee, v_owner]) as u;
end;
$$;

-- INT 결과 저장 시 보상 트리거
create or replace function public.on_int_result_grant_referral()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.test_id = 'INT' then
    perform public.grant_referral_rewards(new.user_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_int_result_referral on public.test_results;
create trigger trg_int_result_referral
  after insert on public.test_results
  for each row execute function public.on_int_result_grant_referral();
