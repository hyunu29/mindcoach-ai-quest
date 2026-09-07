import { useState } from "react";
import { CHITO_MAIN_URL } from "@/lib/character/chito";
import { track } from "@/lib/analytics";

interface TestIntroGateProps {
  testName: string;
  isIntegrated: boolean;
  questionCount: number;
  durationMinutes: number;
  category?: string;
  onComplete: () => void;
}

interface IntroStep {
  quote: string;
  cta: string;
}

/* 카테고리별 스토리 오프닝 — 검사마다 치토가 다른 이야기로 말을 건다 (청월당식) */
const CATEGORY_OPENINGS: Record<string, { quote: string; cta: string }> = {
  A: {
    quote: "다른 사람들 이야기가\n자꾸 눈에 들어올 때 있지.\n오늘은 남 말고, 네 얘기만 하자.",
    cta: "그래, 내 얘기 하자",
  },
  B: {
    quote: "열심히 달려온 만큼\n마음도 뜨거워졌을 거야.\n잠깐 멈춰서 열을 재보자.",
    cta: "응, 잠깐 멈출게",
  },
  C: {
    quote: "마음이 힘들면\n몸이 먼저 신호를 보내기도 해.\n요즘 밤은 좀 어땠어?",
    cta: "얘기해볼게",
  },
  D: {
    quote: "'나중에 하지'가 쌓이면\n마음이 점점 무거워지더라.\n지금 잠깐만 들여다보자.",
    cta: "지금 볼래",
  },
  E: {
    quote: "시험 생각만 하면\n마음이 빨라질 때가 있지.\n그 속도, 같이 재볼게.",
    cta: "같이 재보자",
  },
};

/**
 * 검사 몰입 인트로 — 청월당식 캐릭터 스토리텔링 게이트 (전 검사 공통)
 * (docs/design/DESIGN-TEMPLATES.md 레퍼런스 A · CHITO-STORY-SCENARIO.md 여정 1)
 */
export default function TestIntroGate({
  testName,
  isIntegrated,
  questionCount,
  durationMinutes,
  category,
  onComplete,
}: TestIntroGateProps) {
  const [step, setStep] = useState(0);
  const [leaving, setLeaving] = useState(false);

  const opening = category ? CATEGORY_OPENINGS[category] : undefined;

  const steps: IntroStep[] = isIntegrated
    ? [
        {
          quote: "안녕, 나는 치토야.\n시작하기 전에… 요즘 마음이 어떤지\n물어봐도 될까?",
          cta: "응, 좋아",
        },
        {
          quote: `딱 ${durationMinutes}분이면 돼.\n${questionCount}문항에 솔직하게 답할수록\n네 마음을 더 정확하게 볼 수 있어.`,
          cta: "내 마음 확인해볼래",
        },
      ]
    : [
        opening
          ? { quote: opening.quote, cta: opening.cta }
          : {
              quote: `이번엔 「${testName}」구나.\n같이 차분하게 들여다보자.`,
              cta: "응, 좋아",
            },
        {
          quote: `「${testName}」 — ${questionCount}문항,\n약 ${durationMinutes}분이면 돼.\n정답은 없어. 지금 느끼는 그대로면 충분해.`,
          cta: "좋아, 시작할게",
        },
      ];

  const finish = () => {
    setLeaving(true);
    setTimeout(onComplete, 300);
  };

  const handleCta = () => {
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
    } else {
      void track("test_intro_completed", { is_integrated: isIntegrated });
      finish();
    }
  };

  const handleSkip = () => {
    void track("test_intro_skipped", { step, is_integrated: isIntegrated });
    finish();
  };

  const current = steps[step];

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#0c0e18] flex flex-col items-center justify-center px-6 transition-opacity duration-300 ${
        leaving ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* 보라 radial 글로우 */}
      <div
        className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]"
        style={{
          background: "radial-gradient(circle at center, rgba(100,102,241,0.25) 0%, transparent 65%)",
        }}
      />

      {/* 건너뛰기 */}
      <button
        onClick={handleSkip}
        className="absolute top-5 right-5 text-white/40 hover:text-white/70 text-sm font-medium transition-colors"
      >
        건너뛰기
      </button>

      <div className="relative z-10 flex flex-col items-center max-w-md w-full text-center animate-fade-in" key={step}>
        {/* 치토 일러 */}
        <div className="w-44 h-44 md:w-52 md:h-52 rounded-[2rem] overflow-hidden mb-8 shadow-[0_0_60px_rgba(100,102,241,0.35)] animate-chito-float">
          <img src={CHITO_MAIN_URL} alt="치토" className="w-full h-full object-cover" loading="eager" />
        </div>

        {/* 인용 대사 */}
        <p className="text-white text-lg md:text-xl leading-[1.7] font-medium whitespace-pre-line mb-10">
          “{current.quote}”
        </p>

        {/* 발광 CTA — 대화형 레이블 */}
        <button
          onClick={handleCta}
          className="w-full max-w-xs h-12 rounded-lg bg-gradient-to-r from-[#E4E5FF] to-white text-[#2A2D8F] text-lg font-semibold shadow-[0_0_20px_rgba(164,166,255,0.35)] hover:shadow-[0_0_30px_rgba(164,166,255,0.5)] active:scale-[0.98] transition-all"
        >
          {current.cta}
        </button>

        {/* 스텝 인디케이터 */}
        <div className="flex gap-1.5 mt-6">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === step ? "bg-white/80" : "bg-white/25"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
