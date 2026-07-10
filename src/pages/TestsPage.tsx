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
          <Button variant="outline" size="sm" className="w-full" disabled={!hasQuestions} onClick={() => onNavigate(test.id)}>
            무료로 응시하기
          </Button>
        );
      case "owned":
        return (
          <Button variant="outline" size="sm" className="w-full" disabled={!hasQuestions} onClick={() => onNavigate(test.id)}>
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
                onPurchase={() => { /* free tests: no purchase */ }}
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
}
