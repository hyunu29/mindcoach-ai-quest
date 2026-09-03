import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Clock, ArrowLeft, Loader2 } from "lucide-react";
import { getRiskLevel } from "@/data/seed-data";
import { scoreIntegratedTest } from "@/lib/integrated-test-scoring";
import { toast } from "sonner";
import { TestAccessGate } from "@/components/payment/TestAccessGate";
import TestIntroGate from "@/components/tests/TestIntroGate";
import { CHITO_MAIN_URL, CHITO_EMBLEM_URL } from "@/lib/character/chito";
import { track } from "@/lib/analytics";
import { isFreeTest } from "@/lib/payments/free-tests";

const DEFAULT_LIKERT_LABELS = [
  "전혀 그렇지 않다",
  "그렇지 않다",
  "보통이다",
  "그렇다",
  "매우 그렇다",
];

interface QuestionItem {
  id: number;
  text: string;
  subdomain: string;
  subdomainEn: string;
  isReversed: boolean;
}

interface TestData {
  id: string;
  name: string;
  category: string;
  related_syndrome: string;
  description: string;
  question_count: number;
  duration_minutes: number;
  is_recommended: boolean;
  is_coming_soon: boolean;
  is_integrated?: boolean;
  likert_min?: number;
  likert_max?: number;
  likert_labels?: string[] | null;
  subdomains: string[];
  questions: QuestionItem[];
}

export default function TestTakingPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [test, setTest] = useState<TestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(180);
  const [timerExpired, setTimerExpired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const startTimeRef = useRef(Date.now());

  // Fetch test from DB
  useEffect(() => {
    if (!id) return;
    const fetchTest = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("tests")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (!error && data) {
        setTest({
          ...data,
          subdomains: (data.subdomains as string[]) || [],
          questions: (data.questions as unknown as QuestionItem[]) || [],
        });
        setTimeLeft((data.duration_minutes || 3) * 60);
        if (!data.is_coming_soon && !sessionStorage.getItem(`test-intro-seen:${data.id}`)) {
          setShowIntro(true);
        }
      }
      setLoading(false);
    };
    fetchTest();
  }, [id]);

  // test_started — fires once when test loaded successfully
  const startedRef = useRef(false);
  useEffect(() => {
    if (!test || startedRef.current || test.is_coming_soon || (test.questions || []).length === 0) return;
    startedRef.current = true;
    void track('test_started', { test_id: test.id, test_name: test.name, is_free: isFreeTest(test.id) });
  }, [test]);

  // Timer (몰입 인트로가 떠 있는 동안은 흐르지 않음)
  useEffect(() => {
    if (timerExpired || loading || !test || test.is_coming_soon || showIntro) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTimerExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerExpired, loading, test, showIntro]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const questions = test?.questions || [];
  const likertOptions = useMemo(() => {
    const min = test?.likert_min ?? 1;
    const max = test?.likert_max ?? 5;
    const labels = test?.likert_labels;
    const count = max - min + 1;
    return Array.from({ length: count }, (_, i) => ({
      score: min + i,
      label: labels?.[i] ?? DEFAULT_LIKERT_LABELS[i] ?? `${min + i}점`,
    }));
  }, [test]);
  // 선택 즉시 다음 문항으로 흘러가는 몰입 플로우 (마지막 문항 제외)
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSelect = (score: number) => {
    setAnswers((prev) => ({ ...prev, [current]: score }));
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    if (current < questions.length - 1) {
      advanceTimerRef.current = setTimeout(() => setCurrent((c) => Math.min(c + 1, questions.length - 1)), 350);
    }
  };
  useEffect(() => () => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
  }, []);

  const progress = questions.length > 0 ? ((current + 1) / questions.length) * 100 : 0;
  const isLastQuestion = current === questions.length - 1;
  const allAnswered = questions.length > 0 && Object.keys(answers).length === questions.length;

  const currentQuestion = questions[current];
  const currentSubdomain = currentQuestion?.subdomain || "";

  const handleSubmit = useCallback(async () => {
    if (!id || !test || questions.length === 0 || submitting) return;
    setSubmitting(true);

    try {
      let subdomainScores: Record<string, number> = {};
      let totalScore = 0;
      let riskLevel: "safe" | "caution" | "warning" | "danger" = "safe";
      let riskLabel = "양호";
      let recommendations: unknown = null;

      if (test.is_integrated) {
        // 통합검사 (게이트웨이): 영역별 25점 만점, ≥15점이면 후속검사 추천
        const answersArray50 = questions.map((_, i) => answers[i] ?? 3);
        const result = scoreIntegratedTest(answersArray50);
        subdomainScores = result.subdomainScores;
        totalScore = result.totalScore;
        riskLevel = result.riskLevel;
        riskLabel = result.riskLabel;
        recommendations = result.recommendations;
      } else {
        // 일반 전문검사: 20문항 / 100점 만점 기준 위험도
        const likertMin = test.likert_min ?? 1;
        const likertMax = test.likert_max ?? 5;
        const defaultAnswer = Math.floor((likertMin + likertMax) / 2);
        const subdomainMap: Record<string, { total: number; count: number }> = {};
        questions.forEach((q, i) => {
          const raw = answers[i] ?? defaultAnswer;
          const score = q.isReversed ? (likertMax + likertMin - raw) : raw;
          if (!subdomainMap[q.subdomain]) {
            subdomainMap[q.subdomain] = { total: 0, count: 0 };
          }
          subdomainMap[q.subdomain].total += score;
          subdomainMap[q.subdomain].count += 1;
        });

        for (const [key, val] of Object.entries(subdomainMap)) {
          subdomainScores[key] = val.total;
        }

        totalScore = Object.values(subdomainScores).reduce((a, b) => a + b, 0);
        const risk = getRiskLevel(totalScore);
        riskLevel = totalScore <= 40 ? "safe" : totalScore <= 60 ? "caution" : totalScore <= 80 ? "warning" : "danger";
        riskLabel = risk.level;
      }

      const answersArray = questions.map((_, i) => ({
        questionId: i + 1,
        answer: answers[i] || 0,
      }));

      const { data: { user } } = await supabase.auth.getUser();

      const resultPayload = {
        test_id: id,
        answers: answersArray as any,
        subdomain_scores: subdomainScores as any,
        total_score: totalScore,
        risk_level: riskLevel,
        risk_label: riskLabel,
        matched_syndrome: test.related_syndrome || null,
        recommendations: recommendations as any,
      };

      if (user) {
        const { data: insertedResult, error } = await supabase
          .from("test_results")
          .insert({ ...resultPayload, user_id: user.id })
          .select("id")
          .single();

        if (!error && insertedResult) {
          void track('test_completed', { test_id: id, test_name: test.name, is_free: isFreeTest(id), total_score: totalScore });
          navigate(`/results/${insertedResult.id}`);
          return;
        } else {
          console.error("Failed to save result:", error);
          toast.error("결과 저장에 실패했습니다. 임시 결과를 표시합니다.");
          navigate(`/results/temp`, {
            state: { ...resultPayload, testName: test.name, subdomains: test.subdomains },
          });
        }
      } else {
        const tempResult = { ...resultPayload, testName: test.name, subdomains: test.subdomains };
        localStorage.setItem("pendingTestResult", JSON.stringify(tempResult));
        void track('test_completed', { test_id: id, test_name: test.name, is_free: isFreeTest(id), total_score: totalScore });
        navigate(`/results/temp`, { state: tempResult });
      }
    } catch (err) {
      console.error("Submit error:", err);
      toast.error("결과 처리 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }, [id, test, answers, questions, submitting, navigate]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // Coming soon
  if (test?.is_coming_soon || !test || questions.length === 0) {
    return (
      <div className="text-center py-16 space-y-4 animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
          <Clock className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-bold">준비 중입니다</h2>
        <p className="text-sm text-muted-foreground">
          이 검사는 아직 준비 중이에요. 곧 만나볼 수 있어요!
        </p>
        <Button variant="outline" className="rounded-xl gap-1.5" onClick={() => navigate("/tests")}>
          <ArrowLeft className="w-4 h-4" />
          검사 목록으로 돌아가기
        </Button>
      </div>
    );
  }

  // 치토 마일스톤 응원 (CHITO-STORY-SCENARIO.md 검사 진행 사양)
  const milestoneMessage = (() => {
    const len = questions.length;
    if (len < 8) return null;
    if (current === Math.floor(len * 0.25)) return "잘하고 있어. 천천히 해도 돼.";
    if (current === Math.floor(len * 0.5)) return "벌써 절반이야. 솔직하게 말해줘서 고마워.";
    if (current === Math.floor(len * 0.75)) return "거의 다 왔어. 조금만 더!";
    return null;
  })();

  return (
    <TestAccessGate testSlug={test.id} testName={test.name}>
    {showIntro && (
      <TestIntroGate
        testName={test.name}
        isIntegrated={!!test.is_integrated}
        questionCount={questions.length}
        durationMinutes={test.duration_minutes || 10}
        onComplete={() => {
          sessionStorage.setItem(`test-intro-seen:${test.id}`, "1");
          setShowIntro(false);
        }}
      />
    )}

    {/* 몰입 모드 — 다크 풀스크린 (청월당식) */}
    <div className="fixed inset-0 z-40 bg-[#0c0e18] overflow-y-auto">
      {/* 보라 radial 글로우 */}
      <div
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px]"
        style={{
          background: "radial-gradient(ellipse at center top, rgba(100,102,241,0.2) 0%, transparent 65%)",
        }}
      />

      {submitting ? (
        /* 제출 씬 — "네 마음을 정리하고 있어…" */
        <div className="relative z-10 min-h-full flex flex-col items-center justify-center px-6 text-center">
          <div className="w-40 h-40 rounded-[2rem] overflow-hidden mb-8 shadow-[0_0_60px_rgba(100,102,241,0.45)] animate-glow-pulse">
            <img src={CHITO_MAIN_URL} alt="치토" className="w-full h-full object-cover" />
          </div>
          <p className="text-white text-lg font-medium leading-relaxed">
            “잠깐만, 네 마음을 정리하고 있어…”
          </p>
          <Loader2 className="w-5 h-5 animate-spin text-white/50 mt-6" />
        </div>
      ) : (
        <div className="relative z-10 max-w-md mx-auto min-h-full flex flex-col px-5 py-5">
          {/* 상단 바 */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate("/tests")}
              className="w-9 h-9 -ml-1.5 flex items-center justify-center rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="검사 목록으로"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-sm font-semibold text-white/70 truncate px-3">{test.name}</h1>
            <div className={`flex items-center gap-1 text-xs font-mono font-semibold shrink-0 ${
              timerExpired || timeLeft <= 30 ? "text-red-400" : "text-white/40"
            }`}>
              <Clock className="w-3.5 h-3.5" />
              {timerExpired ? "시간 초과" : formatTime(timeLeft)}
            </div>
          </div>

          {/* 진행바 */}
          <div className="mb-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#8B8DF7] to-[#C4B5FD] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-white/35 mb-5">
            <span>{current + 1} / {questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>

          {/* 치토 마일스톤 응원 */}
          {milestoneMessage && (
            <div className="flex items-center gap-2.5 mb-5 animate-pop-in">
              <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(164,166,255,0.4)]">
                <img src={CHITO_EMBLEM_URL} alt="" className="w-6 h-6 object-contain" />
              </span>
              <p className="text-sm text-white/70 font-medium">“{milestoneMessage}”</p>
            </div>
          )}

          {/* 문항 — 전환 애니메이션 */}
          <div key={current} className="animate-question-in flex-1 flex flex-col">
            <p className="text-[11px] text-white/35 font-medium mb-2.5">{currentSubdomain}</p>
            <p className="text-white text-lg md:text-xl font-medium leading-[1.65] mb-8">
              Q{current + 1}. {currentQuestion.text}
            </p>

            {/* Likert scale */}
            <div className="flex gap-2">
              {likertOptions.map((opt) => {
                const isSelected = answers[current] === opt.score;
                return (
                  <button
                    key={opt.score}
                    onClick={() => handleSelect(opt.score)}
                    className={`flex-1 flex flex-col items-center gap-1.5 py-3.5 px-1 rounded-xl border text-xs transition-all duration-200 active:scale-95 ${
                      isSelected
                        ? "bg-gradient-to-b from-[#E4E5FF] to-white text-[#2A2D8F] border-transparent shadow-[0_0_20px_rgba(164,166,255,0.35)] scale-[1.03]"
                        : "bg-white/[0.06] border-white/10 text-white/55 hover:bg-white/10 hover:border-white/20"
                    }`}
                  >
                    <span className="text-lg font-bold">{opt.score}</span>
                    <span className="leading-tight text-center text-[10px] md:text-xs">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 내비게이션 */}
          <div className="flex gap-3 mt-8 pb-2">
            <Button
              variant="ghost"
              className="flex-1 rounded-full h-12 text-white/50 hover:text-white hover:bg-white/10 disabled:text-white/20"
              disabled={current === 0}
              onClick={() => setCurrent((c) => c - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              이전
            </Button>

            {isLastQuestion ? (
              <Button
                className="flex-1 rounded-full h-12 bg-gradient-to-r from-[#E4E5FF] to-white text-[#2A2D8F] font-semibold shadow-[0_0_20px_rgba(164,166,255,0.35)] hover:shadow-[0_0_30px_rgba(164,166,255,0.5)] hover:from-[#E4E5FF] hover:to-white disabled:opacity-40"
                disabled={!allAnswered || submitting}
                onClick={handleSubmit}
              >
                결과 보기
              </Button>
            ) : (
              <Button
                className="flex-1 rounded-full h-12 bg-white/10 text-white/80 font-semibold hover:bg-white/15 disabled:opacity-40"
                disabled={answers[current] === undefined}
                onClick={() => setCurrent((c) => c + 1)}
              >
                다음
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
    </TestAccessGate>
  );
}
