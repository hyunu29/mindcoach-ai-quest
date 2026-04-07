/* ─── Emotion History Components ───────────────────── */
import { useMemo, useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell,
} from "recharts";
import { MessageCircle, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { emotionOptions, emotionEmojiMap, type PrimaryEmotion } from "@/lib/emotion-agent-types";

interface EmotionHistoryProps {
  userId: string;
  refreshKey: number;
}

const PIE_COLORS = ['#22c55e', '#60a5fa', '#a3a3a3', '#a78bfa', '#f472b6', '#c084fc'];

export default function EmotionHistory({ userId, refreshKey }: EmotionHistoryProps) {
  const navigate = useNavigate();
  const [records, setRecords] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [streak, setStreak] = useState<{ current: number; longest: number }>({ current: 0, longest: 0 });

  // Load records
  const loadData = useCallback(async () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const start = new Date(year, month, 1).toISOString();
    const end = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

    const { data } = await supabase
      .from('emotion_records')
      .select('*')
      .eq('user_id', userId)
      .gte('recorded_at', start)
      .lte('recorded_at', end)
      .order('recorded_at', { ascending: false });

    setRecords(data || []);

    const { data: streakData } = await supabase
      .from('emotion_streaks')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (streakData) {
      setStreak({ current: streakData.current_streak, longest: streakData.longest_streak });
    }
  }, [userId, currentMonth]);

  useEffect(() => { loadData(); }, [loadData, refreshKey]);

  // Group records by date
  const recordsByDate = useMemo(() => {
    const map: Record<string, any> = {};
    records.forEach(r => {
      const key = r.recorded_at.split('T')[0];
      if (!map[key]) map[key] = r;
    });
    return map;
  }, [records]);

  // Calendar logic
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const todayKey = useMemo(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }, []);

  // Weekly data (last 7 days)
  const weeklyData = useMemo(() => {
    const result: { day: string; score: number; emoji: string }[] = [];
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const record = recordsByDate[key];
      result.push({
        day: dayNames[d.getDay()],
        score: record?.emotion_score ?? 3,
        emoji: record ? (emotionEmojiMap[record.primary_emotion as PrimaryEmotion] || '😐') : '',
      });
    }
    return result;
  }, [recordsByDate]);

  // Weekly emotion distribution for pie chart
  const weeklyDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    records.forEach(r => {
      const date = new Date(r.recorded_at);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) {
        const emotion = r.primary_emotion;
        counts[emotion] = (counts[emotion] || 0) + 1;
      }
    });
    return emotionOptions
      .filter(e => counts[e.key])
      .map(e => ({ name: `${e.emoji} ${e.label}`, value: counts[e.key] || 0, key: e.key }));
  }, [records]);

  // Weekly insight
  const weeklyInsight = useMemo(() => {
    const counts: Record<string, number> = {};
    weeklyData.forEach(d => {
      if (d.emoji) counts[d.emoji] = (counts[d.emoji] || 0) + 1;
    });
    let maxEmoji = '😐', maxCount = 0;
    Object.entries(counts).forEach(([emoji, count]) => {
      if (count > maxCount) { maxEmoji = emoji; maxCount = count; }
    });
    const opt = emotionOptions.find(e => e.emoji === maxEmoji);
    return { emoji: maxEmoji, label: opt?.label || '보통이에요', count: maxCount, key: opt?.key || 'neutral' };
  }, [weeklyData]);

  const getInsightText = () => {
    const k = weeklyInsight.key;
    if (k === 'anxious' || k === 'sad') return "이번 주는 힘든 감정이 많았어요. AI 코칭을 통해 마음을 정리해볼까요?";
    if (k === 'angry') return "짜증이 잦은 한 주였군요. 스트레스 원인을 파악하고 해소법을 찾아보는 게 좋겠어요.";
    if (k === 'happy') return "긍정적인 감정이 많은 한 주였어요! 지금의 좋은 컨디션을 유지해 보세요. 😊";
    return "균형 잡힌 한 주를 보내고 있어요. 꾸준한 감정 기록이 자기 이해의 첫걸음이에요.";
  };

  return (
    <div className="space-y-4">
      {/* Streak */}
      {streak.current > 0 && (
        <div className="flex items-center justify-center gap-2 py-2">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-semibold">{streak.current}일 연속 기록 중!</span>
          {streak.longest > streak.current && (
            <span className="text-xs text-muted-foreground">(최장 {streak.longest}일)</span>
          )}
        </div>
      )}

      {/* Calendar */}
      <Card className="p-4 rounded-2xl border-border/50 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="text-muted-foreground hover:text-foreground p-1 active:scale-95">◀</button>
          <h3 className="font-bold text-sm">{year}년 {month + 1}월</h3>
          <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="text-muted-foreground hover:text-foreground p-1 active:scale-95">▶</button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {['일', '월', '화', '수', '목', '금', '토'].map(d => (
            <div key={d} className="text-center text-[10px] text-muted-foreground font-medium py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            if (day === null) return <div key={`e-${i}`} />;
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const record = recordsByDate[dateKey];
            const isToday = dateKey === todayKey;
            const emoji = record ? (emotionEmojiMap[record.primary_emotion as PrimaryEmotion] || '😐') : null;

            return (
              <Popover key={dateKey}>
                <PopoverTrigger asChild>
                  <button className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-colors ${isToday ? 'ring-2 ring-primary/30' : ''} ${record ? 'hover:bg-muted' : 'text-muted-foreground'}`}>
                    <span className={`text-[10px] ${isToday ? 'font-bold text-primary' : ''}`}>{day}</span>
                    {emoji && <span className="text-sm leading-none mt-0.5">{emoji}</span>}
                  </button>
                </PopoverTrigger>
                {record && (
                  <PopoverContent className="w-64 p-3 rounded-xl" align="center">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{emoji}</span>
                        <div>
                          <p className="text-sm font-medium">
                            {emotionOptions.find(e => e.key === record.primary_emotion)?.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{month + 1}월 {day}일</p>
                        </div>
                      </div>
                      {(record.secondary_emotions as string[])?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {(record.secondary_emotions as string[]).map((s: string) => (
                            <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">{s}</Badge>
                          ))}
                        </div>
                      )}
                      {record.situation && <p className="text-xs text-muted-foreground italic">"{record.situation}"</p>}
                      {record.ai_comment && (
                        <p className="text-[10px] text-muted-foreground bg-muted/50 rounded-lg p-2">💡 {record.ai_comment}</p>
                      )}
                    </div>
                  </PopoverContent>
                )}
              </Popover>
            );
          })}
        </div>
      </Card>

      {/* Weekly Report */}
      <Card className="p-4 rounded-2xl border-border/50 shadow-sm">
        <h3 className="font-bold mb-1">주간 리포트</h3>
        <p className="text-xs text-muted-foreground mb-3">지난 7일간의 감정 변화</p>

        <div className="h-36 mb-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyData}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <YAxis hide domain={[0, 6]} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                formatter={(value: number) => {
                  const opt = emotionOptions.find(e => e.score === value);
                  return [opt ? `${opt.emoji} ${opt.label}` : value, '감정'];
                }}
              />
              <Line type="monotone" dataKey="score" stroke="hsl(239, 84%, 67%)" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(239, 84%, 67%)' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        {weeklyDistribution.length > 0 && (
          <div className="h-32 mb-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={weeklyDistribution} cx="50%" cy="50%" innerRadius={30} outerRadius={50} paddingAngle={3} dataKey="value" label={({ name }) => name}>
                  {weeklyDistribution.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="bg-muted/50 rounded-xl p-3 mb-3">
          <p className="text-sm font-medium">
            이번 주 가장 많은 감정: {weeklyInsight.emoji}{' '}
            <span className="text-muted-foreground">{weeklyInsight.label} ({weeklyInsight.count}회)</span>
          </p>
        </div>

        <div className="bg-secondary/5 border border-secondary/15 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <Badge className="gradient-primary text-primary-foreground text-[10px] px-2 py-0.5 border-0 shrink-0 mt-0.5">AI 인사이트</Badge>
            <p className="text-xs text-muted-foreground leading-relaxed">{getInsightText()}</p>
          </div>
          {(weeklyInsight.key === 'anxious' || weeklyInsight.key === 'sad') && (
            <Button variant="ghost" size="sm" className="mt-2 text-primary text-xs" onClick={() => navigate('/coaching')}>
              <MessageCircle className="w-3.5 h-3.5 mr-1" /> AI 코칭 시작하기
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
