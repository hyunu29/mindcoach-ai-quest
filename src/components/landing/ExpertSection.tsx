import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const stats = [
  { number: "32가지", label: "수험생 심리 증후군 분류 체계" },
  { number: "26종", label: "표준화 심리검사지 개발" },
  { number: "알라딘 9.6점", label: "독자 평점 (42개 리뷰)" },
];

export default function ExpertSection() {
  const ref = useScrollReveal();

  return (
    <section id="expert" className="py-20 px-6" ref={ref}>
      <div className="container max-w-3xl text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          수험생 심리 전문가 자문 기반
        </h2>
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          마이치의 검사 체계와 콘텐츠는 메가스터디 학습심리 강사이자 저서{" "}
          <span className="font-semibold text-foreground">『공부에 지친 학생들을 위한 심리 수업』</span>{" "}
          저자인 현장 전문가의 자문을 받아 설계되었습니다.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 md:gap-8 mt-12">
          {stats.map((s) => (
            <div key={s.label} className="text-center bg-muted/50 rounded-2xl p-5">
              <div className="text-xl md:text-2xl font-extrabold gradient-text mb-1">
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
