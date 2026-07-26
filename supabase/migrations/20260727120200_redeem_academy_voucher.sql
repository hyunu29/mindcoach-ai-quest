-- =============================================================
-- 이용권 사용: 유료 검사 응시 시 이용권 하나를 소진하고
-- user_test_access row 생성 (30일 접근권)
-- =============================================================

create or replace function public.redeem_academy_voucher(p_user_id uuid, p_test_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voucher_id uuid;
begin
  -- 오래된 미사용 이용권부터 소진 (동시성 안전)
  select id into v_voucher_id
  from public.academy_test_vouchers
  where user_id = p_user_id
    and used_at is null
    and expires_at > now()
  order by expires_at asc
  limit 1
  for update skip locked;

  if v_voucher_id is null then
    return false;
  end if;

  update public.academy_test_vouchers
     set used_at = now(),
         used_for_test_id = p_test_id
   where id = v_voucher_id;

  -- user_test_access에 30일 접근권 추가
  insert into public.user_test_access(user_id, test_id, expires_at)
  values (p_user_id, p_test_id, now() + interval '30 days');

  return true;
end;
$$;

grant execute on function public.redeem_academy_voucher(uuid, text) to authenticated;
