-- =============================================================
-- 크레딧 소수점 전환 + 서버 전용 소비 RPC
-- 1크레딧 = 5,000 가중 토큰 (input + output*8)
-- =============================================================

alter table public.user_credits
  alter column credits_used type numeric(8,2) using credits_used::numeric(8,2);

drop function if exists public.consume_ai_credit(integer);
create or replace function public.consume_ai_credit(p_cost numeric default 1)
returns table (success boolean, credit_id uuid, remaining numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_credit_id uuid;
  v_granted numeric;
  v_used numeric;
begin
  if v_uid is null then
    return query select false, null::uuid, 0::numeric;
    return;
  end if;

  select id, credits_granted, credits_used
    into v_credit_id, v_granted, v_used
  from public.user_credits
  where user_id = v_uid and period_end > now()
  order by period_end desc limit 1
  for update;

  if v_credit_id is null or (v_granted - v_used) < p_cost then
    return query select false, v_credit_id, coalesce(v_granted - v_used, 0);
    return;
  end if;

  update public.user_credits
     set credits_used = credits_used + p_cost
   where id = v_credit_id;

  return query select true, v_credit_id, (v_granted - v_used - p_cost);
end;
$$;

grant execute on function public.consume_ai_credit(numeric) to authenticated;

-- 서버(service_role) 전용: user_id를 명시적으로 받는 소비 RPC
-- 사후 정산이므로 잔량 부족해도 차감 진행 (다음 턴에서 잔량 체크로 차단)
create or replace function public.consume_ai_credit_server(p_user_id uuid, p_cost numeric)
returns table (success boolean, credit_id uuid, remaining numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credit_id uuid;
  v_granted numeric;
  v_used numeric;
begin
  select id, credits_granted, credits_used
    into v_credit_id, v_granted, v_used
  from public.user_credits
  where user_id = p_user_id and period_end > now()
  order by period_end desc limit 1
  for update;

  if v_credit_id is null then
    return query select false, null::uuid, 0::numeric;
    return;
  end if;

  update public.user_credits
     set credits_used = credits_used + p_cost
   where id = v_credit_id;

  return query select true, v_credit_id, greatest(v_granted - v_used - p_cost, 0);
end;
$$;

grant execute on function public.consume_ai_credit_server(uuid, numeric) to service_role;

-- 서버용 잔량 조회 헬퍼
create or replace function public.get_remaining_credits(p_user_id uuid)
returns numeric
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(max(credits_granted - credits_used), 0)
  from public.user_credits
  where user_id = p_user_id and period_end > now();
$$;

grant execute on function public.get_remaining_credits(uuid) to service_role;
