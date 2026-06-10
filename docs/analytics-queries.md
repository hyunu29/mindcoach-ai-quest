# 마인드코치 분석 SQL 북마크

Supabase Studio SQL Editor에서 그대로 실행해 funnel 분석에 사용하세요.

## 일별 가입자 수 (지난 30일)
```sql
select date_trunc('day', created_at)::date as day, count(*) as signups
from auth.users
where created_at >= now() - interval '30 days'
group by 1 order by 1;
```

## 무료 검사별 응시 수 (지난 30일)
```sql
select event_props->>'test_id' as test_id, count(*) as starts
from public.analytics_events
where event_name = 'test_started'
  and (event_props->>'is_free')::bool = true
  and created_at >= now() - interval '30 days'
group by 1 order by 2 desc;
```

## 무료 검사 → paywall 도달률
```sql
with free_users as (
  select distinct user_id from public.analytics_events
  where event_name = 'test_completed' and (event_props->>'is_free')::bool = true
    and user_id is not null and created_at >= now() - interval '30 days'
)
select count(distinct fu.user_id) as free_completers,
       count(distinct case when pe.user_id is not null then fu.user_id end) as reached_paywall
from free_users fu
left join public.analytics_events pe
  on pe.user_id = fu.user_id and pe.event_name = 'paywall_viewed';
```

## 결제 funnel (paywall → 클릭 → 완료)
```sql
select
  count(*) filter (where event_name = 'paywall_viewed') as paywall_views,
  count(*) filter (where event_name = 'purchase_clicked') as purchase_clicks,
  count(*) filter (where event_name = 'payment_completed') as payments
from public.analytics_events
where created_at >= now() - interval '30 days';
```

## 추천 카드 → 결제 전환
```sql
select event_props->>'recommended_test_id' as test_id,
       count(*) as recommendations_clicked
from public.analytics_events
where event_name = 'recommendation_clicked'
  and created_at >= now() - interval '30 days'
group by 1 order by 2 desc;
```

## 캐릭터 funnel (추천 → 선택 → 변경 → 홈 노출)
```sql
select
  count(*) filter (where event_name = 'character_recommended') as recommended,
  count(*) filter (where event_name = 'character_selected') as selected,
  count(*) filter (where event_name = 'character_changed') as changed,
  count(*) filter (where event_name = 'character_viewed_home') as viewed_home
from public.analytics_events
where created_at >= now() - interval '30 days';
```

## 마스코트 선택 source 분포 (추천 vs 자유선택)
```sql
select event_props->>'source' as source,
       count(*) as picks
from public.analytics_events
where event_name = 'character_selected'
  and created_at >= now() - interval '30 days'
group by 1 order by 2 desc;
```

## breed별 추천 vs 실제 선택률
```sql
with recs as (
  select event_props->>'top_breed' as breed, count(*) as recommended
  from public.analytics_events
  where event_name = 'character_recommended'
    and created_at >= now() - interval '30 days'
  group by 1
),
picks as (
  select event_props->>'breed' as breed, count(*) as selected
  from public.analytics_events
  where event_name = 'character_selected'
    and event_props->>'source' = 'recommended'
    and created_at >= now() - interval '30 days'
  group by 1
)
select coalesce(r.breed, p.breed) as breed,
       coalesce(r.recommended, 0) as recommended,
       coalesce(p.selected, 0) as selected_from_recommendation,
       round(coalesce(p.selected, 0)::numeric / nullif(r.recommended, 0) * 100, 2) as accept_rate_pct
from recs r full outer join picks p on r.breed = p.breed
order by recommended desc nulls last;
```

## 캐릭터 변경 빈도 (change_count 분포)
```sql
select (event_props->>'change_count')::int as change_count,
       count(distinct user_id) as users
from public.analytics_events
where event_name = 'character_changed'
  and created_at >= now() - interval '30 days'
  and user_id is not null
group by 1 order by 1;
```

## 트렌드별 홈 노출 분포 (감정 트렌드 점유율)
```sql
select event_props->>'trend' as trend,
       count(*) as views
from public.analytics_events
where event_name = 'character_viewed_home'
  and created_at >= now() - interval '30 days'
group by 1 order by 2 desc;
```

## 세션 → 가입 전환율
```sql
with sessions as (
  select session_id, min(created_at) as first_seen
  from public.analytics_events
  where created_at >= now() - interval '30 days'
  group by 1
),
signups as (
  select session_id from public.analytics_events
  where event_name = 'signup_completed'
)
select count(distinct s.session_id) as total_sessions,
       count(distinct su.session_id) as signup_sessions,
       round(count(distinct su.session_id)::numeric / nullif(count(distinct s.session_id), 0) * 100, 2) as signup_rate_pct
from sessions s
left join signups su using (session_id);
```