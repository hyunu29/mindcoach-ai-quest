import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import kimJonghwan from "../../../public/kim-jonghwan.png";

const stats = [
  { number: "32가지", label: "수험생 심리 증후군 분류 체계" },
  { number: "26종", label: "표준화 심리검사지 개발" },
  { number: "알라딘 9.6점", label: "독자 평점 (42개 리뷰)" },
];

export default function ExpertSection() {
  const ref = useScrollReveal();

  return (
    <section id="expert" className="py-24 px-6" ref={ref}>
      <div className="container max-w-4xl">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-14">
          수험생 심리 전문가가 직접 만든 콘텐츠
        </h2>

        <div className="flex flex-col md:flex-row gap-10 items-center md:items-start">
          {/* Profile */}
          <div className="flex flex-col items-center shrink-0">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden mb-4 border-2 border-primary/20 shadow-sm bg-gradient-to-b from-muted/40 to-muted/10">
              <img
                src={kimJonghwan}
                alt="마인드코치 김종환"
                className="w-full h-full object-cover object-top"
                loading="lazy"
              />
            </div>
            <div className="text-lg font-bold">김종환</div>
            <div className="text-sm text-muted-foreground text-center">
              마인드코치 | 메가스터디 학습심리 강사
            </div>
          </div>

          {/* Bio */}
          <div className="flex-1 space-y-4 text-sm md:text-base leading-relaxed text-muted-foreground">
            <p>
              메가스터디 '슬기로운 감정생활' 학습심리 강사로 활동하며,
              수험생의 심리 안정과 학습 동기부여를 돕고 있습니다.
            </p>
            <p>
              저서 『공부에 지친 학생들을 위한 심리 수업』(2024, 북루덴스)에서
              '공부의 시작과 끝은 긍정적 멘탈'이라는 철학을 전하고 있습니다.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 md:gap-8 mt-14">
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
