-- =============================================================
-- 학원 프로비저닝 (슈퍼 어드민 전용)
-- SQL Editor에서 직접 호출: 학원 생성 + 관리자 계정 승격
-- =============================================================

create or replace function public.provision_academy(
  p_academy_name text,
  p_admin_user_id uuid,
  p_code text
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_academy_id uuid;
begin
  -- 관리자 user_type 승격
  update public.profiles
     set user_type = 'academy_admin'
   where id = p_admin_user_id;

  if not found then
    raise exception 'profile not found for user %', p_admin_user_id;
  end if;

  -- 학원 생성
  insert into public.academies(name, code, admin_user_id, created_by)
  values (p_academy_name, p_code, p_admin_user_id, auth.uid())
  returning id into v_academy_id;

  return v_academy_id;
end;
$$;

comment on function public.provision_academy(text, uuid, text) is
  '학원 프로비저닝: 관리자 계정을 academy_admin으로 승격하고 학원 레코드 생성. SQL Editor에서 슈퍼 어드민만 실행.';

-- 실행 권한은 별도로 grant하지 않음 (SQL Editor의 postgres role만 실행 가능)
revoke execute on function public.provision_academy(text, uuid, text) from public;
revoke execute on function public.provision_academy(text, uuid, text) from authenticated;
