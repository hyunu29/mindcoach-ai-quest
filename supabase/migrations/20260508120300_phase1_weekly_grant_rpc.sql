-- Phase 1 P1.5: weekly grant RPC
-- 매주 일요일 0시 KST에 active Pro 구독자에게 50 크레딧 + 1 임의검사 사용권 발급.
-- 같은 주에 두 번 호출되어도 부작용 없음 (idempotent).

CREATE OR REPLACE FUNCTION public.grant_weekly_pro_benefits()
RETURNS TABLE (granted_count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  v_kst_now timestamp;
  v_period_start timestamptz;
  v_period_end timestamptz;
BEGIN
  -- 이번 주(일요일 00:00 KST 시작) 경계 계산.
  -- date_trunc('week')는 ISO 기준 월요일 시작이라 일요일에는 직전 주로 잡힌다 →
  -- dow(일=0..토=6) 만큼 빼서 가장 최근 일요일 00:00 KST를 직접 구한다.
  v_kst_now := (now() AT TIME ZONE 'Asia/Seoul')::timestamp;
  v_period_start := (date_trunc('day', v_kst_now) - (EXTRACT(dow FROM v_kst_now) || ' days')::interval) AT TIME ZONE 'Asia/Seoul';
  v_period_end := v_period_start + interval '7 days';

  WITH active_pro AS (
    SELECT DISTINCT s.user_id
      FROM public.user_subscriptions s
      JOIN public.subscription_plans p ON p.id = s.plan_id
     WHERE s.status = 'active'
       AND s.current_period_end > now()
       AND p.code = 'pro_monthly'
  ),
  skip_existing AS (
    SELECT user_id
      FROM public.user_credits
     WHERE source = 'pro_weekly'
       AND period_start = v_period_start
  ),
  to_grant AS (
    SELECT user_id FROM active_pro
    EXCEPT
    SELECT user_id FROM skip_existing
  ),
  inserted_credits AS (
    INSERT INTO public.user_credits (user_id, period_start, period_end, credits_granted, source)
    SELECT user_id, v_period_start, v_period_end, 50, 'pro_weekly' FROM to_grant
    RETURNING user_id
  ),
  inserted_entitlements AS (
    INSERT INTO public.test_entitlements (user_id, test_id, source, expires_at)
    SELECT user_id, NULL, 'weekly_pro', v_period_end FROM inserted_credits
    RETURNING user_id
  )
  SELECT count(*)::int INTO v_count FROM inserted_entitlements;

  RETURN QUERY SELECT v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_weekly_pro_benefits() TO service_role;
