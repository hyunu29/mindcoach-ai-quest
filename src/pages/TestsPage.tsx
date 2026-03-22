import { Card } from "@/components/ui/card";
import { ClipboardCheck, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const tests = [
  { id: "1", name: "시험 불안 척도", desc: "시험과 관련된 불안 수준을 측정합니다.", questions: 20 },
  { id: "2", name: "학업 스트레스 검사", desc: "학업으로 인한 스트레스 정도를 파악합니다.", questions: 25 },
  { id: "3", name: "자존감 검사", desc: "자신에 대한 전반적인 평가와 자존감 수준을 측정합니다.", questions: 10 },
  { id: "4", name: "우울 선별 검사", desc: "우울감의 정도를 간편하게 선별합니다.", questions: 9 },
  { id: "5", name: "시간 관리 능력 검사", desc: "효율적인 시간 활용 능력을 평가합니다.", questions: 15 },
  { id: "6", name: "학습 동기 검사", desc: "학습에 대한 내·외적 동기를 분석합니다.", questions: 18 },
];

export default function TestsPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 animate-reveal-up">
      <h1 className="text-2xl font-bold">심리검사 목록</h1>
      <p className="text-sm text-muted-foreground mb-4">나에게 맞는 검사를 선택해 보세요.</p>
      {tests.map((test) => (
        <Card
          key={test.id}
          className="p-4 rounded-2xl border-border/50 shadow-sm cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
          onClick={() => navigate(`/tests/${test.id}`)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{test.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{test.desc}</div>
              <div className="text-xs text-muted-foreground mt-1">{test.questions}문항</div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </div>
        </Card>
      ))}
    </div>
  );
}
