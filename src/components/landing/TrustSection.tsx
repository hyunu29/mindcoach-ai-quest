import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const stats = [
  { number: "32", label: "가지 증후군 분석" },
  { number: "26", label: "종 전문 검사지" },
  { number: "20", label: "년 심리 전문가 경력 기반" },
];

export default function TrustSection() {
  const ref = useScrollReveal();

  return (
    <section className="py-20 px-6 bg-muted/50" ref={ref}>
      <div className="container max-w-4xl">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
          전문성에 기반한 신뢰
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-lg mx-auto">
          수험생 심리 전문가의 오랜 연구와 임상 경험을 AI 기술로 확장했습니다.
        </p>
        <div className="grid grid-cols-3 gap-4 md:gap-8">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl md:text-5xl font-extrabold gradient-text mb-2">
                {s.number}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground font-medium">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
