import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Compass, Loader2, Check, ChevronRight, Crown } from "lucide-react";
import { toast } from "sonner";
import { SINGLE_TEST_DISPLAY, PRO_PLAN_DISPLAY } from "@/lib/payments/catalog-display";
import { usePurchase } from "@/hooks/usePurchase";
import { useUserTestAccess } from "@/hooks/useUserTestAccess";

const CATEGORY_FILTERS = [
  { id: "all", label: "전체" },
  { id: "A", label: "A: 비교·SNS" },
  { id: "B", label: "B: 번아웃·분노" },
  { id: "C", label: "C: 긴장·수면" },
  { id: "D", label: "D: 효능감·미루기" },
  { id: "E", label: "E: 시험·집중력" },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const { purchase, isLoading } = usePurchase();
  const { accessMap } = useUserTestAccess();
  const [activeCategory, setActiveCategory] = useState("all");

  const filtered = useMemo(
    () =>
      activeCategory === "all"
        ? SINGLE_TEST_DISPLAY
        : SINGLE_TEST_DISPLAY.filter((p) => p.category === activeCategory),
    [activeCategory],
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-8 animate-reveal-up">
      {/* Hero */}
      <header className="text-center space-y-3">
        <Badge className="gradient-primary text-primary-foreground border-0 gap-1">
          <Sparkles className="w-3 h-3" /> 마인드코치 AI 가격
        </Badge>
        <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
          검사 + AI 코칭으로 <br className="md:hidden" /> 불안의 원인을 찾아보세요
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          먼저 무료 통합검사로 나에게 필요한 영역을 확인하고, 단품 검사로 깊이 들여다보세요.
        </p>
      </header>

      {/* Free integrated test */}
      <Card
        className="p-6 rounded-2xl border-0 gradient-primary text-primary-foreground shadow-md cursor-pointer hover:shadow-lg transition-all active:scale-[0.99]"
        onClick={() => navigate("/tests/INT")}
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Compass className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <Badge className="bg-white/25 text-primary-foreground border-0 text-[10px] mb-1.5">무료 · 여기부터 시작</Badge>
            <h2 className="text-lg font-bold">통합 심리검사</h2>
            <p className="text-sm opacity-90 mt-1">
              10가지 심리 영역을 한 번에 점검하고, 나에게 필요한 후속 검사를 추천받으세요.
            </p>
          </div>
          <ChevronRight className="w-5 h-5 shrink-0 mt-2" />
        </div>
      </Card>

      {/* Single tests section */}
      <section className="space-y-4">
        <div className="flex items-end justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-bold">단품 심리검사</h2>
            <p className="text-xs text-muted-foreground mt-1">
              건당 ₩2,900 · 결제 후 30일 동안 다시 볼 수 있어요
            </p>
          </div>
        </div>

        {/* Category filter */}
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

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => {
            const access = accessMap[p.productId];
            const owned = !!access;
            const loading = isLoading(p.productId);
            return (
              <Card key={p.productId} className="p-5 rounded-2xl border-border/50 shadow-sm flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge variant="outline" className="text-[10px]">
                    {p.category}
                  </Badge>
                  {p.badge && (
                    <Badge className="gradient-primary text-primary-foreground border-0 text-[10px] gap-1">
                      <Sparkles className="w-3 h-3" />
                      {p.badge}
                    </Badge>
                  )}
                </div>
                <h3 className="font-bold text-sm">{p.name}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed mt-1 line-clamp-2 flex-1">
                  {p.description}
                </p>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-lg font-bold">₩{p.amount.toLocaleString()}</span>
                  <span className="text-[11px] text-muted-foreground">/ 1회 · 30일</span>
                </div>

                {owned ? (
                  <div className="mt-3 space-y-2">
                    <Badge className="w-full justify-center bg-primary/10 text-primary border-0 py-1.5 gap-1">
                      <Check className="w-3.5 h-3.5" /> 구매됨 · D-{access.daysRemaining}
                    </Badge>
                    <Button variant="outline" className="w-full" size="sm" onClick={() => navigate(`/tests/${p.productId}`)}>
                      검사 시작
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="mt-3 w-full"
                    size="sm"
                    disabled={loading}
                    onClick={() =>
                      purchase({ productType: p.productType, productId: p.productId, productName: p.name })
                    }
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                        결제창 준비 중...
                      </>
                    ) : (
                      "구매하기"
                    )}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {/* Pro membership */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold">멤버십</h2>
        <Card
          className="p-6 rounded-2xl border-2 border-primary/20 bg-card shadow-sm cursor-pointer hover:shadow-md transition-all"
          onClick={() => toast.info("Pro 멤버십은 준비 중입니다", { description: "곧 만나보실 수 있어요." })}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
              <Crown className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg">{PRO_PLAN_DISPLAY.name}</h3>
                <Badge variant="outline" className="text-[10px]">곧 출시</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{PRO_PLAN_DISPLAY.description}</p>
              <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> 매월 200 AI 코칭 크레딧</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> 주 2회 단품 검사 무료 이용</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-primary" /> 감정 트래킹 리포트 확장</li>
              </ul>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xl font-bold">₩{PRO_PLAN_DISPLAY.amount.toLocaleString()}</div>
              <div className="text-[11px] text-muted-foreground">/ 월</div>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}