import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { ClipboardList, PenLine, BarChart3 } from "lucide-react";

const steps = [
  {
    num: "01",
    icon: ClipboardList,
    title: "검사 선택",
    desc: "26종 심리검사 중 AI가 추천하는 검사를 선택",
  },
  {
    num: "02",
    icon: PenLine,
    title: "3분 검사",
    desc: "20문항 리커트 척도, 직관적으로 답하면 끝",
  },
  {
    num: "03",
    icon: BarChart3,
    title: "결과 + 코칭",
    desc: "레이더 차트로 한눈에 파악, AI 맞춤 코칭 시작",
  },
];

export default function HowItWorksSection() {
  const ref = useScrollReveal();

  return (
    <section id="how-it-works" className="py-24 px-6 bg-muted/50" ref={ref}>
      <div className="container max-w-4xl">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-14">
          3분이면 시작할 수 있어요
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <div key={s.num} className="text-center" style={{ animationDelay: `${i * 120}ms` }}>
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/20">
                <s.icon className="w-7 h-7 text-white" />
              </div>
              <div className="text-xs font-bold text-primary mb-2">{s.num}</div>
              <h3 className="font-bold text-lg mb-2">{s.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
