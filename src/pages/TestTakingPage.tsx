import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";

const sampleQuestions = [
  "시험이 다가오면 긴장이 되어 집중하기 어렵다.",
  "시험 준비를 충분히 해도 불안감이 사라지지 않는다.",
  "시험 결과가 나쁠까 봐 걱정이 많다.",
  "시험 중 갑자기 머리가 하얘지는 경험을 한 적이 있다.",
  "시험 기간에는 잠을 잘 못 잔다.",
];

const options = ["전혀 아니다", "조금 그렇다", "보통이다", "꽤 그렇다", "매우 그렇다"];

export default function TestTakingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);

  const progress = ((current + 1) / sampleQuestions.length) * 100;

  const handleAnswer = (score: number) => {
    const next = [...answers, score];
    setAnswers(next);
    if (current < sampleQuestions.length - 1) {
      setCurrent(current + 1);
    } else {
      navigate(`/results/${id}`);
    }
  };

  return (
    <div className="space-y-6 animate-reveal-up">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground font-medium">
            {current + 1} / {sampleQuestions.length}
          </span>
          <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2 rounded-full" />
      </div>

      <Card className="p-6 rounded-2xl border-border/50 shadow-sm">
        <p className="text-base font-medium leading-relaxed mb-6">
          {sampleQuestions[current]}
        </p>
        <div className="space-y-2">
          {options.map((opt, i) => (
            <button
              key={opt}
              onClick={() => handleAnswer(i + 1)}
              className="w-full text-left px-4 py-3 rounded-xl border border-border/50 text-sm hover:bg-primary/5 hover:border-primary/30 transition-all active:scale-[0.98]"
            >
              {opt}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
