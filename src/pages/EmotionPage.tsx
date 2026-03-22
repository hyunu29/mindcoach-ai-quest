import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Check, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

/* ─── Emotion definitions ────────────────────────── */

const emotionOptions = [
  { emoji: "😊", label: "좋아요", score: 5 },
  { emoji: "😐", label: "보통이에요", score: 3 },
  { emoji: "😢", label: "우울해요", score: 2 },
  { emoji: "😤", label: "짜증나요", score: 1 },
  { emoji: "😰", label: "불안해요", score: 1 },
];

/* ─── 2 weeks of dummy data ──────────────────────── */

function generateDummyData() {
  const data: Record<string, { emoji: string; score: number; memo: string }> = {};
  const emojis = ["😊", "😐", "😢", "😤", "😰"];
  const scores = [5, 3, 2, 1, 1];
  const memos = [
    "오늘 시험 잘 봤다!",
    "그냥 평범한 하루",
    "친구랑 다퉜어...",
    "선생님한테 혼났다",
    "내일 시험인데 불안하다",
    "영어 성적이 올랐다",
    "수학 문제가 안 풀린다",
    "엄마가 칭찬해줬다",
    "잠을 못 잤다",
    "운동하니까 기분 좋다",
    "",
    "학원이 너무 힘들다",
    "친구와 맛있는 거 먹었다",
    "모의고사 망했다",
  ];

  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const idx = i % emojis.length;
    data[key] = {
      emoji: emojis[idx],
      score: scores[idx],
      memo: memos[i] || "",
    };
  }
  return data;
}

/* ─── Component ──────────────────────────────────── */

export default function EmotionPage() {
  const navigate = useNavigate();
  const [emotionData, setEmotionData] = useState(generateDummyData);
  const [selectedEmoji, setSelectedEmoji] = useState<number | null>(null);
  const [memo, setMemo] = useState("");
  const [saved, setSaved] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const todayKey = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  }, []);

  const hasTodayRecord = emotionData[todayKey] !== undefined;

  /* Save emotion via upsert */
  const handleSave = async () => {
    if (selectedEmoji === null) return;
    const opt = emotionOptions[selectedEmoji];
    const recordedDate = todayKey; // YYYY-MM-DD

    // Try upsert to Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('emotions')
        .upsert(
          {
            user_id: user.id,
            emoji: opt.emoji,
            score: opt.score,
            memo: memo || null,
            recorded_date: recordedDate,
          },
          { onConflict: 'user_id,recorded_date' }
        );
      if (error) {
        console.error('감정 저장 오류:', error);
      }
    }

    // Update local state
    setEmotionData((prev) => ({
      ...prev,
      [todayKey]: { emoji: opt.emoji, score: opt.score, memo },
    }));
    setSaved(true);
    toast({
      title: "기록 완료! 🎉",
      description: "오늘의 감정이 저장되었어요.",
    });
    setTimeout(() => setSaved(false), 2000);
  };

  /* Calendar logic */
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  /* Weekly data (last 7 days) */
  const weeklyData = useMemo(() => {
    const result: { day: string; score: number; emoji: string }[] = [];
    const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const record = emotionData[key];
      result.push({
        day: dayNames[d.getDay()],
        score: record?.score ?? 3,
        emoji: record?.emoji ?? "",
      });
    }
    return result;
  }, [emotionData]);

  /* Weekly most frequent emotion */
  const weeklyInsight = useMemo(() => {
    const counts: Record<string, number> = {};
    weeklyData.forEach((d) => {
      if (d.emoji) counts[d.emoji] = (counts[d.emoji] || 0) + 1;
    });
    let maxEmoji = "😐";
    let maxCount = 0;
    Object.entries(counts).forEach(([emoji, count]) => {
      if (count > maxCount) {
        maxEmoji = emoji;
        maxCount = count;
      }
    });
    const label = emotionOptions.find((e) => e.emoji === maxEmoji)?.label || "보통이에요";
    return { emoji: maxEmoji, label, count: maxCount };
  }, [weeklyData]);

  return (
    <div className="space-y-6 animate-reveal-up">
      <h1 className="text-2xl font-bold">감정 트래킹</h1>

      {/* ── Emotion Picker ── */}
      <Card className="p-5 rounded-2xl border-border/50 shadow-sm">
        <h2 className="font-bold mb-1">오늘의 감정을 기록해보세요</h2>
        <p className="text-xs text-muted-foreground mb-4">하루에 한 번 기록할 수 있어요.</p>

        {hasTodayRecord && selectedEmoji === null ? (
          <div className="text-center py-4">
            <span className="text-4xl">{emotionData[todayKey].emoji}</span>
            <p className="text-sm text-muted-foreground mt-2">오늘 이미 기록했어요!</p>
            {emotionData[todayKey].memo && (
              <p className="text-xs text-muted-foreground mt-1 italic">"{emotionData[todayKey].memo}"</p>
            )}
          </div>
        ) : (
          <>
            <div className="flex gap-2 justify-center mb-4">
              {emotionOptions.map((e, i) => (
                <button
                  key={e.label}
                  onClick={() => setSelectedEmoji(i)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200 active:scale-95 ${
                    selectedEmoji === i
                      ? "bg-primary/10 ring-2 ring-primary/30 scale-110"
                      : "hover:bg-muted"
                  }`}
                >
                  <span className="text-2xl md:text-3xl">{e.emoji}</span>
                  <span className="text-[10px] text-muted-foreground">{e.label}</span>
                </button>
              ))}
            </div>

            {selectedEmoji !== null && (
              <div className="space-y-3 animate-fade-in">
                <Input
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="오늘 어떤 일이 있었나요? (선택사항)"
                  className="rounded-xl"
                />
                <Button
                  variant="hero"
                  size="lg"
                  className="w-full rounded-xl"
                  onClick={handleSave}
                  disabled={saved}
                >
                  {saved ? (
                    <span className="flex items-center gap-2">
                      <Check className="w-4 h-4" /> 기록 완료!
                    </span>
                  ) : (
                    "감정 기록하기"
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* ── Calendar View ── */}
      <Card className="p-5 rounded-2xl border-border/50 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="text-muted-foreground hover:text-foreground p-1 active:scale-95">
            ◀
          </button>
          <h2 className="font-bold text-sm">
            {year}년 {month + 1}월
          </h2>
          <button onClick={nextMonth} className="text-muted-foreground hover:text-foreground p-1 active:scale-95">
            ▶
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} />;
            const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const record = emotionData[dateKey];
            const isToday = dateKey === todayKey;

            return (
              <Popover key={dateKey}>
                <PopoverTrigger asChild>
                  <button
                    className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-colors ${
                      isToday ? "ring-2 ring-primary/30" : ""
                    } ${record ? "hover:bg-muted" : "text-muted-foreground"}`}
                  >
                    <span className={`text-[10px] ${isToday ? "font-bold text-primary" : ""}`}>{day}</span>
                    {record && <span className="text-sm leading-none mt-0.5">{record.emoji}</span>}
                  </button>
                </PopoverTrigger>
                {record && (
                  <PopoverContent className="w-52 p-3 rounded-xl" align="center">
                    <div className="text-center">
                      <span className="text-2xl">{record.emoji}</span>
                      <p className="text-xs font-medium mt-1">{month + 1}월 {day}일</p>
                      {record.memo && (
                        <p className="text-xs text-muted-foreground mt-1.5 italic">"{record.memo}"</p>
                      )}
                    </div>
                  </PopoverContent>
                )}
              </Popover>
            );
          })}
        </div>
      </Card>

      {/* ── Weekly Report ── */}
      <Card className="p-5 rounded-2xl border-border/50 shadow-sm">
        <h2 className="font-bold mb-1">주간 리포트</h2>
        <p className="text-xs text-muted-foreground mb-4">지난 7일간의 감정 변화</p>

        <div className="h-40 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyData}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <YAxis hide domain={[0, 6]} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                formatter={(value: number) => {
                  const opt = emotionOptions.find((e) => e.score === value);
                  return [opt ? `${opt.emoji} ${opt.label}` : value, "감정"];
                }}
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

        <div className="bg-muted/50 rounded-xl p-3 mb-3">
          <p className="text-sm font-medium">
            이번 주 가장 많은 감정: {weeklyInsight.emoji}{" "}
            <span className="text-muted-foreground">
              {weeklyInsight.label} ({weeklyInsight.count}회)
            </span>
          </p>
        </div>

        <div className="bg-secondary/5 border border-secondary/15 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <Badge className="gradient-primary text-primary-foreground text-[10px] px-2 py-0.5 border-0 shrink-0 mt-0.5">
              AI 인사이트
            </Badge>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {weeklyInsight.emoji === "😰" || weeklyInsight.emoji === "😢"
                ? "시험이 가까워지면서 불안이 높아진 것 같아요. AI 코칭을 통해 대처법을 알아볼까요?"
                : weeklyInsight.emoji === "😤"
                ? "짜증이 잦은 한 주였군요. 스트레스 원인을 파악하고 해소법을 찾아보는 게 좋겠어요."
                : weeklyInsight.emoji === "😊"
                ? "긍정적인 감정이 많은 한 주였어요! 지금의 좋은 컨디션을 유지해 보세요. 😊"
                : "균형 잡힌 한 주를 보내고 있어요. 감정 기록을 꾸준히 이어가면 패턴을 더 잘 파악할 수 있어요."}
            </p>
          </div>
          {(weeklyInsight.emoji === "😰" || weeklyInsight.emoji === "😢") && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-primary text-xs"
              onClick={() => navigate("/coaching")}
            >
              <MessageCircle className="w-3.5 h-3.5 mr-1" />
              AI 코칭 시작하기
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
