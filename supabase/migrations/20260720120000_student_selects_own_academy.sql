-- =============================================================
-- 원생이 자기 학원(academy_id 매칭)을 조회할 수 있도록 RLS 정책 추가
-- 배경: 기존엔 academy_admin만 select 정책이 있어, 원생의 ProfilePage에서
-- academy name 조회가 RLS로 막혀 "학원 연결됨" 카드가 표시되지 않음.
-- =============================================================

create policy "student selects own academy"
  on public.academies for select to authenticated
  using (
    id = (select academy_id from public.profiles where id = auth.uid())
  );
