-- =============================================================
-- 무료 플랜 사용자 월간 크레딧 재발급
-- period_end가 지났으면 새 30일 period + free 플랜 credits 부여
-- weekly-grant edge function이 grant_weekly_pro_benefits와 함께 호출
-- =============================================================

create or replace function public.grant_monthly_free_credits()
returns table (granted_count int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  v_free_credits int;
begin
  select ai_credits_monthly into v_free_credits
  from public.subscription_plans where code = 'free';

  if v_free_credits is null then
    v_free_credits := 10;
  end if;

  with expired_users as (
    select p.id as user_id
    from public.profiles p
    where p.user_type = 'student'
      and not exists (
        select 1 from public.user_credits c
        where c.user_id = p.id
          and c.source = 'free_monthly'
          and c.period_end > now()
      )
  ),
  inserted as (
    insert into public.user_credits (user_id, period_start, period_end, credits_granted, source)
    select user_id, now(), now() + interval '30 days', v_free_credits, 'free_monthly'
    from expired_users
    returning user_id
  )
  select count(*)::int into v_count from inserted;

  return query select v_count;
end;
$$;

grant execute on function public.grant_monthly_free_credits() to service_role;
