-- =============================================================
-- 신호 계산 fix (프로덕션 apply 완료: fix_signal_calc_schema_and_direction_v2)
-- 1) test_results.scores → subdomain_scores (실제 컬럼명. 이전 RPC는 존재하지 않는
--    컬럼을 참조해 함수 전체가 실패 → 관리자 대시보드 원생 목록이 항상 빈 배열)
-- 2) 위험 방향 정정: INT 채점은 점수 >= 15가 위험 (DOMAIN_RECOMMEND_THRESHOLD,
--    높을수록 위험). 기존 < 12 판정은 방향이 반대였음.
-- 3) 단품 검사 위험 등급: risk_level 실제 값 체계('warning','danger' 등) 반영
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
  v_int_scores jsonb;
  v_domain_threshold constant integer := 15;
begin
  select tr.subdomain_scores into v_int_scores
  from public.test_results tr
  where tr.user_id = p_user_id
    and tr.test_id = 'INT'
    and tr.created_at >= now() - interval '30 days'
  order by tr.created_at desc
  limit 1;

  if v_int_scores is not null then
    select count(*)::int into v_risk_count
    from jsonb_each_text(v_int_scores) e
    where (e.value)::numeric >= v_domain_threshold;
  end if;

  v_risk_count := v_risk_count + coalesce(
    (select count(*)::int
     from public.test_results tr2
     where tr2.user_id = p_user_id
       and tr2.test_id <> 'INT'
       and tr2.risk_level in ('warning', 'danger', 'high')
       and tr2.created_at >= now() - interval '30 days'), 0);

  select avg(er.emotion_score)::numeric(4,2), count(*)::int
    into v_emotion_avg, v_emotion_count
  from public.emotion_records er
  where er.user_id = p_user_id
    and er.recorded_at >= now() - interval '30 days';

  select count(*)::int into v_test_count
  from public.test_results tr3
  where tr3.user_id = p_user_id
    and tr3.created_at >= now() - interval '30 days';

  select greatest(
    (select max(tr4.created_at) from public.test_results tr4 where tr4.user_id = p_user_id),
    (select max(er2.recorded_at) from public.emotion_records er2 where er2.user_id = p_user_id)
  ) into v_last_activity;

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
