import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import LandingFooter from "@/components/landing/LandingFooter";
import { CHITO_POSES, CHITO_EMBLEM_URL } from "@/lib/character/chito";

/* ─── 갤러리 랜딩 — Structured 스타일 레퍼런스 × 컬러 치토 ───────────────
 * 원칙 (DESIGN 레퍼런스): 웜 뉴트럴+블랙 무채색 · 세리프 디스플레이 · 하드컷 섹션 교차
 * · 그라데이션/그림자 없음 · 미니멀 헤더 · 치토 일러가 유일한 컬러 (유화의 자리)
 * 팔레트: putty #C7C5B8 / bone #E8E6DF / ink #0A0A0A / graphite #595855 / vellum #DFDCD5 */

const PUTTY = "#C7C5B8";
const BONE = "#E8E6DF";
const INK = "#0A0A0A";
const GRAPHITE = "#595855";
const VELLUM = "#DFDCD5";

const VIGNETTES = [
  {
    pose: CHITO_POSES.thinking,
    title: "간이 심리검사",
    desc: "26종 검사로 지금 마음의 위치를 확인해요",
  },
  {
    pose: CHITO_POSES.waving,
    title: "AI 심리코칭",
    desc: "치토와 1:1 대화로 마음을 풀어가요",
  },
  {
    pose: CHITO_POSES.cheering,
    title: "감정 트래킹",
    desc: "매일의 감정이 쌓여 흐름이 보여요",
  },
];

function Hexagon({ light }: { light?: boolean }) {
  return (
    <span
      aria-hidden
      className="inline-block w-3 h-3"
      style={{
        clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
        border: "none",
        background: "transparent",
        boxShadow: `inset 0 0 0 1.5px ${light ? "#FFFFFF" : INK}`,
      }}
    />
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const handleStart = () => navigate(user ? "/dashboard" : "/auth");

  return (
    <div style={{ backgroundColor: PUTTY, color: INK }} className="min-h-screen">
      {/* ── 미니멀 헤더: 로고 마크 + 텍스트 링크 하나 ── */}
      <header className="flex items-center justify-between px-6 md:px-10 h-14">
        <img src={CHITO_EMBLEM_URL} alt="마이치" className="h-8 w-auto" />
        <button
          onClick={() => navigate("/auth")}
          className="text-[13px] font-medium hover:underline underline-offset-4"
        >
          로그인
        </button>
      </header>

      {/* ── Hero: 소형 중앙 클러스터 + 초대형 워드마크 크롭 ── */}
      <section className="relative overflow-hidden">
        <div className="flex flex-col items-center text-center px-6 pt-16 md:pt-24 pb-8">
          <p className="text-[11px] tracking-[0.22em] font-semibold mb-7" style={{ color: GRAPHITE }}>
            MYCH · AI MIND COACHING
          </p>
          <h1 className="font-display-serif font-semibold text-[2rem] leading-[1.25] md:text-[3.2rem] md:leading-[1.18] tracking-[-0.02em] mb-7">
            불안은 걷어내고,
            <br />
            잠재력을 깨우는 마음 코칭
          </h1>
          <p className="text-[15px] font-medium mb-8" style={{ color: GRAPHITE }}>
            간이검사 26종 · 증후군 체계 32 · 독자 평점 9.6
          </p>
          <button
            onClick={handleStart}
            className="rounded-full px-6 py-2.5 text-[13px] font-medium text-white active:scale-[0.98] transition-transform"
            style={{ backgroundColor: INK }}
          >
            무료 검사 시작하기
          </button>
        </div>

        {/* 워드마크 — 뷰포트보다 크게, 하단 크롭 */}
        <div className="select-none pointer-events-none overflow-hidden leading-none" aria-hidden>
          <div
            className="font-display-serif font-black text-center whitespace-nowrap"
            style={{
              fontSize: "clamp(7rem, 30vw, 24rem)",
              letterSpacing: "-0.045em",
              lineHeight: 0.9,
              marginBottom: "-0.18em",
            }}
          >
            마이치
          </div>
        </div>
      </section>

      {/* ── 치토 룸: 유화의 자리에 치토 — 유일한 컬러 ── */}
      <section style={{ backgroundColor: BONE }} className="relative px-6 py-20 md:py-28">
        <p
          className="absolute top-6 left-6 md:left-10 text-[9px] tracking-[0.3em] font-medium"
          style={{ color: GRAPHITE }}
        >
          SCROLL
        </p>
        <div className="max-w-xl mx-auto flex flex-col items-center text-center">
          <img
            src={CHITO_POSES.main}
            alt="치토"
            className="w-64 h-64 md:w-96 md:h-96 object-contain animate-chito-float"
            loading="lazy"
          />
          <blockquote className="font-display-serif text-[1.35rem] md:text-[1.7rem] leading-[1.5] mt-10">
            “치토는 한 번에 여러 명을
            <br />
            상대하지 않아. <em className="not-italic font-black">오늘은 너 한 명이야.</em>”
          </blockquote>
          <p className="text-[13px] mt-5" style={{ color: GRAPHITE }}>
            마이치의 AI 심리코칭 캐릭터, 치토
          </p>
        </div>
      </section>

      {/* ── Ink 룸: 세리프 대형 헤딩 + 원형 비네트 3열 ── */}
      <section style={{ backgroundColor: INK, color: "#FFFFFF" }} className="px-6 py-20 md:py-28">
        <h2 className="font-display-serif font-semibold text-center text-[2.4rem] md:text-[4.6rem] leading-[0.95] tracking-[-0.02em] mb-16 md:mb-20">
          치토가 하는 일
        </h2>
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-12 md:gap-8">
          {VIGNETTES.map((v) => (
            <div key={v.title} className="flex flex-col items-center text-center">
              <p className="font-display-serif text-[1.3rem] mb-6">{v.title}</p>
              <div
                className="w-44 h-44 md:w-48 md:h-48 rounded-full flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: BONE }}
              >
                <img src={v.pose} alt="" className="w-36 h-36 md:w-40 md:h-40 object-contain" loading="lazy" />
              </div>
              <p className="text-[13px] mt-6 leading-relaxed" style={{ color: "#B9B8B0" }}>
                {v.desc}
              </p>
              <div className="flex gap-2 mt-5">
                <Hexagon light />
                <Hexagon light />
                <Hexagon light />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 에디토리얼: 전문가 자문 ── */}
      <section style={{ backgroundColor: PUTTY }} className="px-6 py-20 md:py-28">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display-serif font-semibold text-[1.9rem] md:text-[2.7rem] leading-[1.15] tracking-[-0.015em] mb-8">
            수험생 심리 전문가의
            <br />
            자문 위에서
          </h2>
          <p className="text-[15px] leading-[1.8] mb-12" style={{ color: GRAPHITE }}>
            마이치의 검사 체계와 콘텐츠는 메가스터디 학습심리 강사이자
            <br className="hidden md:block" />
            『공부에 지친 학생들을 위한 심리 수업』 저자인
            <br className="hidden md:block" />
            현장 전문가의 자문을 받아 설계되었습니다.
          </p>
          <div
            className="flex items-center justify-center gap-8 md:gap-14 text-[15px] font-medium pt-8"
            style={{ borderTop: `1px solid ${VELLUM}` }}
          >
            <span>증후군 체계 32</span>
            <span>간이검사 26종</span>
            <span>알라딘 9.6</span>
          </div>
        </div>
      </section>

      {/* ── Ink CTA ── */}
      <section style={{ backgroundColor: INK, color: "#FFFFFF" }} className="px-6 py-24 md:py-32 text-center">
        <h2 className="font-display-serif font-semibold text-[2rem] md:text-[3.4rem] leading-[1.1] tracking-[-0.02em] mb-10">
          지금, 나를 이해하는
          <br />첫 걸음
        </h2>
        <button
          onClick={handleStart}
          className="rounded-full px-7 py-3 text-[13px] font-medium active:scale-[0.98] transition-transform"
          style={{ backgroundColor: PUTTY, color: INK }}
        >
          무료로 시작하기
        </button>
      </section>

      <LandingFooter />
    </div>
  );
}
