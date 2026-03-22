import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, ClipboardCheck, TrendingUp, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const emotions = [
  { emoji: "😊", label: "좋아요" },
  { emoji: "😐", label: "보통이에요" },
  { emoji: "😢", label: "슬퍼요" },
  { emoji: "😤", label: "화나요" },
  { emoji: "😰", label: "불안해요" },
];

const weekData = [
  { day: "월", score: 4 },
  { day: "화", score: 3 },
  { day: "수", score: 3 },
  { day: "목", score: 5 },
  { day: "금", score: 4 },
  { day: "토", score: 4 },
  { day: "일", score: 3 },
];

export default function DashboardPage() {
  const [selectedEmotion, setSelectedEmotion] = useState<number | null>(null);
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-reveal-up">
      {/* Emotion Picker */}
      <Card className="p-5 rounded-2xl border-border/50 shadow-sm">
        <h2 className="font-bold mb-3">오늘의 감정은 어떤가요?</h2>
        <div className="flex gap-3 justify-center">
          {emotions.map((e, i) => (
            <button
              key={e.label}
              onClick={() => setSelectedEmotion(i)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 active:scale-95 ${
                selectedEmotion === i
                  ? "bg-primary/10 ring-2 ring-primary/30"
                  : "hover:bg-muted"
              }`}
            >
              <span className="text-2xl">{e.emoji}</span>
              <span className="text-[10px] text-muted-foreground">{e.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Card
          className="p-4 rounded-2xl border-border/50 shadow-sm cursor-pointer hover:shadow-md transition-shadow active:scale-[0.97]"
          onClick={() => navigate("/tests")}
        >
          <ClipboardCheck className="w-8 h-8 text-primary mb-2" />
          <div className="font-semibold text-sm">심리검사 하기</div>
          <div className="text-xs text-muted-foreground mt-0.5">26종 전문 검사</div>
        </Card>
        <Card
          className="p-4 rounded-2xl border-border/50 shadow-sm cursor-pointer hover:shadow-md transition-shadow active:scale-[0.97]"
          onClick={() => navigate("/coaching")}
        >
          <MessageCircle className="w-8 h-8 text-secondary mb-2" />
          <div className="font-semibold text-sm">AI 코칭</div>
          <div className="text-xs text-muted-foreground mt-0.5">1:1 맞춤 상담</div>
        </Card>
      </div>

      {/* Recent Result */}
      <Card className="p-5 rounded-2xl border-border/50 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">최근 검사 결과</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/history")}>
            전체보기
          </Button>
        </div>
        <div className="bg-muted/50 rounded-xl p-4 text-center text-sm text-muted-foreground">
          아직 검사 기록이 없어요.<br />
          <button className="text-primary font-semibold mt-1" onClick={() => navigate("/tests")}>
            첫 검사 시작하기 →
          </button>
        </div>
      </Card>

      {/* Weekly Chart */}
      <Card className="p-5 rounded-2xl border-border/50 shadow-sm">
        <h2 className="font-bold mb-3">주간 감정 추이</h2>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weekData}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis hide domain={[1, 5]} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="hsl(239 84% 67%)"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "hsl(239 84% 67%)" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Recommended */}
      <Card className="p-5 rounded-2xl border-border/50 shadow-sm">
        <h2 className="font-bold mb-3">추천 검사</h2>
        <div className="flex gap-2 flex-wrap">
          {["시험 불안 척도", "학업 스트레스", "자존감 검사"].map((t) => (
            <button
              key={t}
              className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors active:scale-95"
              onClick={() => navigate("/tests")}
            >
              <Star className="w-3 h-3" />
              {t}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
