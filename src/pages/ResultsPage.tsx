import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export default function ResultsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-reveal-up">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-accent" />
        </div>
        <h1 className="text-2xl font-bold mb-1">검사 완료!</h1>
        <p className="text-sm text-muted-foreground">결과를 분석했습니다.</p>
      </div>

      <Card className="p-5 rounded-2xl border-border/50 shadow-sm">
        <h2 className="font-bold mb-2">종합 결과</h2>
        <div className="text-center py-6">
          <div className="text-4xl font-extrabold gradient-text mb-2">보통</div>
          <p className="text-sm text-muted-foreground">
            전반적으로 안정적인 상태이나, 일부 영역에서 관리가 필요합니다.
          </p>
        </div>
      </Card>

      <Card className="p-5 rounded-2xl border-border/50 shadow-sm">
        <h2 className="font-bold mb-3">AI 분석 코멘트</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          시험과 관련된 불안 수준은 평균 범위에 있습니다. 시험 전 적절한 준비 루틴을 만들고,
          호흡법이나 간단한 이완 기법을 활용하면 더욱 안정적인 상태를 유지할 수 있어요.
          AI 코칭을 통해 구체적인 전략을 알아보세요.
        </p>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 rounded-xl" onClick={() => navigate("/tests")}>
          다른 검사 하기
        </Button>
        <Button variant="hero" className="flex-1 rounded-xl" onClick={() => navigate("/coaching")}>
          AI 코칭 받기
        </Button>
      </div>
    </div>
  );
}
