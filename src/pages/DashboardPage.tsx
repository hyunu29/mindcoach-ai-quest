import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, ClipboardCheck, TrendingUp, Star, Loader2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useCharacter } from "@/hooks/useCharacter";
import { CharacterAvatar } from "@/components/character/CharacterAvatar";
import { CharacterSelectModal } from "@/components/character/CharacterSelectModal";
import { calculateEmotionTrend, TREND_COPY } from "@/lib/character/trend";
import { BREED_PERSONAS, type Breed } from "@/lib/character/types";
import type { PrimaryEmotion } from "@/lib/emotion-agent-types";
import { track } from "@/lib/analytics";

const emotionOptions = [
  { emoji: "😊", label: "좋아요", score: 5 },
  { emoji: "😐", label: "보통이에요", score: 4 },
  { emoji: "😢", label: "우울해요", score: 2 },
  { emoji: "😤", label: "짜증나요", score: 2 },
  { emoji: "😰", label: "불안해요", score: 1 },
];

function scoreToEmotion(score: number | null): PrimaryEmotion {
  if (score === null) return 'neutral';
  if (score >= 5) return 'happy';
  if (score === 4) return 'calm';
  if (score === 3) return 'neutral';
  if (score === 2) return 'sad';
  return 'anxious';
}

const VIEWED_HOME_KEY = 'mc_character_viewed_home_date';

export default function DashboardPage() {
  const [selectedEmotion, setSelectedEmotion] = useState<number | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [todayEmotion, setTodayEmotion] = useState<any>(null);
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [weekData, setWeekData] = useState<{ day: string; score: number | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [characterModalOpen, setCharacterModalOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    selectedBreed,
    recommendedBreed,
    changeCount,
    loading: characterLoading,
    selectCharacter,
  } = useCharacter();

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      // Profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", user.id)
        .single();

      setNickname(profile?.nickname || user.email?.split("@")[0] || null);

      // Today's emotion
      const today = new Date().toISOString().split("T")[0];
      const { data: todayEmotions } = await supabase
        .from("emotions")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", today + "T00:00:00")
        .lte("created_at", today + "T23:59:59")
        .order("created_at", { ascending: false })
        .limit(1);

      if (todayEmotions && todayEmotions.length > 0) {
        setTodayEmotion(todayEmotions[0]);
        const idx = emotionOptions.findIndex(e => e.label === todayEmotions[0].emoji || e.emoji === todayEmotions[0].emoji);
        if (idx >= 0) setSelectedEmotion(idx);
      }

      // Recent test results
      const { data: results } = await supabase
        .from("test_results")
        .select("*, tests(name, category)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);

      setRecentResults(results || []);

      // Weekly emotion data
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 6);
      const { data: weekEmotions } = await supabase
        .from("emotions")
        .select("score, created_at")
        .eq("user_id", user.id)
        .gte("created_at", weekAgo.toISOString())
        .order("created_at", { ascending: true });

      const days = ["일", "월", "화", "수", "목", "금", "토"];
      const chartData: { day: string; score: number | null }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];
        const dayEmotions = (weekEmotions || []).filter(
          (e) => e.created_at.startsWith(dateStr)
        );
        const avg = dayEmotions.length > 0
          ? Math.round(dayEmotions.reduce((s, e) => s + e.score, 0) / dayEmotions.length)
          : null;
        chartData.push({ day: days[d.getDay()], score: avg });
      }
      setWeekData(chartData);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const characterTrend = useMemo(() => {
    const scores = weekData
      .map((d) => d.score)
      .filter((s): s is number => s !== null);
    return calculateEmotionTrend(scores);
  }, [weekData]);

  const characterEmotion: PrimaryEmotion = useMemo(() => {
    if (todayEmotion?.score != null) return scoreToEmotion(todayEmotion.score);
    const recentScore = [...weekData].reverse().find((d) => d.score !== null)?.score ?? null;
    return scoreToEmotion(recentScore);
  }, [todayEmotion, weekData]);

  // character_viewed_home daily dedup
  useEffect(() => {
    if (loading || characterLoading || !selectedBreed) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const last = localStorage.getItem(VIEWED_HOME_KEY);
      if (last === today) return;
      localStorage.setItem(VIEWED_HOME_KEY, today);
      void track('character_viewed_home', {
        breed: selectedBreed,
        emotion: characterEmotion,
        trend: characterTrend,
        change_count: changeCount,
      });
    } catch {
      // localStorage unavailable - skip dedup
    }
  }, [loading, characterLoading, selectedBreed, characterEmotion, characterTrend, changeCount]);

  const handleCharacterSelect = async (breed: Breed) => {
    const source: 'recommended' | 'free' | 'changed' =
      breed === recommendedBreed
        ? 'recommended'
        : selectedBreed === null
        ? 'free'
        : 'changed';
    await selectCharacter(breed, source);
    setCharacterModalOpen(false);
  };

  const riskColor = (level: string) => {
    switch (level) {
      case "safe": return "text-green-600 bg-green-50";
      case "caution": return "text-yellow-600 bg-yellow-50";
      case "warning": return "text-orange-600 bg-orange-50";
      case "danger": return "text-red-600 bg-red-50";
      default: return "text-muted-foreground bg-muted";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-reveal-up">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold">{nickname}님, 안녕하세요! 👋</h1>
        <p className="text-sm text-muted-foreground mt-1">오늘도 마음 건강을 챙겨볼까요?</p>
      </div>

      {/* Character Hero */}
      {!characterLoading && selectedBreed && (
        <Card className="p-6 rounded-2xl border-border/50 shadow-sm text-center">
          <CharacterAvatar
            breed={selectedBreed}
            emotion={characterEmotion}
            trend={characterTrend}
            size="hero"
            className="mx-auto"
          />
          <div className="mt-3">
            <div className="font-bold">{BREED_PERSONAS[selectedBreed].koreanName}</div>
            <div className="text-sm text-muted-foreground mt-0.5">
              {TREND_COPY[characterTrend]}
            </div>
          </div>
        </Card>
      )}
      {!characterLoading && !selectedBreed && (
        <Card className="p-5 rounded-2xl border-border/50 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm">나만의 마스코트를 선택해보세요</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                통합검사를 받으면 가장 잘 맞는 마스코트를 추천드려요
              </div>
            </div>
            <Button size="sm" onClick={() => setCharacterModalOpen(true)}>
              선택
            </Button>
          </div>
        </Card>
      )}

      {/* Emotion Picker */}
      <Card className="p-5 rounded-2xl border-border/50 shadow-sm">
        <h2 className="font-bold mb-3">오늘의 감정은 어떤가요?</h2>
        {todayEmotion ? (
          <div className="text-center py-2">
            <span className="text-3xl">{emotionOptions.find(e => e.label === todayEmotion.emoji || e.emoji === todayEmotion.emoji)?.emoji || todayEmotion.emoji}</span>
            {todayEmotion.memo?.startsWith("[AI 코치]") ? (
              <div className="mt-2">
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">🤖 AI 코치가 기록</span>
                <p className="text-xs text-muted-foreground mt-1">{todayEmotion.memo.replace("[AI 코치] ", "")}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">오늘 이미 감정을 기록했어요!</p>
            )}
            <Button variant="ghost" size="sm" className="mt-1" onClick={() => navigate("/emotion")}>
              수정하기 →
            </Button>
          </div>
        ) : (
          <div className="flex gap-3 justify-center">
            {emotionOptions.map((e, i) => (
              <button
                key={e.label}
                onClick={() => {
                  setSelectedEmotion(i);
                  navigate("/emotion");
                }}
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
        )}
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

      {/* Recent Results */}
      <Card className="p-5 rounded-2xl border-border/50 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold">최근 검사 결과</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/history")}>
            전체보기
          </Button>
        </div>
        {recentResults.length === 0 ? (
          <div className="bg-muted/50 rounded-xl p-4 text-center text-sm text-muted-foreground">
            아직 검사 기록이 없어요.<br />
            <button className="text-primary font-semibold mt-1" onClick={() => navigate("/tests")}>
              첫 검사 시작하기 →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentResults.map((r) => (
              <button
                key={r.id}
                onClick={() => navigate(`/results/${r.id}`)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-left"
              >
                <div>
                  <div className="text-sm font-medium">{(r as any).tests?.name || r.test_id}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("ko-KR")}
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${riskColor(r.risk_level)}`}>
                  {r.risk_label}
                </span>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Weekly Chart */}
      <Card className="p-5 rounded-2xl border-border/50 shadow-sm">
        <h2 className="font-bold mb-3">주간 감정 추이</h2>
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weekData}>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
              <YAxis hide domain={[1, 5]} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "hsl(var(--primary))" }}
                activeDot={{ r: 6 }}
                connectNulls={false}
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

      <CharacterSelectModal
        open={characterModalOpen}
        onOpenChange={setCharacterModalOpen}
        currentBreed={selectedBreed}
        recommendedBreed={recommendedBreed}
        onSelect={handleCharacterSelect}
      />
    </div>
  );
}
