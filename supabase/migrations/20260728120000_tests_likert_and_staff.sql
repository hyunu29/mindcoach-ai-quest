-- =============================================================
-- tests 테이블에 척도 정보 + 관리자 전용 flag 컬럼 추가
-- 배경: 학원 교직원 심리검사(STAFF-1)는 4점 Likert(0~3)이며 관리자만 응시
-- =============================================================

alter table public.tests
  add column likert_min integer not null default 1,
  add column likert_max integer not null default 5,
  add column likert_labels jsonb,
  add column is_staff_only boolean not null default false;

create index idx_tests_is_staff_only on public.tests (is_staff_only) where is_staff_only;

comment on column public.tests.likert_min is 'Likert 척도 최소값 (기본 1)';
comment on column public.tests.likert_max is 'Likert 척도 최대값 (기본 5)';
comment on column public.tests.likert_labels is '척도별 라벨 배열. null이면 기본 라벨 사용';
comment on column public.tests.is_staff_only is 'true면 학원 관리자용 (원생 목록 제외)';
