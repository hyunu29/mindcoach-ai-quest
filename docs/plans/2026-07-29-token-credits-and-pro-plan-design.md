# 토큰 기반 크레딧 + Pro 플랜 목업 결제 디자인

**날짜**: 2026-07-29
**작업 브랜치**: `vercel-migration`
**스코프**: 크레딧 소모를 대화 1턴=1개 고정에서 토큰 사용량 비례(Lovable식)로 전환 + Pro 플랜 목업 결제 활성화

## 배경

- 기존: 클라이언트가 메시지 전송 직전 `consume_ai_credit(1)` 호출 → 1턴 = 1크레딧 고정. edge function은 크레딧 무검증 (클라이언트 신뢰 — 보안 취약점).
- 무료 크레딧 월간 재발급 로직 부재 → 2026-07-29 `grant_monthly_free_credits()` 신설로 해결됨.
- Pro 플랜은 "곧 출시" toast만 있고 결제 흐름 없음. `PRODUCT_CATALOG`(서버)와 `verify-payment` fulfillment에 pro 미지원.

## 확정 결정

| # | 결정 |
|---|---|
| 1 | 크레딧 단위: 토큰 기반 (A안) |
| 2 | 가중 공식: `weighted = input_tokens + output_tokens × 8` (Gemini 2.5 Flash 단가 비율) |
| 3 | 환산율: **1 크레딧 = 5,000 가중 토큰** (평균 1턴 ≈ 1.0 크레딧) |
| 4 | 지급량: 무료 월 10 크레딧 유지, Pro 월 50 크레딧 유지 |
| 5 | 차감 시점: 서버(chat-coaching edge function) 사후 실측 차감 |
| 6 | Pro 결제: 기존 MockCheckoutPage 목업 흐름 재사용 |

## Part 1. 토큰 기반 크레딧

### 스키마

```sql
alter table public.user_credits alter column credits_used type numeric(8,2);
-- consume_ai_credit(p_cost numeric) 시그니처 변경 (기존 int)
```

### chat-coaching edge function 리팩터

```
1. Authorization 헤더의 JWT로 user 확인 (supabase.auth.getUser)
2. 시작 전 잔량 체크: remaining <= 0 → 402 {error: 'INSUFFICIENT_CREDITS'}
3. Gemini 호출 시 stream_options: {include_usage: true}
4. TransformStream으로 스트림을 클라이언트에 그대로 통과시키며
   마지막 chunk의 usage(prompt_tokens, completion_tokens) 파싱
5. 스트림 완료(flush) 시:
   weighted = prompt_tokens + completion_tokens * 8
   cost = round(weighted / 5000, 2)  -- 최소 0.1
   consume_ai_credit(p_cost := cost)  (service_role로 실행)
```

### 클라이언트 (CoachingPage + credits.ts)

- 메시지 전송 전 `consumeAiCredit(1)` 선차감 **제거**
- 전송 전 잔량 체크는 UI 편의용으로만 유지 (0이면 버튼 비활성)
- 402 응답 처리: "크레딧이 모두 소진됐어요" 안내
- 응답 완료 후 `fetchCurrentCredits` 재조회로 잔량 갱신
- 크레딧 표시: `AI 크레딧 7.2 / 10 (대화 약 7회)` — 소수 1자리, 환산 안내

## Part 2. Pro 플랜 목업 결제

### 서버

1. `supabase/functions/_shared/pricing.ts`: PRODUCT_CATALOG에 추가
   ```ts
   { productType: 'pro_subscription', productId: 'pro-monthly', amount: 9900, name: 'Pro 멤버십 (월)' }
   ```
2. `supabase/functions/verify-payment/index.ts`: `pro_subscription` fulfillment
   - `user_subscriptions` upsert: plan_id = (select id from subscription_plans where code='pro_monthly'), status 'active', period 30일
   - 첫 달 50 크레딧 즉시 grant (`user_credits` insert, source 'pro_monthly')

### 클라이언트

3. TestsPage 멤버십 카드: toast 제거 → `purchase({ productType: 'pro_subscription', productId: 'pro-monthly', productName: 'Pro 멤버십' })`
4. 구독 상태 표시: `user_subscriptions`에서 active 구독 조회 훅(`useMySubscription`) → 구독 중이면 카드에 `구독 중 · D-N` 뱃지 + 결제 버튼 비활성

## 파일 변경 개요

| 파일 | 변경 |
|---|---|
| `supabase/migrations/YYYYMMDD_credits_numeric.sql` | 신규 (numeric 전환 + consume RPC) |
| `supabase/functions/chat-coaching/index.ts` | 리팩터 (인증 + 잔량 체크 + usage 차감) |
| `supabase/functions/_shared/pricing.ts` | pro-monthly 추가 |
| `supabase/functions/verify-payment/index.ts` | pro fulfillment |
| `src/lib/credits.ts` | consume 제거, 표시 유틸 |
| `src/pages/CoachingPage.tsx` | 선차감 제거 + 402 처리 + 소수점 표시 |
| `src/pages/TestsPage.tsx` | Pro 카드 결제 연결 + 구독 뱃지 |
| `src/hooks/useMySubscription.ts` | 신규 |

## 스코프 밖

- 실 PG 연동 (목업 유지)
- 구독 자동 갱신/해지
- 크레딧 추가 구매 (Wave 2)
- 크레딧 소진 시 업셀 모달 (Wave 2)
