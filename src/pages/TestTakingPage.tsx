import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

interface Question {
  id: number;
  text: string;
}

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
  const [testName, setTestName] = useState("");
  const [subAreas, setSubAreas] = useState<string[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(180); // 3 min
  const [timerExpired, setTimerExpired] = useState(false);

  useEffect(() => {
    const fetchTest = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from("tests")
        .select("name, questions, sub_areas")
        .eq("id", id)
        .single();

      if (!error && data) {
        setTestName(data.name);
        setQuestions(data.questions as unknown as Question[]);
        setSubAreas(data.sub_areas as unknown as string[]);
      }
      setLoading(false);
    };
    fetchTest();
  }, [id]);

  // Timer
  useEffect(() => {
    if (timerExpired || loading) return;
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
  }, [timerExpired, loading]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleSelect = (score: number) => {
    setAnswers((prev) => ({ ...prev, [current]: score }));
  };

  const progress = questions.length > 0 ? ((current + 1) / questions.length) * 100 : 0;
  const isLastQuestion = current === questions.length - 1;
  const allAnswered = questions.length > 0 && Object.keys(answers).length === questions.length;

  const handleSubmit = useCallback(async () => {
    if (!id) return;

    // Calculate sub-area scores (5 questions per sub-area)
    const questionsPerArea = Math.ceil(questions.length / subAreas.length);
    const scores: Record<string, number> = {};
    subAreas.forEach((area, areaIndex) => {
      let areaScore = 0;
      for (let i = 0; i < questionsPerArea; i++) {
        const qIndex = areaIndex * questionsPerArea + i;
        if (answers[qIndex]) areaScore += answers[qIndex];
      }
      scores[area] = areaScore;
    });

    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);

    // Try to save (will fail if not logged in due to RLS, but we still navigate)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("test_results").insert({
        user_id: user.id,
        test_id: id,
        answers: Object.entries(answers).map(([q, a]) => ({ question: Number(q), answer: a })),
        scores,
        total_score: totalScore,
      });
    }

    // Navigate with state for results page
    navigate(`/results/${id}`, {
      state: { scores, totalScore, testName, subAreas },
    });
  }, [id, answers, questions, subAreas, testName, navigate]);

  if (loading) {
    return <div className="h-64 rounded-2xl bg-muted animate-pulse" />;
  }

  if (questions.length === 0) {
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
        <h1 className="text-lg font-bold truncate pr-4">{testName}</h1>
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
          <span>{current + 1} / {questions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2 rounded-full" />
      </div>

      {/* Question */}
      <Card className="p-6 rounded-2xl border-border/50 shadow-sm">
        <p className="text-base font-medium leading-relaxed mb-6">
          Q{current + 1}. {questions[current].text}
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
                    ? "gradient-primary text-primary-foreground border-transparent shadow-md"
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
