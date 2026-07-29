# 토큰 기반 크레딧 + Pro 목업 결제 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** AI 코칭 크레딧을 토큰 사용량 비례(1크레딧=5,000 가중 토큰)로 전환하고, Pro 플랜을 목업 결제로 구매 가능하게 한다.

**Architecture:** 크레딧 차감을 클라이언트 선차감에서 chat-coaching edge function 사후 실측 차감으로 이동 (JWT 인증 + 잔량 선체크 + `include_usage` 스트림 파싱). `credits_used`는 numeric(8,2)로 전환하고 서버 전용 `consume_ai_credit_server(p_user_id, p_cost numeric)` RPC 신설 (기존 RPC는 auth.uid() 기반이라 service_role에서 사용 불가). Pro는 기존 mock 결제 파이프라인(create-payment-order → MockCheckoutPage → verify-payment)에 pro_subscription fulfillment를 추가.

**Tech Stack:** Supabase (Postgres/RLS/Edge Functions Deno), React 18 + TS, Gemini 2.5 Flash (OpenAI-호환 API).

**Branch:** `vercel-migration` (production).

**참고 디자인 문서:** `docs/plans/2026-07-29-token-credits-and-pro-plan-design.md`

---

### Task 1: DB — credits numeric 전환 + 서버용 consume RPC

**Files:**
- Create: `supabase/migrations/20260729130000_credits_numeric_and_server_consume.sql`

**Step 1: 마이그레이션 작성**

```sql
-- =============================================================
-- 크레딧 소수점 전환 + 서버 전용 소비 RPC
-- 1크레딧 = 5,000 가중 토큰 (input + output*8)
-- =============================================================

-- credits_used를 numeric으로 (기존 int 값 그대로 보존됨)
alter table public.user_credits
  alter column credits_used type numeric(8,2) using credits_used::numeric(8,2);

-- 기존 클라이언트용 RPC의 반환도 numeric 호환으로 재정의
drop function if exists public.consume_ai_credit(integer);
create or replace function public.consume_ai_credit(p_cost numeric default 1)
returns table (success boolean, credit_id uuid, remaining numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_credit_id uuid;
  v_granted numeric;
  v_used numeric;
begin
  if v_uid is null then
    return query select false, null::uuid, 0::numeric;
    return;
  end if;

  select id, credits_granted, credits_used
    into v_credit_id, v_granted, v_used
  from public.user_credits
  where user_id = v_uid and period_end > now()
  order by period_end desc limit 1
  for update;

  if v_credit_id is null or (v_granted - v_used) < p_cost then
    return query select false, v_credit_id, coalesce(v_granted - v_used, 0);
    return;
  end if;

  update public.user_credits
     set credits_used = credits_used + p_cost
   where id = v_credit_id;

  return query select true, v_credit_id, (v_granted - v_used - p_cost);
end;
$$;

grant execute on function public.consume_ai_credit(numeric) to authenticated;

-- 서버(service_role) 전용: user_id를 명시적으로 받는 소비 RPC
-- 잔량 부족해도 음수까지 차감 (사후 정산이므로 성공 처리, 다음 턴에서 잔량 체크로 차단)
create or replace function public.consume_ai_credit_server(p_user_id uuid, p_cost numeric)
returns table (success boolean, credit_id uuid, remaining numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credit_id uuid;
  v_granted numeric;
  v_used numeric;
begin
  select id, credits_granted, credits_used
    into v_credit_id, v_granted, v_used
  from public.user_credits
  where user_id = p_user_id and period_end > now()
  order by period_end desc limit 1
  for update;

  if v_credit_id is null then
    return query select false, null::uuid, 0::numeric;
    return;
  end if;

  update public.user_credits
     set credits_used = credits_used + p_cost
   where id = v_credit_id;

  return query select true, v_credit_id, greatest(v_granted - v_used - p_cost, 0);
end;
$$;

grant execute on function public.consume_ai_credit_server(uuid, numeric) to service_role;

-- 서버용 잔량 조회 헬퍼
create or replace function public.get_remaining_credits(p_user_id uuid)
returns numeric
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(max(credits_granted - credits_used), 0)
  from public.user_credits
  where user_id = p_user_id and period_end > now();
$$;

grant execute on function public.get_remaining_credits(uuid) to service_role;
```

**Step 2: 프로덕션 apply (MCP `apply_migration`, name: `credits_numeric_and_server_consume`) + 커밋**

```bash
git add supabase/migrations/20260729130000_credits_numeric_and_server_consume.sql
git commit -m "sql(credits): numeric 전환 + 서버 전용 consume/조회 RPC"
```

---

### Task 2: chat-coaching edge function 리팩터

**Files:**
- Modify: `supabase/functions/chat-coaching/index.ts`

**Step 1: 전체 재작성**

핵심 변경:
1. `Authorization` 헤더로 user 확인 (`supabase.auth.getUser(jwt)`)
2. `get_remaining_credits` 호출 → `remaining <= 0`이면 402
3. Gemini 요청 body에 `stream_options: { include_usage: true }` 추가
4. `TransformStream`으로 SSE 통과시키며 청크 버퍼에서 `"usage"` 포함 라인 파싱
5. flush 시 `weighted = prompt_tokens + completion_tokens * 8`, `cost = Math.max(0.1, Math.round(weighted / 5000 * 100) / 100)` → `consume_ai_credit_server` 호출

구현 코드:

```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// ... corsHeaders, SYSTEM_PROMPT, GEMINI_MODEL 기존 유지 ...

const WEIGHTED_TOKENS_PER_CREDIT = 5000;
const OUTPUT_WEIGHT = 8;
const MIN_COST = 0.1;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. 인증
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return json(401, { error: "UNAUTHORIZED" });
    }
    const userId = userData.user.id;

    // 2. 잔량 체크
    const { data: remainingData } = await admin.rpc("get_remaining_credits", { p_user_id: userId });
    const remaining = typeof remainingData === "number" ? remainingData : Number(remainingData ?? 0);
    if (remaining <= 0) {
      return json(402, { error: "INSUFFICIENT_CREDITS" });
    }

    const { messages, syndrome_context, test_result_summary, emotion_summary } = await req.json();
    // ... contextMessage 조립 기존 유지 ...

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: GEMINI_MODEL,
          messages: [{ role: "system", content: SYSTEM_PROMPT + contextMessage }, ...aiMessages],
          stream: true,
          stream_options: { include_usage: true },
        }),
      },
    );

    // ... 기존 !response.ok 에러 처리 유지 ...

    // 3. 스트림 프록시 + usage 파싱
    let sseBuffer = "";
    let promptTokens = 0;
    let completionTokens = 0;
    const decoder = new TextDecoder();

    const usageTap = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        sseBuffer += decoder.decode(chunk, { stream: true });
        // "data: {...}" 라인 파싱, usage가 있으면 저장
        let idx: number;
        while ((idx = sseBuffer.indexOf("\n")) >= 0) {
          const line = sseBuffer.slice(0, idx).trim();
          sseBuffer = sseBuffer.slice(idx + 1);
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.usage) {
              promptTokens = parsed.usage.prompt_tokens ?? promptTokens;
              completionTokens = parsed.usage.completion_tokens ?? completionTokens;
            }
          } catch { /* partial chunk, skip */ }
        }
      },
      async flush() {
        const weighted = promptTokens + completionTokens * OUTPUT_WEIGHT;
        const cost = Math.max(MIN_COST, Math.round((weighted / WEIGHTED_TOKENS_PER_CREDIT) * 100) / 100);
        const { error } = await admin.rpc("consume_ai_credit_server", {
          p_user_id: userId,
          p_cost: cost,
        });
        if (error) console.error("consume_ai_credit_server error", error);
        console.log("credit consumed", { userId, promptTokens, completionTokens, cost });
      },
    });

    return new Response(response.body!.pipeThrough(usageTap), {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    // ... 기존 catch 유지 ...
  }
});
```

`json()` 헬퍼는 weekly-grant 패턴 재사용.

**Step 2: 커밋 + edge function 배포 (MCP deploy_edge_function, verify_jwt: false — 함수 내부에서 직접 JWT 검증)**

```bash
git add supabase/functions/chat-coaching/index.ts
git commit -m "feat(chat): 서버 사후 크레딧 차감 (토큰 사용량 비례) + 인증/잔량 검증"
```

주의: 기존 verify_jwt 설정 확인 필요 (supabase functions 기본은 true — Authorization 헤더가 이미 전달되고 있으면 유지 가능). 클라이언트가 `supabase.functions.invoke`로 호출한다면 JWT가 자동으로 전달됨. 확인 후 결정.

---

### Task 3: 클라이언트 — 선차감 제거 + 402 처리 + 소수점 표시

**Files:**
- Modify: `src/lib/credits.ts`
- Modify: `src/pages/CoachingPage.tsx`

**Step 1: credits.ts 정리**

- `consumeAiCredit` 함수 제거 (더 이상 클라이언트에서 소비 안 함)
- `CreditState.remaining`을 소수점 지원으로 그대로 사용 (fetch 시 `Number()` 처리)
- 표시 유틸 추가:

```ts
export function formatCredits(remaining: number): string {
  return remaining % 1 === 0 ? String(remaining) : remaining.toFixed(1);
}

export function estimateConversations(remaining: number): number {
  return Math.floor(remaining); // 1턴 ≈ 1크레딧
}
```

**Step 2: CoachingPage 수정**

- 두 곳의 `consumeAiCredit` 호출 제거 (라인 ~150, ~205 근처). 대신 전송 전 `credits.remaining <= 0`이면 안내만 유지.
- 스트림 fetch 응답이 402면: `toast.error('크레딧이 모두 소진됐어요. 다음 충전을 기다리거나 Pro를 구독해 보세요.')`
- 응답 스트림 종료 후 `fetchCurrentCredits(user.id)` 재조회로 잔량 갱신.
- 헤더 표시: `AI 크레딧 {formatCredits(credits.remaining)} / {credits.granted}` + 툴팁 or 서브텍스트 `대화 약 {estimateConversations(credits.remaining)}회`
- `credit_id` 전달 로직(사용 이력 저장용)이 있으면 제거 or null 유지 — 코드 확인 후 정리.

**Step 3: 타입체크 + build + 커밋**

```bash
npx tsc --noEmit && npm run build
git add src/lib/credits.ts src/pages/CoachingPage.tsx
git commit -m "feat(chat): 클라이언트 선차감 제거 + 402 처리 + 크레딧 소수점 표시"
```

---

### Task 4: Pro 결제 — 서버 카탈로그 + fulfillment

**Files:**
- Modify: `supabase/functions/_shared/pricing.ts`
- Modify: `supabase/functions/verify-payment/index.ts`

**Step 1: pricing.ts에 pro 엔트리 추가**

```ts
export const PRODUCT_CATALOG: ProductCatalogEntry[] = [
  ...TEST_IDS.map((t) => ({
    productType: 'single_test' as const,
    productId: t.id,
    amount: 2900,
    name: t.name,
  })),
  {
    productType: 'pro_subscription' as const,
    productId: 'pro-monthly',
    amount: 9900,
    name: 'Pro 멤버십 (월)',
  },
];
```

**Step 2: verify-payment에 pro fulfillment 추가**

기존 `if (updated.product_type === "single_test") { ... }` 아래에:

```ts
if (updated.product_type === "pro_subscription") {
  const periodStart = new Date();
  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // 플랜 id 조회
  const { data: plan } = await admin
    .from("subscription_plans")
    .select("id, ai_credits_monthly")
    .eq("code", "pro_monthly")
    .single();

  if (plan) {
    // 기존 active 구독 만료 처리 후 새로 활성화
    await admin.from("user_subscriptions")
      .update({ status: "cancelled" })
      .eq("user_id", updated.user_id)
      .eq("status", "active");

    const { error: subErr } = await admin.from("user_subscriptions").insert({
      user_id: updated.user_id,
      plan_id: plan.id,
      status: "active",
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
    });
    if (subErr) console.error("pro subscription insert failed", orderId, subErr);

    // 첫 달 크레딧 즉시 지급
    const { error: credErr } = await admin.from("user_credits").insert({
      user_id: updated.user_id,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      credits_granted: plan.ai_credits_monthly ?? 50,
      source: "pro_monthly",
    });
    if (credErr) console.error("pro credits insert failed", orderId, credErr);
  }
}
```

**Step 3: 커밋 + 두 edge function 배포** (verify-payment는 `_shared/pricing.ts` 포함해서 deploy 필요 — MCP deploy 시 files에 두 파일 다 포함)

```bash
git add supabase/functions/_shared/pricing.ts supabase/functions/verify-payment/index.ts
git commit -m "feat(payments): pro_subscription 카탈로그 + fulfillment (구독 활성화 + 첫 달 크레딧)"
```

---

### Task 5: 클라이언트 — Pro 카드 결제 연결 + 구독 뱃지

**Files:**
- Create: `src/hooks/useMySubscription.ts`
- Modify: `src/pages/TestsPage.tsx`

**Step 1: useMySubscription 훅**

```ts
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface MySubscription {
  id: string;
  status: string;
  current_period_end: string;
  daysRemaining: number;
}

export function useMySubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<MySubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setSubscription(null); setLoading(false); return; }
    void (async () => {
      const { data } = await (supabase.from('user_subscriptions') as unknown as {
        select: (cols: string) => {
          eq: (c: string, v: string) => {
            eq: (c: string, v: string) => {
              gt: (c: string, v: string) => {
                order: (c: string, o: { ascending: boolean }) => {
                  limit: (n: number) => {
                    maybeSingle: () => Promise<{ data: { id: string; status: string; current_period_end: string } | null }>;
                  };
                };
              };
            };
          };
        };
      })
        .select('id, status, current_period_end')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gt('current_period_end', new Date().toISOString())
        .order('current_period_end', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        const days = Math.ceil((new Date(data.current_period_end).getTime() - Date.now()) / 86400000);
        setSubscription({ ...data, daysRemaining: days });
      }
      setLoading(false);
    })();
  }, [user]);

  return { subscription, loading };
}
```

주의: `user_subscriptions`에 본인 select RLS 정책 있는지 확인. 없으면 Task 1 마이그레이션에 추가:
```sql
-- (이미 있을 가능성 높음 — 확인 후 필요 시)
create policy "users select own subscriptions" on public.user_subscriptions
  for select to authenticated using (auth.uid() = user_id);
```

**Step 2: TestsPage Pro 카드 수정**

- `useMySubscription()` 호출
- toast.info 제거 → 구독 없으면:
  ```tsx
  onClick={() => purchase({ productType: 'pro_subscription', productId: 'pro-monthly', productName: 'Pro 멤버십' })}
  ```
- 구독 중이면: 카드 클릭 무효 + "곧 출시" Badge 대신 `구독 중 · D-{daysRemaining}` primary Badge
- "곧 출시" Badge는 제거

**Step 3: 타입체크 + build + 커밋**

```bash
npx tsc --noEmit && npm run build
git add src/hooks/useMySubscription.ts src/pages/TestsPage.tsx
git commit -m "feat(pro): 멤버십 카드 목업 결제 연결 + 구독 중 뱃지"
```

---

### Task 6: 배포 + 검증

**Step 1: DB 마이그레이션 apply** (MCP `apply_migration` — Task 1에서 이미 했으면 skip)

**Step 2: edge functions 배포** (MCP `deploy_edge_function`)
- chat-coaching (Task 2 코드)
- verify-payment (Task 4 코드 + `_shared/pricing.ts` 포함)

**Step 3: git push + Vercel 배포**

```bash
git push origin vercel-migration
vercel deploy --prod --yes
```

**Step 4: 라이브 검증**

크레딧 (원생 계정):
- `/coaching`에서 대화 1턴 → 잔량이 `10 → 9.2` 같이 소수점으로 감소 확인
- 서버 로그에서 `credit consumed { promptTokens, completionTokens, cost }` 확인 (MCP get_logs, service: edge-function)
- 크레딧 0으로 만든 뒤 대화 시도 → "크레딧이 모두 소진됐어요" 안내

Pro (원생 계정):
- `/tests` 멤버십 카드 클릭 → MockCheckoutPage → 결제 성공 → `/payment/success`
- DB에서 `user_subscriptions` active row + `user_credits` pro_monthly 50 grant 확인
- `/tests` 재접속 → 멤버십 카드에 `구독 중 · D-30` 뱃지

---

## 실패 시 롤백

- 각 태스크 별도 커밋 → `git revert`
- edge function은 이전 버전 재배포
- numeric 전환은 하위 호환 (int 값 보존)

## 스코프 밖

- 실 PG 연동, 자동 갱신/해지, 크레딧 추가 구매, 소진 시 업셀 모달
