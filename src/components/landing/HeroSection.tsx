import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { ArrowDown } from "lucide-react";
import { CHITO_MAIN_URL } from "@/lib/character/chito";

const CONCERN_CHIPS = [
  { emoji: "😰", label: "시험불안" },
  { emoji: "🔥", label: "번아웃" },
  { emoji: "⏳", label: "미루기" },
  { emoji: "🌧️", label: "우울" },
  { emoji: "🎯", label: "집중력" },
  { emoji: "💯", label: "완벽주의" },
  { emoji: "🛌", label: "무기력" },
  { emoji: "💜", label: "관계 고민" },
];

export default function HeroSection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ref = useScrollReveal();

  const handleStart = () => navigate(user ? "/dashboard" : "/auth");
  const scrollToFeatures = () =>
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });

  return (
    <section className="relative overflow-hidden bg-background">
      {/* 은은한 보라 글로우 */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px]"
        style={{
          background:
            "radial-gradient(ellipse at center, hsl(239 84% 67% / 0.14) 0%, transparent 65%)",
        }}
      />

      <div className="container relative z-10 px-6 pt-32 pb-20" ref={ref}>
        <div className="max-w-3xl mx-auto text-center">
          {/* 아이브로우 */}
          <p className="gradient-text text-sm md:text-base font-bold mb-5">
            대한민국 수험생 대표 AI 심리코칭
          </p>

          {/* 대형 잉크 헤드라인 */}
          <h1 className="text-[2.5rem] leading-[1.28] md:text-6xl font-bold text-foreground tracking-[-0.02em] mb-6">
            불안은 걷어내고,
            <br />
            <span className="gradient-text">잠재력을 깨우는</span> 마음 코칭
          </h1>

          {/* 서브 헤드라인 */}
          <p className="text-muted-foreground text-base md:text-lg mb-9 leading-relaxed">
            간이 심리검사로 내 마음 상태를 확인하고,
            <br className="hidden md:block" /> AI 코치 치토와 함께 매일 마음을
            돌봐요.
          </p>

          {/* CTA — 필 버튼 */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
            <Button
              onClick={handleStart}
              size="xl"
              className="rounded-full px-9 gradient-primary gradient-primary-hover text-primary-foreground font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
            >
              무료 검사 시작하기
            </Button>
            <Button
              onClick={scrollToFeatures}
              size="xl"
              className="rounded-full px-9 bg-foreground text-background font-bold hover:bg-foreground/90"
            >
              서비스 둘러보기
              <ArrowDown className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* 고민 키워드 칩 클라우드 */}
          <div className="flex flex-wrap justify-center gap-2.5 max-w-xl mx-auto mb-14">
            {CONCERN_CHIPS.map((c, i) => (
              <span
                key={c.label}
                className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border/60 shadow-sm px-4 py-2 text-sm font-semibold"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span aria-hidden>{c.emoji}</span>
                {c.label}
              </span>
            ))}
          </div>

          {/* 치토 다크 카드 */}
          <div className="relative mx-auto w-56 h-56 md:w-64 md:h-64 rounded-[2rem] overflow-hidden shadow-[0_20px_60px_-15px_rgba(100,102,241,0.45)] ring-1 ring-border/40">
            <img
              src={CHITO_MAIN_URL}
              alt="마이치 캐릭터 치토"
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
