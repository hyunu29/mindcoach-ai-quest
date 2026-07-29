# Wave 2: 크레딧 팩 + 업셀 모달 + 구독 해지 디자인

**날짜**: 2026-07-29
**작업 브랜치**: `vercel-migration`
**스코프**: 수익화 루프 완성 — 크레딧 추가 구매(목업), 소진 시 업셀, 구독 해지

## 확정 결정

| # | 결정 |
|---|---|
| 1 | 크레딧 팩 2종: 10개 ₩2,900 (₩290/개), 30개 ₩6,900 (₩230/개). Pro(₩198/개)가 항상 최저 → 구독 유인 유지 |
| 2 | 업셀 모달: Pro 메인 + 팩 2종 보조 |
| 3 | 구독 해지: `cancel_at_period_end` 플래그, 기간 만료까지 혜택 유지 (위약금 없음 원칙) |

## 핵심 아키텍처 변경

### 다중 크레딧 period 지원

크레딧 팩 구매 시 기존 free/pro period와 병렬 period 발생. 기존 로직은 최신 period 1개만 참조 → **합산/순차 차감으로 변경**:

- `get_remaining_credits`: `max()` → `sum()` (유효 period 전체 합산)
- `consume_ai_credit_server`: 만료 빠른 period부터 순차 차감 (여러 row 걸쳐 차감 가능)
- 클라이언트 `fetchCurrentCredits`: 유효 period 전체 합산 조회

### payments 제약 확장

```sql
alter table payments drop constraint payments_product_type_check;
alter table payments add constraint payments_product_type_check
  check (product_type in ('single_test','pro_subscription','credit_pack'));
```

### 구독 해지

```sql
alter table user_subscriptions add column cancel_at_period_end boolean not null default false;
create policy "users update own subscription cancel flag" on user_subscriptions
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

## fulfillment (verify-payment)

`credit_pack` 결제 완료 시:
```
user_credits insert:
  period 30일, credits_granted = 10 or 30 (productId 기준), source 'credit_pack'
```

## UI

### CreditUpsellModal
- 트리거: CoachingPage 402 (INSUFFICIENT_CREDITS)
- 상단: Pro 멤버십 카드 (₩9,900/월 · 50크레딧 · "크레딧당 ₩198 최저가") + [Pro 구독하기]
- 하단: "또는 크레딧만 충전" + [10개 ₩2,900] [30개 ₩6,900]
- 각 버튼 → `purchase()` 목업 흐름

### ProfilePage 구독 관리 카드
- 구독 중: 플랜명 + D-N + 다음 갱신일 + [해지하기]
- 해지 예약: "8월 28일까지 이용 가능" + [해지 취소]
- 미구독: /tests 멤버십 카드로 이동 링크

## 파일 변경

| 파일 | 변경 |
|---|---|
| `supabase/migrations/*_credit_pack_and_cancel.sql` | CHECK 확장, cancel 컬럼+RLS, 잔량 sum/순차 차감 |
| `supabase/functions/_shared/pricing.ts` | credit-pack-10/30 |
| `supabase/functions/verify-payment/index.ts` | credit_pack fulfillment |
| `src/lib/payments/catalog-display.ts` | CREDIT_PACK_DISPLAY |
| `src/lib/credits.ts` | fetchCurrentCredits 합산 |
| `src/components/coaching/CreditUpsellModal.tsx` | 신규 |
| `src/pages/CoachingPage.tsx` | 402 → 모달 |
| `src/pages/ProfilePage.tsx` | 구독 관리 카드 |
| `src/hooks/useMySubscription.ts` | cancelAtPeriodEnd 토글 |

## 스코프 밖
- 실 PG, 자동 갱신 실행, 환불
