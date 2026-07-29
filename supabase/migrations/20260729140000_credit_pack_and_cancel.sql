-- =============================================================
-- Wave 2: 크레딧 팩 + 구독 해지
-- 1) payments.product_type에 credit_pack 추가
-- 2) user_subscriptions.cancel_at_period_end + 본인 update RLS
-- 3) 다중 크레딧 period 지원: 잔량 sum, 소비 순차 차감
-- =============================================================

alter table public.payments drop constraint if exists payments_product_type_check;
alter table public.payments add constraint payments_product_type_check
  check (product_type in ('single_test','pro_subscription','credit_pack'));

alter table public.user_subscriptions
  add column if not exists cancel_at_period_end boolean not null default false;

drop policy if exists "users update own subscription cancel flag" on public.user_subscriptions;
create policy "users update own subscription cancel flag"
  on public.user_subscriptions for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 잔량 합산 (max → sum: 크레딧 팩으로 다중 period 공존)
create or replace function public.get_remaining_credits(p_user_id uuid)
returns numeric
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(sum(credits_granted - credits_used), 0)
  from public.user_credits
  where user_id = p_user_id and period_end > now();
$$;

-- 순차 차감 (만료 빠른 period부터, 여러 row 걸쳐 차감)
create or replace function public.consume_ai_credit_server(p_user_id uuid, p_cost numeric)
returns table (success boolean, credit_id uuid, remaining numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_left numeric := p_cost;
  v_take numeric;
  v_first_id uuid := null;
begin
  for v_row in
    select id, credits_granted, credits_used
    from public.user_credits
    where user_id = p_user_id and period_end > now()
      and credits_granted > credits_used
    order by period_end asc
    for update
  loop
    exit when v_left <= 0;
    v_take := least(v_left, v_row.credits_granted - v_row.credits_used);
    update public.user_credits
       set credits_used = credits_used + v_take
     where id = v_row.id;
    v_left := v_left - v_take;
    if v_first_id is null then v_first_id := v_row.id; end if;
  end loop;

  -- 잔량 부족 시 초과분은 마지막 period에 기록 (사후 정산 원칙)
  if v_left > 0 then
    if v_first_id is null then
      select id into v_first_id
      from public.user_credits
      where user_id = p_user_id and period_end > now()
      order by period_end desc limit 1;
    end if;
    if v_first_id is not null then
      update public.user_credits
         set credits_used = credits_used + v_left
       where id = v_first_id;
    end if;
  end if;

  return query
    select (v_first_id is not null), v_first_id,
      (select coalesce(sum(credits_granted - credits_used), 0)
       from public.user_credits
       where user_id = p_user_id and period_end > now());
end;
$$;
