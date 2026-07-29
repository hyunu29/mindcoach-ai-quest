# Wave 2: 크레딧 팩 + 업셀 + 구독 해지 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 크레딧 팩 2종 목업 판매(10개 ₩2,900 / 30개 ₩6,900), 크레딧 소진 시 Pro 우선 업셀 모달, `cancel_at_period_end` 기반 구독 해지 UI를 구축한다.

**Architecture:** `payments.product_type`에 `credit_pack` 추가하고 verify-payment fulfillment로 별도 30일 크레딧 period를 insert. 다중 period 공존을 위해 잔량 조회는 sum, 소비는 만료 빠른 period부터 순차 차감으로 변경 (DB RPC + 클라이언트 fetch 동시 수정). 해지는 `user_subscriptions.cancel_at_period_end` 플래그 토글(본인 update RLS)로 처리하고 표시만 담당 (자동 갱신 로직 없음 — 목업 단계).

**Tech Stack:** Supabase (Postgres RLS + Edge Functions), React 18 + TS, shadcn/ui Dialog.

**Branch:** `vercel-migration`

**참고 디자인 문서:** `docs/plans/2026-07-29-credit-pack-upsell-cancel-design.md`

---

### Task 1: DB — credit_pack 제약 + cancel 컬럼 + 다중 period 잔량/차감

**Files:**
- Create: `supabase/migrations/20260729140000_credit_pack_and_cancel.sql`

**Step 1: 마이그레이션 (프로덕션 MCP apply_migration + 로컬 파일 커밋)**

```sql
-- =============================================================
-- Wave 2: 크레딧 팩 + 구독 해지
-- 1) payments.product_type에 credit_pack 추가
-- 2) user_subscriptions.cancel_at_period_end + 본인 update RLS
-- 3) 다중 크레딧 period 지원: 잔량 sum, 소비 순차 차감
-- =============================================================

-- 1) payments 제약 확장
alter table public.payments drop constraint if exists payments_product_type_check;
alter table public.payments add constraint payments_product_type_check
  check (product_type in ('single_test','pro_subscription','credit_pack'));

-- 2) 구독 해지 플래그
alter table public.user_subscriptions
  add column if not exists cancel_at_period_end boolean not null default false;

drop policy if exists "users update own subscription cancel flag" on public.user_subscriptions;
create policy "users update own subscription cancel flag"
  on public.user_subscriptions for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3-1) 잔량 합산 (기존 max → sum)
create or replace function public.get_remaining_credits(p_user_id uuid)
returns numeric
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(sum(credits_granted - credits_used), 0)
  from public.user_credits
  where user_id = p_user_id and period_end > now();
$$;

-- 3-2) 순차 차감 (만료 빠른 period부터, 여러 row 걸쳐 차감)
create or replace function public.consume_ai_credit_server(p_user_id uuid, p_cost numeric)
returns table (success boolean, credit_id uuid, remaining numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_left numeric := p_cost;
  v_take numeric;
  v_first_id uuid := null;
begin
  for v_row in
    select id, credits_granted, credits_used
    from public.user_credits
    where user_id = p_user_id and period_end > now()
      and credits_granted > credits_used
    order by period_end asc
    for update
  loop
    exit when v_left <= 0;
    v_take := least(v_left, v_row.credits_granted - v_row.credits_used);
    update public.user_credits
       set credits_used = credits_used + v_take
     where id = v_row.id;
    v_left := v_left - v_take;
    if v_first_id is null then v_first_id := v_row.id; end if;
  end loop;

  -- 잔량 부족으로 다 못 깎아도 마지막 period에 초과분 기록 (사후 정산 원칙)
  if v_left > 0 then
    if v_first_id is null then
      -- 유효 period가 아예 없음
      select id into v_first_id
      from public.user_credits
      where user_id = p_user_id and period_end > now()
      order by period_end desc limit 1;
    end if;
    if v_first_id is not null then
      update public.user_credits
         set credits_used = credits_used + v_left
       where id = v_first_id;
    end if;
  end if;

  return query
    select (v_first_id is not null), v_first_id,
      (select coalesce(sum(credits_granted - credits_used), 0)
       from public.user_credits
       where user_id = p_user_id and period_end > now());
end;
$$;
```

**Step 2: 프로덕션 apply (MCP, name: `credit_pack_and_cancel`) + 커밋**

```bash
git add supabase/migrations/20260729140000_credit_pack_and_cancel.sql
git commit -m "sql(wave2): credit_pack 제약 + cancel 플래그 + 다중 period 잔량/차감"
```

---

### Task 2: 서버 — 카탈로그 + credit_pack fulfillment

**Files:**
- Modify: `supabase/functions/_shared/pricing.ts`
- Modify: `supabase/functions/verify-payment/index.ts`

**Step 1: pricing.ts**

`ProductType`에 `'credit_pack'` 추가:
```ts
export type ProductType = 'single_test' | 'pro_subscription' | 'credit_pack';
```

PRODUCT_CATALOG 배열에 추가 (pro-monthly 엔트리 뒤):
```ts
  {
    productType: 'credit_pack' as const,
    productId: 'credit-pack-10',
    amount: 2900,
    name: 'AI 크레딧 10개',
  },
  {
    productType: 'credit_pack' as const,
    productId: 'credit-pack-30',
    amount: 6900,
    name: 'AI 크레딧 30개',
  },
```

**Step 2: verify-payment fulfillment (pro_subscription 블록 뒤에 추가)**

```ts
    // 3-8. 크레딧 팩 지급
    if (updated.product_type === "credit_pack") {
      const packCredits = updated.product_id === "credit-pack-30" ? 30 : 10;
      const periodStart = new Date();
      const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const { error: packErr } = await admin.from("user_credits").insert({
        user_id: updated.user_id,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        credits_granted: packCredits,
        source: "credit_pack",
      });
      if (packErr) console.error("credit pack insert failed", orderId, packErr);
    }
```

**Step 3: 커밋 (edge function 배포는 Task 6)**

```bash
git add supabase/functions/_shared/pricing.ts supabase/functions/verify-payment/index.ts
git commit -m "feat(payments): credit_pack 카탈로그 + fulfillment (30일 period 지급)"
```

---

### Task 3: 클라이언트 — 표시 카탈로그 + 잔량 합산 fetch

**Files:**
- Modify: `src/lib/payments/catalog-display.ts`
- Modify: `src/lib/credits.ts`

**Step 1: catalog-display.ts에 추가**

`DisplayProduct.productType` 타입에 `'credit_pack'` 추가. 하단에:

```ts
export const CREDIT_PACK_DISPLAY: DisplayProduct[] = [
  { productType: 'credit_pack', productId: 'credit-pack-10', name: 'AI 크레딧 10개', description: 'AI 코칭 대화 약 10회', amount: 2900, currency: 'KRW' },
  { productType: 'credit_pack', productId: 'credit-pack-30', name: 'AI 크레딧 30개', description: 'AI 코칭 대화 약 30회', amount: 6900, currency: 'KRW' },
];
```

**Step 2: credits.ts — fetchCurrentCredits를 합산으로 변경**

```ts
export async function fetchCurrentCredits(userId: string): Promise<CreditState | null> {
  const { data, error } = await supabase
    .from("user_credits")
    .select("id, credits_granted, credits_used, period_end")
    .eq("user_id", userId)
    .gt("period_end", new Date().toISOString());

  if (error) {
    console.error("fetchCurrentCredits error:", error);
    return { creditId: null, remaining: 0, granted: 0 };
  }
  if (!data || data.length === 0) return { creditId: null, remaining: 0, granted: 0 };

  let granted = 0;
  let used = 0;
  for (const row of data) {
    granted += Number(row.credits_granted ?? 0);
    used += Number(row.credits_used ?? 0);
  }
  return {
    creditId: data[0].id,
    granted,
    remaining: Math.max(0, granted - used),
  };
}
```

**Step 3: 타입체크 + 커밋**

```bash
npx tsc --noEmit
git add src/lib/payments/catalog-display.ts src/lib/credits.ts
git commit -m "feat(credits): 크레딧 팩 표시 카탈로그 + 다중 period 합산 조회"
```

---

### Task 4: CreditUpsellModal + CoachingPage 연결

**Files:**
- Create: `src/components/coaching/CreditUpsellModal.tsx`
- Modify: `src/pages/CoachingPage.tsx`

**Step 1: CreditUpsellModal**

```tsx
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Zap } from 'lucide-react';
import { usePurchase } from '@/hooks/usePurchase';
import { CREDIT_PACK_DISPLAY } from '@/lib/payments/catalog-display';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreditUpsellModal({ open, onOpenChange }: Props) {
  const { purchase, isLoading } = usePurchase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>크레딧이 모두 소진됐어요</DialogTitle>
          <DialogDescription>
            AI 코칭을 계속하려면 크레딧을 충전하거나 Pro를 구독하세요.
          </DialogDescription>
        </DialogHeader>

        {/* Pro 메인 */}
        <Card className="p-4 rounded-2xl border-2 border-primary/40 bg-primary/5">
          <div className="flex items-center gap-2 mb-1.5">
            <Crown className="w-4 h-4 text-primary" />
            <span className="font-bold">Pro 멤버십</span>
            <Badge className="gradient-primary text-primary-foreground border-0 text-[10px]">추천</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            월 50 크레딧 · ₩9,900 <span className="text-primary font-medium">(크레딧당 ₩198 최저가)</span>
          </p>
          <Button
            className="w-full mt-3"
            disabled={isLoading('pro-monthly')}
            onClick={() => purchase({ productType: 'pro_subscription', productId: 'pro-monthly', productName: 'Pro 멤버십' })}
          >
            Pro 구독하기
          </Button>
        </Card>

        {/* 팩 보조 */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground text-center">또는 크레딧만 충전</p>
          <div className="grid grid-cols-2 gap-2">
            {CREDIT_PACK_DISPLAY.map((p) => (
              <Button
                key={p.productId}
                variant="outline"
                className="h-auto py-3 flex-col gap-0.5"
                disabled={isLoading(p.productId)}
                onClick={() => purchase({ productType: p.productType, productId: p.productId, productName: p.name })}
              >
                <span className="flex items-center gap-1 font-semibold text-sm">
                  <Zap className="w-3.5 h-3.5" /> {p.name.replace('AI ', '')}
                </span>
                <span className="text-xs text-muted-foreground">₩{p.amount.toLocaleString()}</span>
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: CoachingPage 연결**

- 기존 T3에서 넣은 임시 upgrade modal(있다면)을 CreditUpsellModal로 교체.
- State: `const [upsellOpen, setUpsellOpen] = useState(false);`
- INSUFFICIENT_CREDITS 감지 지점(onError 콜백들)에서 `setUpsellOpen(true)` (기존 toast 유지 or 모달만).
- `credits.remaining <= 0` 사전 가드에서도 `setUpsellOpen(true)`.
- JSX 하단에 `<CreditUpsellModal open={upsellOpen} onOpenChange={setUpsellOpen} />`.

**Step 3: 타입체크 + build + 커밋**

```bash
npx tsc --noEmit && npm run build
git add src/components/coaching/CreditUpsellModal.tsx src/pages/CoachingPage.tsx
git commit -m "feat(coaching): 크레딧 소진 업셀 모달 (Pro 우선 + 팩 2종)"
```

---

### Task 5: 구독 관리 — 훅 확장 + ProfilePage 카드

**Files:**
- Modify: `src/hooks/useMySubscription.ts`
- Modify: `src/pages/ProfilePage.tsx`

**Step 1: useMySubscription 확장**

- select에 `cancel_at_period_end` 추가, 인터페이스에 `cancelAtPeriodEnd: boolean` 추가
- 토글 함수:

```ts
const setCancelAtPeriodEnd = useCallback(async (cancel: boolean): Promise<boolean> => {
  if (!subscription) return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('user_subscriptions') as any)
    .update({ cancel_at_period_end: cancel })
    .eq('id', subscription.id);
  if (!error) {
    setSubscription({ ...subscription, cancelAtPeriodEnd: cancel });
    return true;
  }
  return false;
}, [subscription]);
```

리턴에 `setCancelAtPeriodEnd` 추가.

**Step 2: ProfilePage 구독 관리 카드**

학원 연결 카드 아래에 추가:

```tsx
{/* 구독 관리 */}
<Card className="p-5 rounded-2xl border-border/50 shadow-sm space-y-3">
  <h2 className="font-bold">구독 관리</h2>
  {subscription ? (
    <>
      <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
        <div>
          <div className="text-sm font-medium flex items-center gap-1.5">
            <Crown className="w-4 h-4 text-primary" /> Pro 멤버십
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {subscription.cancelAtPeriodEnd
              ? `해지 예정 · ${new Date(subscription.current_period_end).toLocaleDateString('ko-KR')}까지 이용 가능`
              : `D-${subscription.daysRemaining} · 다음 갱신 ${new Date(subscription.current_period_end).toLocaleDateString('ko-KR')}`}
          </div>
        </div>
        {subscription.cancelAtPeriodEnd ? (
          <Button variant="outline" size="sm" onClick={async () => {
            const ok = await setCancelAtPeriodEnd(false);
            toast[ok ? 'success' : 'error'](ok ? '해지를 취소했어요' : '처리에 실패했어요');
          }}>해지 취소</Button>
        ) : (
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={async () => {
            const ok = await setCancelAtPeriodEnd(true);
            toast[ok ? 'success' : 'error'](ok ? '기간 종료 시 해지돼요' : '처리에 실패했어요');
          }}>해지하기</Button>
        )}
      </div>
    </>
  ) : (
    <button
      className="text-sm text-primary font-medium hover:underline"
      onClick={() => navigate('/tests')}
    >
      Pro 멤버십 구독하기 →
    </button>
  )}
</Card>
```

필요 import: `useMySubscription`, `Crown` (lucide). `navigate`는 기존 존재.

**Step 3: 타입체크 + build + 커밋**

```bash
npx tsc --noEmit && npm run build
git add src/hooks/useMySubscription.ts src/pages/ProfilePage.tsx
git commit -m "feat(pro): 프로필 구독 관리 카드 (해지/해지 취소)"
```

---

### Task 6: 배포 + 검증

**Step 1: edge functions 배포**

```bash
supabase functions deploy verify-payment
```

**Step 2: git push + Vercel**

```bash
git push origin vercel-migration
vercel deploy --prod --yes
```

**Step 3: 라이브 검증**

- 크레딧 0 계정에서 `/coaching` 대화 시도 → CreditUpsellModal (Pro 메인 + 팩 2종)
- 팩 10개 구매 (목업) → `/coaching` 크레딧 +10 확인 (`user_credits`에 source credit_pack row)
- 다중 period 합산: free 잔량 + 팩 잔량 합산 표시 확인
- 대화 1턴 → 만료 빠른 period부터 차감되는지 (DB 확인)
- `/profile` 구독 관리: 구독 중 계정에서 [해지하기] → "해지 예정" 표시 → [해지 취소] 복원

## 스코프 밖
- 실 PG, 자동 갱신 실행, 환불
