import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const problems = [
  {
    emoji: "😰",
    title: "학업 스트레스",
    desc: "성적 압박, 시험 불안, 번아웃... 혼자 감당하고 있지 않나요?",
  },
  {
    emoji: "💸",
    title: "높은 상담 비용",
    desc: "심리상담 1회 10~15만원, 학생에게는 너무 큰 부담",
  },
  {
    emoji: "⏳",
    title: "긴 대기 시간",
    desc: "학교 상담실은 예약이 수주일, 즉각적 도움이 어려움",
  },
];

export default function ProblemSection() {
  const ref = useScrollReveal();

  return (
    <section className="py-24 px-6" ref={ref}>
      <div className="container max-w-4xl">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-14">
          수험생 10명 중 7명이
          <br className="md:hidden" />
          <span className="gradient-text"> 학업 스트레스</span>를 겪고 있습니다
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {problems.map((p, i) => (
            <div
              key={p.title}
              className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm hover:shadow-md transition-shadow"
              style={{ animationDelay: `${i * 100 + 100}ms` }}
            >
              <div className="text-4xl mb-4">{p.emoji}</div>
              <h3 className="font-bold text-lg mb-2">{p.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-muted-foreground mt-12 text-sm">
          마인드코치 AI는 이 문제를 해결하기 위해 만들어졌습니다.
        </p>
      </div>
    </section>
  );
}
