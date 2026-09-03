import { Brain, MessageCircle, BarChart3, ShieldAlert } from "lucide-react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import SectionHeader from "@/components/landing/SectionHeader";
import ChatMockupCard from "@/components/landing/ChatMockupCard";

const features = [
  {
    icon: Brain,
    title: "AI 심리검사",
    desc: "26종 표준화 심리검사를 온라인으로 실시하고 즉시 결과를 확인하세요. 4개 하위영역별 분석과 위험도를 시각화합니다.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: MessageCircle,
    title: "AI 맞춤 코칭",
    desc: "검사 결과를 기반으로 32가지 수험생 심리 증후군에 맞는 1:1 대화형 코칭을 제공합니다.",
    color: "bg-secondary/10 text-secondary",
  },
  {
    icon: BarChart3,
    title: "감정 트래킹",
    desc: "매일 감정을 기록하고, 주간·월간 패턴을 분석합니다. AI 코치가 대화 중 자동으로 기록해드립니다.",
    color: "bg-accent/10 text-accent",
  },
  {
    icon: ShieldAlert,
    title: "위험 신호 감지",
    desc: "자해·자살 위험 신호를 실시간 감지하고, 전문가 연계를 안내하는 안전장치가 작동합니다.",
    color: "bg-warning/10 text-warning",
  },
];

export default function FeaturesSection() {
  const ref = useScrollReveal();

  return (
    <section id="features" className="py-24 px-6 bg-muted/50" ref={ref}>
      <div className="container max-w-5xl">
        <SectionHeader
          className="mb-14"
          eyebrow="핵심 기능"
          title="AI가 당신의 마음을 분석하고, 코칭합니다"
          subtitle="수험생의 마음 건강을 위한 네 가지 핵심 기능"
        />

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="bg-card rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow border border-border/50"
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

        <div className="mt-16">
          <ChatMockupCard />
        </div>
      </div>
    </section>
  );
}
