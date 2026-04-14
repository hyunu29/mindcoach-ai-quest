import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const reviews = [
  {
    text: "시험 때마다 불안했는데, 제가 '시험불안 증후군'이라는 걸 알게 됐어요. AI 코칭 받으니까 대처법을 알겠더라고요.",
    author: "고3 수험생",
  },
  {
    text: "혼자 끙끙 앓다가 여기서 처음으로 제 마음을 들여다봤어요. 감정 기록하는 습관이 생겼어요.",
    author: "고2 학생",
  },
  {
    text: "아이가 스트레스를 많이 받는 것 같아 걱정했는데, 검사 결과를 보고 대화의 실마리를 찾았어요.",
    author: "학부모",
  },
];

export default function SocialProofSection() {
  const ref = useScrollReveal();

  return (
    <section className="py-24 px-6" ref={ref}>
      <div className="container max-w-4xl">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-14">
          학생들의 이야기
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {reviews.map((r, i) => (
            <div
              key={i}
              className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm"
              style={{ animationDelay: `${i * 100 + 100}ms` }}
            >
              <p className="text-sm leading-relaxed text-foreground mb-4">"{r.text}"</p>
              <div className="text-xs text-muted-foreground font-medium">— {r.author}</div>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          위 후기는 서비스 이해를 위한 예시입니다.
        </p>
      </div>
    </section>
  );
}
