# /tests + /pricing 통합 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `/tests`와 `/pricing`을 하나의 `/tests` 페이지로 통합하고 모바일/PC 반응형 UI를 개선한다.

**Architecture:** DB `tests` 테이블을 단일 소스로 삼는다. `SINGLE_TEST_DISPLAY`는 유료 가격 lookup 전용. `/pricing`은 삭제 후 `/tests`로 redirect. 카드 컴포넌트 하나로 무료/유료/구매완료/준비중 상태를 통합 표시. 3-tier 반응형 그리드(1/2/3 col).

**Tech Stack:** React 18, TypeScript, Vite, TanStack Query, Supabase JS, shadcn/ui, Tailwind, lucide-react, react-router-dom.

**Branch:** `vercel-migration` (production 브랜치, 별도 분기 없음).

**참고 디자인 문서:** `docs/plans/2026-07-10-tests-pricing-merge-design.md`

---

## 사전 확인 (계획 시작 전)

- 현재 `vercel-migration` 브랜치, main 대비 앞선 상태
- 배포는 `vercel deploy --prod --yes` (GitHub 자동 배포 끊긴 상태 — memory 참조)
- DB 무료 flag 상태: `INT`는 `is_free=true` 확정, `E-3/A-2/D-1`는 미확인 → **Task 2에서 마이그레이션**

---

### Task 1: `/pricing` 라우팅 정리 + PricingPage 삭제

**목표:** `/pricing` URL은 유지하되 `/tests`로 리다이렉트. `PricingPage.tsx` 파일 삭제, 관련 nav 항목/링크 정리.

**Files:**
- Modify: `src/App.tsx` (import 제거, route redirect)
- Delete: `src/pages/PricingPage.tsx`
- Modify: `src/components/navigation/DesktopSidebar.tsx` (line 1, 8 — Tag import 및 "가격" 항목 제거)
- Modify: `src/components/payment/TestPaywall.tsx:119` (`/pricing` → `/tests`)
- Modify: `src/pages/TestsPage.tsx:77-81` (상단 "가격 보기" 버튼 제거)

**Step 1: App.tsx 수정**

`src/App.tsx` 상단 import에서 `PricingPage` 제거하고 `Navigate` 추가:

```tsx
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
// PricingPage import 삭제
```

라인 48:
```tsx
<Route path="/pricing" element={<Navigate to="/tests" replace />} />
```

**Step 2: PricingPage.tsx 삭제**

```bash
rm src/pages/PricingPage.tsx
```

**Step 3: DesktopSidebar.tsx 수정**

라인 1 `Tag` import 제거, 라인 8 "가격" 항목 제거:

```tsx
import { Home, ClipboardCheck, MessageCircle, BarChart3, User, History } from "lucide-react";
// ...
const links = [
  { icon: Home, label: "홈", to: "/dashboard" },
  { icon: ClipboardCheck, label: "심리검사", to: "/tests" },
  { icon: MessageCircle, label: "AI 코칭", to: "/coaching" },
  { icon: BarChart3, label: "감정 트래킹", to: "/emotion" },
  { icon: History, label: "내 기록", to: "/history" },
  { icon: User, label: "마이페이지", to: "/profile" },
];
```

**Step 4: TestPaywall.tsx 수정**

라인 119: `navigate('/pricing')` → `navigate('/tests')`

**Step 5: TestsPage.tsx 상단 "가격 보기" 버튼 제거**

라인 77-81 완전 삭제:
```tsx
// 제거
<div>
  <Button variant="outline" size="sm" onClick={() => navigate("/pricing")}>
    가격 보기
  </Button>
</div>
```

**Step 6: 타입체크**

```bash
npx tsc --noEmit
```
Expected: 에러 없음

**Step 7: 커밋**

```bash
git add src/App.tsx src/pages/PricingPage.tsx src/components/navigation/DesktopSidebar.tsx src/components/payment/TestPaywall.tsx src/pages/TestsPage.tsx
git commit -m "refactor(routes): /pricing 삭제 후 /tests 리다이렉트 (통합 준비)"
```

---

### Task 2: 무료 검사 DB flag SQL 마이그레이션

**목표:** PricingPage에 하드코딩된 무료 3종(E-3, A-2, D-1)을 DB `is_free = true`로 flag하여 데이터 소스 단일화. Supabase 프로젝트 `bpkzljeplyqvbmwwomom`에 실행 필요.

**Files:**
- Create: `supabase/migrations/20260710120000_flag_free_starter_tests.sql`

**Step 1: 마이그레이션 파일 생성**

```sql
-- 무료 스타터 검사 3종 flag (E-3 시험불안, A-2 번아웃, D-1 미루기)
-- INT(통합검사)는 이미 is_free=true. 이 3종은 랜딩/유입 페이지에서 무료로 노출.
UPDATE public.tests
SET is_free = true, price_krw = 0
WHERE id IN ('E-3', 'A-2', 'D-1');
```

**참고:** 실제 컨텐츠 소스는 `catalog-display.ts`에 하드코딩된 name이 아닌 DB `tests.name`. `A-2`가 catalog-display에서 존재하지 않음(무료라서 제외돼 있음) — DB에는 존재해야 함. 이전 시드 마이그레이션에서 이 3종이 뭐로 채워졌는지 사용자에게 확인 필요.

**Step 2: 사용자에게 실행 지시**

브랜치에 커밋만 하고, 사용자에게 Supabase 대시보드 SQL Editor에서 다음 실행 지시:
```sql
UPDATE public.tests SET is_free = true, price_krw = 0 WHERE id IN ('E-3', 'A-2', 'D-1');
-- 확인:
SELECT id, name, is_free, is_integrated, is_coming_soon, price_krw FROM public.tests WHERE is_free = true ORDER BY id;
```

실행 결과에서 `INT`, `E-3`, `A-2`, `D-1` 4행이 나와야 함. 만약 A-2가 DB에 없거나 이름이 다르면 계획 조정.

**Step 3: 커밋**

```bash
git add supabase/migrations/20260710120000_flag_free_starter_tests.sql
git commit -m "sql(tests): E-3/A-2/D-1을 is_free=true로 flag (무료 스타터)"
```

---

### Task 3: TestsPage 데이터 fetching 확장

**목표:** DB `tests` 테이블에서 통합/무료/유료/coming soon을 한 번에 fetch. 유료 가격은 `SINGLE_TEST_DISPLAY`에서 lookup. owned 상태 mount.

**Files:**
- Modify: `src/pages/TestsPage.tsx` (전면 재작성)

**Step 1: 상단 imports 확장**

```tsx
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardCheck, ChevronRight, Clock, Sparkles, Compass,
  Gift, Check, Crown, Loader2, Target,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SINGLE_TEST_DISPLAY, PRO_PLAN_DISPLAY } from "@/lib/payments/catalog-display";
import { usePurchase } from "@/hooks/usePurchase";
import { useUserTestAccess } from "@/hooks/useUserTestAccess";
import { track } from "@/lib/analytics";
import { toast } from "sonner";
```

**Step 2: TestRow 인터페이스 유지, 카테고리 필터에 "무료" 추가**

```tsx
interface TestRow {
  id: string;
  name: string;
  category: string;
  related_syndrome: string;
  description: string;
  question_count: number;
  duration_minutes: number;
  is_recommended: boolean;
  is_coming_soon: boolean;
  is_integrated?: boolean;
  is_free?: boolean;
  price_krw?: number;
  subdomains: string[];
  questions: unknown[];
}

const CATEGORY_FILTERS = [
  { id: "all", label: "전체" },
  { id: "free", label: "🎁 무료" },
  { id: "A", label: "A: 비교·SNS" },
  { id: "B", label: "B: 번아웃·분노" },
  { id: "C", label: "C: 긴장·수면" },
  { id: "D", label: "D: 효능감·미루기" },
  { id: "E", label: "E: 시험·집중력" },
];
```

**Step 3: fetch 로직 재작성 — 필터 없이 전체 로드, 클라이언트에서 분류**

```tsx
export default function TestsPage() {
  const navigate = useNavigate();
  const { purchase, isLoading: isPurchasing } = usePurchase();
  const { accessMap } = useUserTestAccess();
  const [tests, setTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    void track("tests_viewed");
    const run = async () => {
      const { data } = await supabase
        .from("tests")
        .select("*")
        .order("is_coming_soon", { ascending: true })
        .order("category")
        .order("id");
      if (data) setTests(data as unknown as TestRow[]);
      setLoading(false);
    };
    void run();
  }, []);

  // 파생 데이터
  const integratedTest = useMemo(() => tests.find((t) => t.is_integrated), [tests]);
  const freeStarterTests = useMemo(
    () => tests.filter((t) => t.is_free && !t.is_integrated && !t.is_coming_soon),
    [tests],
  );
  const allBrowseTests = useMemo(() => {
    const others = tests.filter((t) => !t.is_integrated);
    if (activeCategory === "all") return others;
    if (activeCategory === "free") return others.filter((t) => t.is_free);
    return others.filter((t) => t.category === activeCategory);
  }, [tests, activeCategory]);

  const priceMap = useMemo(() => {
    const m: Record<string, number> = {};
    SINGLE_TEST_DISPLAY.forEach((p) => { m[p.productId] = p.amount; });
    return m;
  }, []);

  // ... (Task 4에서 카드 렌더링 완성)
}
```

**Step 4: 타입체크**

```bash
npx tsc --noEmit
```

**Step 5: 커밋 (렌더링은 다음 태스크에서, 우선 데이터 로직만)**

렌더링 미완성이면 build 실패. 렌더링과 함께 커밋하려면 Task 4까지 완료 후 하나로 커밋. 안전을 위해 Task 3~5는 하나의 커밋으로 묶는다.

---

### Task 4: 카드 렌더링 헬퍼 및 상태별 CTA

**목표:** 무료/유료/구매완료/준비중/통합 상태별로 카드를 그리는 공통 로직.

**Files:**
- Modify: `src/pages/TestsPage.tsx` (컴포넌트 내부에 렌더 헬퍼 추가)

**Step 1: 카드 상태 유틸**

```tsx
type CardState =
  | { kind: "integrated"; test: TestRow }
  | { kind: "free"; test: TestRow }
  | { kind: "coming_soon"; test: TestRow }
  | { kind: "owned"; test: TestRow; daysRemaining: number }
  | { kind: "paid"; test: TestRow; amount: number };

function getCardState(
  test: TestRow,
  priceMap: Record<string, number>,
  accessMap: Record<string, { daysRemaining: number }>,
): CardState {
  if (test.is_integrated) return { kind: "integrated", test };
  if (test.is_coming_soon) return { kind: "coming_soon", test };
  if (test.is_free) return { kind: "free", test };
  const owned = accessMap[test.id];
  if (owned) return { kind: "owned", test, daysRemaining: owned.daysRemaining };
  return { kind: "paid", test, amount: priceMap[test.id] ?? 2900 };
}
```

**Step 2: 통합검사 배너 (col-span-full 전폭)**

```tsx
function IntegratedBanner({ test, onClick }: { test: TestRow; onClick: () => void }) {
  return (
    <Card
      className="col-span-full p-5 md:p-6 rounded-2xl border-0 gradient-primary text-primary-foreground shadow-md cursor-pointer hover:shadow-lg transition-all duration-200 active:scale-[0.99]"
      onClick={onClick}
    >
      <div className="flex items-start gap-3 md:gap-4">
        <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <Compass className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <Badge className="bg-white/25 text-primary-foreground text-[10px] px-2 py-0.5 border-0 gap-1 mb-1.5">
            <Target className="w-3 h-3" /> 무료 · 먼저 시작
          </Badge>
          <h3 className="font-bold text-base md:text-lg">{test.name}</h3>
          <p className="text-xs md:text-sm opacity-90 leading-relaxed mt-1">
            10가지 심리 영역을 한 번에 점검하고, 나에게 필요한 후속 검사를 추천받으세요.
          </p>
          <div className="flex items-center gap-3 text-[11px] md:text-xs opacity-90 mt-2">
            <span className="flex items-center gap-1"><ClipboardCheck className="w-3 h-3" />{test.question_count}문항</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />약 {test.duration_minutes}분</span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 shrink-0 mt-1" />
      </div>
    </Card>
  );
}
```

**Step 3: 일반 카드 (모든 상태 통합)**

```tsx
function TestCard({
  state,
  onNavigate,
  onPurchase,
  purchasing,
}: {
  state: CardState;
  onNavigate: (id: string) => void;
  onPurchase: (t: TestRow) => void;
  purchasing: boolean;
}) {
  const { test } = state;
  const hasQuestions = Array.isArray(test.questions) && test.questions.length > 0;

  const rightBadge = (() => {
    switch (state.kind) {
      case "coming_soon":
        return <Badge variant="outline" className="text-[10px]">준비중</Badge>;
      case "free":
        return (
          <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-0 text-[10px] gap-1">
            <Gift className="w-3 h-3" /> 무료
          </Badge>
        );
      case "owned":
        return (
          <Badge className="bg-primary/10 text-primary border-0 text-[10px] gap-1">
            <Check className="w-3 h-3" /> D-{state.daysRemaining}
          </Badge>
        );
      case "paid":
        return (
          <Badge variant="secondary" className="text-[10px] font-semibold">
            ₩{state.amount.toLocaleString()}
          </Badge>
        );
      default:
        return null;
    }
  })();

  const cta = (() => {
    switch (state.kind) {
      case "coming_soon":
        return <Button disabled variant="outline" size="sm" className="w-full">준비중</Button>;
      case "free":
        return (
          <Button variant="outline" size="sm" className="w-full" onClick={() => hasQuestions && onNavigate(test.id)}>
            무료로 응시하기
          </Button>
        );
      case "owned":
        return (
          <Button variant="outline" size="sm" className="w-full" onClick={() => onNavigate(test.id)}>
            검사 시작
          </Button>
        );
      case "paid":
        return (
          <Button size="sm" className="w-full" disabled={purchasing} onClick={() => onPurchase(test)}>
            {purchasing ? (<><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> 결제창 준비 중...</>) : "구매하기"}
          </Button>
        );
      default:
        return null;
    }
  })();

  const isDisabled = state.kind === "coming_soon" || !hasQuestions;

  return (
    <Card
      className={`p-5 rounded-2xl border-border/50 shadow-sm flex flex-col transition-all duration-200 relative ${
        isDisabled ? "opacity-60" : "hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <Badge variant="outline" className="text-[10px] font-medium shrink-0">
          {test.category}
        </Badge>
        {rightBadge}
      </div>

      <div className="flex items-start gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <ClipboardCheck className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-sm leading-snug">{test.name}</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">{test.related_syndrome}</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2 flex-1">
        {test.description}
      </p>

      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3">
        <span className="flex items-center gap-1"><ClipboardCheck className="w-3 h-3" />{test.question_count}문항</span>
        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />약 {test.duration_minutes}분</span>
        {test.is_recommended && (
          <Badge className="ml-auto gradient-primary text-primary-foreground text-[9px] px-1.5 py-0 border-0 gap-0.5">
            <Sparkles className="w-2.5 h-2.5" /> AI 추천
          </Badge>
        )}
      </div>

      {cta}
    </Card>
  );
}
```

---

### Task 5: 섹션 구조 렌더링 완성 + 커밋

**목표:** Hero, 무료 섹션, 전체 둘러보기 섹션, 멤버십 섹션을 조립. 반응형 그리드 적용. 하나의 커밋으로 T3~T5 통합.

**Files:**
- Modify: `src/pages/TestsPage.tsx` (return JSX)

**Step 1: 페이지 return JSX**

```tsx
return (
  <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 space-y-8 md:space-y-10 animate-reveal-up">
    {/* Hero */}
    <header className="space-y-2">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">심리검사</h1>
      <p className="text-sm md:text-base text-muted-foreground">
        무료 통합검사부터 시작해서 나에게 필요한 검사를 찾아보세요
      </p>
    </header>

    {/* 무료 섹션 */}
    <section className="space-y-4">
      <div>
        <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          지금 무료로 시작해보세요
        </h2>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          가입만 하면 통합검사 + 인기 검사 3종을 무료로 응시할 수 있어요
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {integratedTest && (
            <IntegratedBanner test={integratedTest} onClick={() => navigate(`/tests/${integratedTest.id}`)} />
          )}
          {freeStarterTests.map((test) => (
            <TestCard
              key={test.id}
              state={getCardState(test, priceMap, accessMap)}
              onNavigate={(id) => navigate(`/tests/${id}`)}
              onPurchase={() => {}}
              purchasing={false}
            />
          ))}
        </div>
      )}
    </section>

    {/* 전체 둘러보기 섹션 */}
    <section className="space-y-4">
      <div>
        <h2 className="text-lg md:text-xl font-bold">전체 검사 둘러보기</h2>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          단품 ₩2,900 · 결제 후 30일 동안 다시 볼 수 있어요
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${
              activeCategory === cat.id
                ? "gradient-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}
        </div>
      ) : allBrowseTests.length === 0 ? (
        <p className="text-center py-12 text-sm text-muted-foreground">해당 카테고리의 검사가 아직 없어요.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allBrowseTests.map((test) => {
            const state = getCardState(test, priceMap, accessMap);
            return (
              <TestCard
                key={test.id}
                state={state}
                onNavigate={(id) => navigate(`/tests/${id}`)}
                onPurchase={(t) =>
                  purchase({
                    productType: "single_test",
                    productId: t.id,
                    productName: t.name,
                  })
                }
                purchasing={isPurchasing(test.id)}
              />
            );
          })}
        </div>
      )}
    </section>

    {/* 멤버십 */}
    <section className="space-y-3">
      <h2 className="text-lg md:text-xl font-bold">멤버십</h2>
      <Card
        className="p-5 md:p-6 rounded-2xl border-2 border-primary/20 bg-card shadow-sm cursor-pointer hover:shadow-md transition-all"
        onClick={() => toast.info("Pro 멤버십은 준비 중입니다", { description: "곧 만나보실 수 있어요." })}
      >
        <div className="flex items-start gap-3 md:gap-4">
          <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-base md:text-lg">{PRO_PLAN_DISPLAY.name}</h3>
              <Badge variant="outline" className="text-[10px]">곧 출시</Badge>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">{PRO_PLAN_DISPLAY.description}</p>
            <ul className="mt-3 space-y-1.5 text-xs md:text-sm text-muted-foreground">
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> 매월 200 AI 코칭 크레딧</li>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> 주 2회 단품 검사 무료 이용</li>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> 감정 트래킹 리포트 확장</li>
            </ul>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg md:text-xl font-bold">₩{PRO_PLAN_DISPLAY.amount.toLocaleString()}</div>
            <div className="text-[11px] text-muted-foreground">/ 월</div>
          </div>
        </div>
      </Card>
    </section>
  </div>
);
```

**Step 2: 로컬 개발 서버로 시각 확인**

```bash
npm run dev
```

브라우저에서 `/tests` 접속:
- 모바일 뷰(375px) / 태블릿(768px) / 데스크톱(1280px) 3개 크기에서 배열 확인
- 무료 섹션 뱃지 · 필터 탭 · 카드 상태 뱃지 · 멤버십 카드 배열 확인
- `/pricing` 접속 시 자동으로 `/tests`로 리다이렉트 되는지 확인
- Desktop sidebar에 "가격" 메뉴 사라졌는지 확인

**Step 3: 타입체크 + 빌드**

```bash
npx tsc --noEmit
npm run build
```

**Step 4: 커밋 (T3~T5 통합)**

```bash
git add src/pages/TestsPage.tsx
git commit -m "feat(tests): /pricing 흡수, 무료/유료/구매 상태 카드 통합 + 반응형"
```

---

### Task 6: 프로덕션 배포 및 라이브 검증

**목표:** vercel-migration 브랜치에 커밋된 변경사항을 프로덕션 배포하고 라이브에서 검증. (GitHub 자동 배포가 끊긴 상태이므로 CLI 직접 배포.)

**Files:** 없음

**Step 1: git push**

```bash
git push origin vercel-migration
```

**Step 2: DB 마이그레이션 (사용자 수동 실행)**

사용자에게 Supabase 대시보드에서 실행 요청:

```sql
UPDATE public.tests SET is_free = true, price_krw = 0 WHERE id IN ('E-3', 'A-2', 'D-1');
SELECT id, name, is_free, is_integrated, is_coming_soon, price_krw FROM public.tests WHERE is_free = true ORDER BY id;
```

기대 결과: 4행(`INT`, `E-3`, `A-2`, `D-1`) 반환.

**Step 3: Vercel CLI로 프로덕션 배포**

```bash
vercel deploy --prod --yes
```

Expected: 배포 완료, `https://mindcoach-ai-quest.vercel.app` alias 갱신.

**Step 4: 라이브 검증**

```bash
curl -s -o /dev/null -w "tests: %{http_code}\n" https://mindcoach-ai-quest.vercel.app/tests
curl -s -o /dev/null -w "pricing: %{http_code}\n" https://mindcoach-ai-quest.vercel.app/pricing
```

Expected: `tests: 200`, `pricing: 200` (리다이렉트는 클라이언트 사이드라 서버는 index.html 반환하므로 200)

브라우저에서 사용자에게 직접 확인 요청:
- `/tests`에서 무료 섹션에 통합검사 + E-3/A-2/D-1 4개 카드 표시
- 필터 탭 "🎁 무료" 클릭 시 무료 4종만 표시
- 모바일 크기에서 뱃지 겹침·텍스트 잘림 없음
- `/pricing` URL 직접 접속 시 `/tests`로 이동

---

## 실패 시 롤백

- 각 태스크가 별도 커밋이므로 문제가 생기면 `git revert <sha>` 로 되돌리기
- Vercel 대시보드에서 이전 배포로 promote 가능

## 스코프 밖 확인

- Dashboard/Coaching/Emotion/History/Profile 반응형 QA는 다음 세션
- Pro 멤버십 실제 결제는 여전히 "곧 출시" (toast만)
