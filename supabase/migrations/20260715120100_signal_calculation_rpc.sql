-- =============================================================
-- 신호 계산 RPC
-- 최근 30일 test_results + emotion_records → 그린/옐로/레드/미평가
-- =============================================================

create or replace function public.calculate_student_signal(p_user_id uuid)
returns table (
  user_id uuid,
  risk_area_count integer,
  emotion_avg numeric,
  emotion_record_count integer,
  test_result_count integer,
  last_activity_at timestamptz,
  signal text
)
language plpgsql security definer
set search_path = public
as $$
declare
  v_risk_count integer := 0;
  v_emotion_avg numeric := null;
  v_emotion_count integer := 0;
  v_test_count integer := 0;
  v_last_activity timestamptz := null;
  v_signal text;
  v_int_result record;
  v_domain_threshold constant integer := 12;
begin
  -- INT 검사 최신 결과에서 위험 영역 개수
  select tr.scores, tr.created_at into v_int_result
  from public.test_results tr
  where tr.user_id = p_user_id
    and tr.test_id = 'INT'
    and tr.created_at >= now() - interval '30 days'
  order by tr.created_at desc
  limit 1;

  if v_int_result.scores is not null and v_int_result.scores ? 'subdomain_scores' then
    select count(*)::int into v_risk_count
    from jsonb_each_text(v_int_result.scores -> 'subdomain_scores') e
    where (e.value)::numeric < v_domain_threshold;
  end if;

  -- 개별 단품 검사 위험 등급 카운트 (최근 30일)
  v_risk_count := v_risk_count + coalesce(
    (select count(*)::int
     from public.test_results
     where user_id = p_user_id
       and test_id <> 'INT'
       and risk_level = 'high'
       and created_at >= now() - interval '30 days'), 0);

  -- 감정 평균 (최근 30일)
  select avg(emotion_score)::numeric(4,2), count(*)::int
    into v_emotion_avg, v_emotion_count
  from public.emotion_records
  where user_id = p_user_id
    and recorded_at >= now() - interval '30 days';

  -- 검사 응시 횟수 (최근 30일)
  select count(*)::int into v_test_count
  from public.test_results
  where user_id = p_user_id
    and created_at >= now() - interval '30 days';

  -- 최근 활동
  select greatest(
    (select max(created_at) from public.test_results where user_id = p_user_id),
    (select max(recorded_at) from public.emotion_records where user_id = p_user_id)
  ) into v_last_activity;

  -- 신호 결정
  if v_test_count = 0 and v_emotion_count = 0 then
    v_signal := 'unassessed';
  elsif v_risk_count >= 3 or (v_emotion_avg is not null and v_emotion_avg < 2.5) then
    v_signal := 'red';
  elsif v_risk_count between 1 and 2 or (v_emotion_avg is not null and v_emotion_avg < 3.5) then
    v_signal := 'yellow';
  else
    v_signal := 'green';
  end if;

  return query select
    p_user_id, v_risk_count, v_emotion_avg, v_emotion_count,
    v_test_count, v_last_activity, v_signal;
end;
$$;

grant execute on function public.calculate_student_signal(uuid) to authenticated;

comment on function public.calculate_student_signal(uuid) is
  '원생 1명의 신호 계산 (최근 30일 검사 + 감정 기록 기반)';

-- =============================================================
-- 학원 관리자용: 학원 전체 원생 신호 집계
-- =============================================================

create or replace function public.calculate_academy_signals(p_academy_id uuid)
returns table (
  user_id uuid,
  nickname text,
  school text,
  grade text,
  risk_area_count integer,
  emotion_avg numeric,
  last_activity_at timestamptz,
  signal text
)
language plpgsql security definer
set search_path = public
as $$
begin
  -- 호출자 권한 체크: 자기 학원만 조회 가능
  if not exists (
    select 1 from public.academies
    where id = p_academy_id and admin_user_id = auth.uid()
  ) then
    raise exception 'unauthorized: not the admin of this academy';
  end if;

  return query
  select
    p.id as user_id,
    p.nickname,
    p.school,
    p.grade,
    s.risk_area_count,
    s.emotion_avg,
    s.last_activity_at,
    s.signal
  from public.profiles p
  cross join lateral public.calculate_student_signal(p.id) s
  where p.academy_id = p_academy_id
  order by
    case s.signal
      when 'red' then 1
      when 'yellow' then 2
      when 'unassessed' then 3
      when 'green' then 4
    end,
    p.nickname;
end;
$$;

grant execute on function public.calculate_academy_signals(uuid) to authenticated;

comment on function public.calculate_academy_signals(uuid) is
  '학원 원생 전체 신호 집계 (자기 학원만, admin_user_id 체크)';
