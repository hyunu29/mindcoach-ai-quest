-- =============================================================
-- 주간 학원 원생 지급: 이용권 1장 + 크레딧 5개
-- weekly-grant edge function이 grant_weekly_pro_benefits와 별개로 호출
-- =============================================================

create or replace function public.grant_weekly_academy_benefits()
returns table (granted_count int)
language plpgsql
security definer
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

  with voucher_insert as (
    insert into public.academy_test_vouchers(user_id, academy_id, source, expires_at)
    select p.id, p.academy_id, 'weekly', now() + interval '30 days'
    from public.profiles p
    where p.academy_id is not null
      and not exists (
        select 1 from public.academy_test_vouchers v
        where v.user_id = p.id
          and v.source = 'weekly'
          and v.granted_at >= v_period_start
      )
    returning user_id
  ),
  credit_insert as (
    insert into public.user_credits(user_id, period_start, period_end, credits_granted, source)
    select user_id, v_period_start, v_period_end, 5, 'academy_weekly'
    from voucher_insert
    returning user_id
  )
  select count(*)::int into v_count from voucher_insert;

  return query select v_count;
end;
$$;

grant execute on function public.grant_weekly_academy_benefits() to service_role;
