import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Clock, ArrowLeft, Loader2 } from "lucide-react";
import { getRiskLevel } from "@/data/seed-data";
import { scoreIntegratedTest } from "@/lib/integrated-test-scoring";
import { toast } from "sonner";
import { TestAccessGate } from "@/components/payment/TestAccessGate";
import IntIntroGate from "@/components/tests/IntIntroGate";
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
        if (data.is_integrated && !data.is_coming_soon && !sessionStorage.getItem("int-intro-seen")) {
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
  const handleSelect = (score: number) => {
    setAnswers((prev) => ({ ...prev, [current]: score }));
  };

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

  return (
    <TestAccessGate testSlug={test.id} testName={test.name}>
    {showIntro && (
      <IntIntroGate
        questionCount={questions.length}
        durationMinutes={test.duration_minutes || 10}
        onComplete={() => {
          sessionStorage.setItem("int-intro-seen", "1");
          setShowIntro(false);
        }}
      />
    )}
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold truncate pr-4">{test.name}</h1>
        <div className={`flex items-center gap-1.5 text-sm font-mono font-semibold shrink-0 ${
          timerExpired ? "text-destructive" : timeLeft <= 30 ? "text-destructive" : "text-muted-foreground"
        }`}>
          <Clock className="w-4 h-4" />
          {timerExpired ? "시간 초과" : formatTime(timeLeft)}
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between mb-1.5 text-xs text-muted-foreground">
          <span>{current + 1} / {questions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2 rounded-full" />
      </div>

      {/* Question */}
      <Card className="p-6 rounded-2xl border-border/50 shadow-sm">
        <p className="text-xs text-muted-foreground mb-3 font-medium">
          {currentSubdomain}
        </p>
        <p className="text-base font-medium leading-relaxed mb-6">
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
                className={`flex-1 flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border text-xs transition-all duration-200 active:scale-95 ${
                  isSelected
                    ? "gradient-primary text-primary-foreground border-transparent shadow-md scale-[1.02]"
                    : "border-border/50 text-muted-foreground hover:border-primary/30 hover:bg-primary/5"
                }`}
              >
                <span className="text-lg font-bold">{opt.score}</span>
                <span className="leading-tight text-center text-[10px] md:text-xs">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Navigation */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1 rounded-xl"
          disabled={current === 0}
          onClick={() => setCurrent((c) => c - 1)}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          이전
        </Button>

        {isLastQuestion ? (
          <Button
            className="flex-1 rounded-xl gradient-primary text-primary-foreground"
            disabled={!allAnswered || submitting}
            onClick={handleSubmit}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            결과 보기
          </Button>
        ) : (
          <Button
            variant="default"
            className="flex-1 rounded-xl"
            onClick={() => setCurrent((c) => c + 1)}
          >
            다음
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
    </TestAccessGate>
  );
}
