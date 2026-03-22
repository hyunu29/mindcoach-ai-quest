import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { testList, testQuestions, getRiskLevel, syndromeMatchMap } from "@/data/seed-data";

const likertOptions = [
  { score: 1, label: "전혀 그렇지 않다" },
  { score: 2, label: "그렇지 않다" },
  { score: 3, label: "보통이다" },
  { score: 4, label: "그렇다" },
  { score: 5, label: "매우 그렇다" },
];

export default function TestTakingPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const test = testList.find((t) => t.id === id);
  const questionGroups = id ? testQuestions[id] : undefined;

  // Flatten questions
  const allQuestions = questionGroups
    ? questionGroups.flatMap((g, gi) =>
        g.questions.map((q, qi) => ({
          text: q,
          subdomain: g.subdomain,
          index: gi * 5 + qi,
          isReversed: g.subdomain.includes("[역문항]"),
        }))
      )
    : [];

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(180);
  const [timerExpired, setTimerExpired] = useState(false);
  const startTimeRef = useRef(Date.now());

  // Timer
  useEffect(() => {
    if (timerExpired) return;
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
  }, [timerExpired]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleSelect = (score: number) => {
    setAnswers((prev) => ({ ...prev, [current]: score }));
  };

  const progress = allQuestions.length > 0 ? ((current + 1) / allQuestions.length) * 100 : 0;
  const isLastQuestion = current === allQuestions.length - 1;
  const allAnswered = allQuestions.length > 0 && Object.keys(answers).length === allQuestions.length;

  // Current subdomain label
  const currentSubdomain = allQuestions[current]?.subdomain || "";

  const handleSubmit = useCallback(async () => {
    if (!id || !questionGroups || !test) return;

    const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);

    // Calculate subdomain scores
    const subdomainScores: Record<string, number> = {};
    let qIndex = 0;
    for (const group of questionGroups) {
      let groupScore = 0;
      for (let i = 0; i < group.questions.length; i++) {
        const raw = answers[qIndex] || 3;
        const isReversed = group.subdomain.includes("[역문항]");
        groupScore += isReversed ? (6 - raw) : raw;
        qIndex++;
      }
      subdomainScores[group.subdomain] = groupScore;
    }

    const totalScore = Object.values(subdomainScores).reduce((a, b) => a + b, 0);
    const risk = getRiskLevel(totalScore);
    const matchedSyndromes = syndromeMatchMap
      .filter((s) => s.relatedTests.includes(id))
      .map((s) => s.id);

    const answersArray = Array.from({ length: allQuestions.length }, (_, i) => answers[i] || 0);

    // Try to save to DB
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("test_results").insert({
        user_id: user.id,
        test_id: id,
        answers: answersArray as any,
        scores: subdomainScores as any,
        total_score: totalScore,
      });
    }

    navigate(`/results/${id}`, {
      state: {
        subdomainScores,
        totalScore,
        testName: test.name,
        subdomains: test.subdomains,
        matchedSyndromes,
        durationSeconds,
        answersArray,
      },
    });
  }, [id, answers, questionGroups, test, allQuestions.length, navigate]);

  if (!test || !questionGroups) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        검사 데이터를 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold truncate pr-4">{test.name}</h1>
        <div className={`flex items-center gap-1.5 text-sm font-mono font-semibold shrink-0 ${
          timerExpired ? "text-destructive" : timeLeft <= 30 ? "text-warning" : "text-muted-foreground"
        }`}>
          <Clock className="w-4 h-4" />
          {timerExpired ? "시간 초과" : formatTime(timeLeft)}
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between mb-1.5 text-xs text-muted-foreground">
          <span>{current + 1} / {allQuestions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2 rounded-full" />
      </div>

      {/* Question */}
      <Card className="p-6 rounded-2xl border-border/50 shadow-sm">
        {/* Subdomain label */}
        <p className="text-xs text-muted-foreground mb-3 font-medium">
          {currentSubdomain}
        </p>

        <p className="text-base font-medium leading-relaxed mb-6">
          Q{current + 1}. {allQuestions[current].text}
        </p>

        {/* Likert scale */}
        <div className="flex gap-2">
          {likertOptions.map((opt) => {
            const isSelected = answers[current] === opt.score;
            return (
              <button
                key={opt.score}
                onClick={() => handleSelect(opt.score)}
                className={`flex-1 flex flex-col items-center gap-1.5 py-3 md:py-3 px-1 rounded-xl border text-xs transition-all duration-200 active:scale-95 ${
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
            variant="hero"
            className="flex-1 rounded-xl"
            disabled={!allAnswered}
            onClick={handleSubmit}
          >
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
  );
}
