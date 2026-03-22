import { Brain, MessageCircle, BarChart3 } from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const features = [
  {
    icon: Brain,
    title: "맞춤형 심리검사",
    desc: "26종의 전문 검사지로 학업 스트레스, 시험 불안, 자존감 등을 정밀 분석합니다.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: MessageCircle,
    title: "AI 코칭 상담",
    desc: "검사 결과를 기반으로 1:1 맞춤 코칭을 제공합니다. 언제든 대화할 수 있어요.",
    color: "bg-secondary/10 text-secondary",
  },
  {
    icon: BarChart3,
    title: "감정 트래킹",
    desc: "매일의 감정을 기록하고 변화 추이를 확인하세요. 나만의 멘탈 리포트를 만들어요.",
    color: "bg-accent/10 text-accent",
  },
];

export default function FeaturesSection() {
  const ref = useScrollReveal();

  return (
    <section className="py-20 px-6">
      <div className="container" ref={ref}>
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
          어떻게 도와줄 수 있을까요?
        </h2>
        <p className="text-muted-foreground text-center mb-12 max-w-lg mx-auto">
          수험생의 마음 건강을 위한 세 가지 핵심 기능
        </p>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="bg-card rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300 border border-border/50"
              style={{ animationDelay: `${i * 100 + 100}ms` }}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                <f.icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
