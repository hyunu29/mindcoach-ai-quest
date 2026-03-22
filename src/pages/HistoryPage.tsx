import { Card } from "@/components/ui/card";
import { ClipboardCheck, Calendar } from "lucide-react";

const history = [
  { date: "2026-03-20", test: "시험 불안 척도", result: "보통" },
  { date: "2026-03-15", test: "학업 스트레스 검사", result: "주의" },
  { date: "2026-03-10", test: "자존감 검사", result: "양호" },
];

export default function HistoryPage() {
  return (
    <div className="space-y-4 animate-reveal-up">
      <h1 className="text-2xl font-bold">내 기록</h1>
      <p className="text-sm text-muted-foreground mb-2">지금까지의 검사 및 코칭 기록입니다.</p>

      {history.map((h, i) => (
        <Card key={i} className="p-4 rounded-2xl border-border/50 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">{h.test}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Calendar className="w-3 h-3" />
                {h.date}
              </div>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              h.result === "양호" ? "bg-accent/10 text-accent" :
              h.result === "주의" ? "bg-warning/10 text-warning" :
              "bg-primary/10 text-primary"
            }`}>
              {h.result}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}
