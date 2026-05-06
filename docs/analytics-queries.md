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