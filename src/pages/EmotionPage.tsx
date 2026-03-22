import { useState } from "react";
import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const emotions = [
  { emoji: "😊", label: "좋아요", value: 5 },
  { emoji: "😐", label: "보통", value: 3 },
  { emoji: "😢", label: "슬퍼요", value: 2 },
  { emoji: "😤", label: "화나요", value: 1 },
  { emoji: "😰", label: "불안해요", value: 1 },
];

const monthData = [
  { date: "3/1", score: 4 }, { date: "3/5", score: 3 }, { date: "3/8", score: 5 },
  { date: "3/10", score: 3 }, { date: "3/12", score: 4 }, { date: "3/15", score: 2 },
  { date: "3/18", score: 4 }, { date: "3/20", score: 5 }, { date: "3/22", score: 4 },
];

export default function EmotionPage() {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <div className="space-y-6 animate-reveal-up">
      <h1 className="text-2xl font-bold">감정 트래킹</h1>

      <Card className="p-5 rounded-2xl border-border/50 shadow-sm">
        <h2 className="font-bold mb-3">오늘의 감정 기록</h2>
        <div className="flex gap-3 justify-center">
          {emotions.map((e, i) => (
            <button
              key={e.label}
              onClick={() => setSelected(i)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all active:scale-95 ${
                selected === i ? "bg-primary/10 ring-2 ring-primary/30" : "hover:bg-muted"
              }`}
            >
              <span className="text-3xl">{e.emoji}</span>
              <span className="text-xs text-muted-foreground">{e.label}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5 rounded-2xl border-border/50 shadow-sm">
        <h2 className="font-bold mb-4">월간 감정 추이</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthData}>
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <YAxis hide domain={[1, 5]} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
              <Line type="monotone" dataKey="score" stroke="hsl(239 84% 67%)" strokeWidth={2.5} dot={{ r: 3.5, fill: "hsl(239 84% 67%)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
