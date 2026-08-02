# 프로덕션 DB 스키마 스냅샷

> **⚠️ 이 문서가 스키마의 단일 진실 소스입니다.**
> `supabase/migrations/` 파일들은 Lovable 시절 중복/재정의(같은 테이블 CREATE 2~3회, UUID↔text id 변경 등)가 있어
> **마이그레이션 파일만 읽고 스키마를 추정하면 안 됩니다.** (실제 사고: `test_results.scores`라는
> 존재하지 않는 컬럼을 참조한 RPC가 프로덕션 500을 유발 — 2026-08-02 수정)
>
> 새 함수/쿼리 작성 전 이 문서 또는 라이브 `information_schema`를 확인하세요.
>
> **스냅샷 기준일**: 2026-08-02 · 프로젝트: `bpkzljeplyqvbmwwomom` (MYCH)
> 스키마 변경 마이그레이션 apply 시 이 문서도 함께 갱신하세요.

## tests
```
id                text NOT NULL (PK)  -- 예: 'INT', 'A-1', 'STAFF-1'
name              text NOT NULL
category          text NOT NULL       -- A~E, STAFF
related_syndrome  text NOT NULL
description       text NOT NULL
question_count    integer NOT NULL
duration_minutes  integer NOT NULL
is_recommended    boolean NOT NULL
is_coming_soon    boolean NOT NULL
subdomains        jsonb NOT NULL      -- string[]
questions         jsonb NOT NULL      -- {id,text,subdomain,subdomainEn,isReversed}[]
created_at        timestamptz NOT NULL
is_integrated     boolean NOT NULL    -- INT 게이트웨이 검사
is_free           boolean NOT NULL
price_krw         integer NOT NULL
likert_min        integer NOT NULL    -- 기본 1
likert_max        integer NOT NULL    -- 기본 5 (STAFF-1은 0~3)
likert_labels     jsonb               -- string[] | null(기본 라벨)
is_staff_only     boolean NOT NULL    -- 학원 관리자 전용
```

## test_results
```
id                uuid NOT NULL (PK)
user_id           uuid NOT NULL
test_id           text NOT NULL
answers           jsonb NOT NULL
subdomain_scores  jsonb NOT NULL      -- ⚠️ 'scores' 아님! {한글도메인명: 점수}
total_score       integer NOT NULL
risk_level        text NOT NULL       -- 'safe'|'caution'|'warning'|'danger'
risk_label        text NOT NULL
matched_syndrome  text
created_at        timestamptz NOT NULL
recommendations   jsonb
```
**INT 위험 판정**: subdomain 점수 25점 만점 중 **15점 이상 = 위험** (높을수록 위험, `DOMAIN_RECOMMEND_THRESHOLD`).

## profiles
```
id                       uuid NOT NULL (PK, = auth.users.id)
nickname                 text
school_type              text
grade                    text
created_at               timestamptz NOT NULL
updated_at               timestamptz NOT NULL
user_type                text NOT NULL   -- 'student'|'academy_admin'|'super_admin'
school                   text            -- ⚠️ 'school_name' 아님!
onboarded_at             timestamptz
recommended_breed        text
selected_breed           text
character_chosen_at      timestamptz
character_changed_count  integer NOT NULL
academy_id               uuid            -- FK academies (원생당 학원 1개)
academy_joined_at        timestamptz
```

## academies
```
id             uuid NOT NULL (PK)
name           text NOT NULL
code           text NOT NULL (UNIQUE)  -- 예: 'TEST-0001'
admin_user_id  uuid
created_at     timestamptz NOT NULL
created_by     uuid
```

## academy_test_vouchers
```
id                uuid NOT NULL (PK)
user_id           uuid NOT NULL
academy_id        uuid
source            text NOT NULL     -- 'welcome'|'weekly'
granted_at        timestamptz NOT NULL
used_at           timestamptz       -- null = 사용 가능
used_for_test_id  text
expires_at        timestamptz NOT NULL
```

## user_credits
```
id               uuid NOT NULL (PK)
user_id          uuid NOT NULL
period_start     timestamptz NOT NULL
period_end       timestamptz NOT NULL
credits_granted  integer NOT NULL
credits_used     numeric NOT NULL   -- 소수점 (토큰 비례 차감)
source           text NOT NULL      -- 'free_monthly'|'pro_monthly'|'credit_pack'|'academy_welcome'|'academy_weekly'
created_at       timestamptz NOT NULL
```
**다중 period 공존**: 잔량은 유효 period 전체 sum, 소비는 만료 빠른 period부터 순차 차감.

## user_subscriptions
```
id                    uuid NOT NULL (PK)
user_id               uuid NOT NULL
plan_id               uuid NOT NULL  -- FK subscription_plans
status                text NOT NULL  -- 'active'|'cancelled'|...
current_period_start  timestamptz NOT NULL
current_period_end    timestamptz NOT NULL
cancel_at_period_end  boolean NOT NULL
toss_billing_key      text
created_at            timestamptz NOT NULL
updated_at            timestamptz NOT NULL
```

## subscription_plans
```
id                  uuid NOT NULL (PK)
code                text NOT NULL   -- 'free'(10크레딧) | 'pro_monthly'(50크레딧, ₩9,900)
name                text NOT NULL
price_krw           integer NOT NULL
ai_credits_monthly  integer NOT NULL
weekly_free_tests   integer NOT NULL
features            jsonb NOT NULL
is_active           boolean NOT NULL
created_at          timestamptz NOT NULL
```

## payments
```
id                    uuid NOT NULL (PK)
user_id               uuid NOT NULL
provider              text NOT NULL
provider_payment_key  text
order_id              text NOT NULL (UNIQUE)
amount                integer NOT NULL
currency              text NOT NULL
status                text NOT NULL  -- 'pending'|'completed'|'failed'|'cancelled'|'refunded'
product_type          text NOT NULL  -- 'single_test'|'pro_subscription'|'credit_pack'
product_id            text NOT NULL
metadata              jsonb NOT NULL
created_at            timestamptz NOT NULL
paid_at / failed_at / refunded_at  timestamptz
```

## user_test_access
```
id          uuid NOT NULL (PK)
user_id     uuid NOT NULL
test_id     text NOT NULL     -- 재구매 가능 (unique 없음)
payment_id  uuid
granted_at  timestamptz NOT NULL
expires_at  timestamptz NOT NULL
```

## emotion_records
```
id                      uuid NOT NULL (PK)
user_id                 uuid NOT NULL
primary_emotion         text NOT NULL
secondary_emotions      text[]
emotion_score           integer NOT NULL  -- 1~5
situation               text
body_reaction           text[]
ai_comment              text
conversation_log        jsonb
recorded_at             timestamptz NOT NULL
created_at              timestamptz NOT NULL
source                  text NOT NULL
source_conversation_id  uuid
```

## emotions (레거시 간단 기록)
```
id / user_id / emoji / score(int) / memo / created_at
```

## coaching_sessions
```
id                      uuid NOT NULL (PK)
user_id                 uuid NOT NULL
related_syndrome        text
related_test_result_id  uuid
messages                jsonb NOT NULL
created_at / updated_at timestamptz NOT NULL
```

---

## 주요 RPC 함수 (SECURITY DEFINER)

| 함수 | 용도 | 권한 |
|---|---|---|
| `calculate_student_signal(uuid)` | 원생 1명 신호(그린/옐로/레드/미평가) | authenticated |
| `calculate_academy_signals(uuid)` | 학원 원생 전체 신호 (관리자 권한 체크 내장) | authenticated |
| `get_academy_by_code(text)` | 학원 코드 → id/name (원생 연결용) | authenticated |
| `provision_academy(text,uuid,text)` | 학원 생성 + 관리자 승격 | SQL Editor 전용 |
| `grant_academy_welcome_pack(uuid,uuid)` | 학원 연결 환영 팩 (이용권3+크레딧20) | authenticated |
| `redeem_academy_voucher(uuid,text)` | 이용권 소진 → user_test_access 발급 | authenticated |
| `grant_weekly_academy_benefits()` | 주간 학원 grant (이용권1+크레딧5) | service_role |
| `grant_weekly_pro_benefits()` | 주간 Pro grant | service_role |
| `grant_monthly_free_credits()` | 무료 플랜 월간 크레딧 재발급 | service_role |
| `consume_ai_credit(numeric)` | 클라이언트 크레딧 소비 (auth.uid 기반) | authenticated |
| `consume_ai_credit_server(uuid,numeric)` | 서버 사후 차감 (다중 period 순차) | service_role |
| `get_remaining_credits(uuid)` | 유효 period 잔량 합산 | service_role |
| `my_academy_id()` / `my_admin_academy_ids()` / `my_admin_student_ids()` | RLS 재귀 우회 헬퍼 | authenticated |

## 알려진 함정 (반복 사고 방지)

1. **`test_results.scores`는 없다** → `subdomain_scores` 사용
2. **`profiles.school_name`은 없다** → `school` 사용
3. **INT 위험 = 점수 높음 (≥15)** — 낮은 점수가 위험이 아님
4. **profiles ↔ academies RLS 상호 참조 금지** — 반드시 `my_*` SECURITY DEFINER 헬퍼 사용 (무한 재귀 사고 이력)
5. **무료 검사 목록 이원화** — DB `is_free` + 클라이언트 `FREE_TEST_SLUGS` 하드코딩. 새 무료 검사 추가 시 둘 다 갱신 (단일화 리팩터 백로그)
