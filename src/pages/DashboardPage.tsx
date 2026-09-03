import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle, ClipboardCheck, TrendingUp, Star, Loader2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CharacterAvatar } from "@/components/character/CharacterAvatar";
import AdBannerSection from "@/components/ads/AdBannerSection";
import { CHITO } from "@/lib/character/chito";
import { calculateEmotionTrend, TREND_COPY } from "@/lib/character/trend";
import { emotionOptions, emotionEmojiMap, type PrimaryEmotion } from "@/lib/emotion-agent-types";
import { track } from "@/lib/analytics";

interface TodayEmotionRecord {
  primary_emotion: PrimaryEmotion;
  emotion_score: number;
  situation: string | null;
  source: string;
}

// 로컬(사용자 시간대) 기준 YYYY-MM-DD 키
function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const VIEWED_HOME_KEY = 'mc_character_viewed_home_date';

export default function DashboardPage() {
  const [nickname, setNickname] = useState<string | null>(null);
  const [todayEmotion, setTodayEmotion] = useState<TodayEmotionRecord | null>(null);
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [weekData, setWeekData] = useState<{ day: string; score: number | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

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

      // Today's emotion (emotion_records, 로컬 자정 기준)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: todayEmotions } = await supabase
        .from("emotion_records")
        .select("primary_emotion, emotion_score, situation, source")
        .eq("user_id", user.id)
        .gte("recorded_at", todayStart.toISOString())
        .order("recorded_at", { ascending: false })
        .limit(1);

      if (todayEmotions && todayEmotions.length > 0) {
        setTodayEmotion(todayEmotions[0] as unknown as TodayEmotionRecord);
      }

      // Recent test results
      const { data: results } = await supabase
        .from("test_results")
        .select("*, tests(name, category)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);

      setRecentResults(results || []);

      // Weekly emotion data (emotion_records)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 6);
      weekAgo.setHours(0, 0, 0, 0);
      const { data: weekEmotions } = await supabase
        .from("emotion_records")
        .select("emotion_score, recorded_at")
        .eq("user_id", user.id)
        .gte("recorded_at", weekAgo.toISOString())
        .order("recorded_at", { ascending: true });

      const days = ["일", "월", "화", "수", "목", "금", "토"];
      const chartData: { day: string; score: number | null }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateKey = localDateKey(d);
        const dayEmotions = (weekEmotions || []).filter(
          (e) => localDateKey(new Date(e.recorded_at)) === dateKey
        );
        const avg = dayEmotions.length > 0
          ? Math.round(dayEmotions.reduce((s, e) => s + e.emotion_score, 0) / dayEmotions.length)
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

  const characterEmotion: PrimaryEmotion = useMemo(
    () => todayEmotion?.primary_emotion ?? 'neutral',
    [todayEmotion],
  );

  // character_viewed_home daily dedup
  useEffect(() => {
    if (loading) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const last = localStorage.getItem(VIEWED_HOME_KEY);
      if (last === today) return;
      localStorage.setItem(VIEWED_HOME_KEY, today);
      void track('character_viewed_home', {
        breed: 'chito',
        emotion: characterEmotion,
        trend: characterTrend,
      });
    } catch {
      // localStorage unavailable - skip dedup
    }
  }, [loading, characterEmotion, characterTrend]);

  // 치토 인사 말풍선 분기 (CHITO-STORY-SCENARIO.md 대시보드 사양)
  const chitoGreeting = useMemo(() => {
    if (!todayEmotion) {
      if (characterTrend === "declining" || characterTrend === "crashing") {
        return "요즘 좀 무거웠지? 그래도 여기 와줘서 고마워.";
      }
      return "왔구나! 오늘 마음은 어때? 나한테 들려줄래?";
    }
    if (characterTrend === "rising") {
      return "요즘 네 마음, 조금씩 가벼워지고 있는 게 느껴져.";
    }
    return "오늘 이야기 들려줘서 고마워. 네 덕분에 내 밤이 조금 밝아졌어.";
  }, [todayEmotion, characterTrend]);

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

      {/* Character Hero — 치토의 밤 (다크 카드 + 말풍선) */}
      <div className="relative rounded-3xl bg-[#0c0e18] overflow-hidden p-6 text-center shadow-[0_20px_50px_-20px_rgba(100,102,241,0.55)]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at center 35%, rgba(100,102,241,0.28) 0%, transparent 65%)",
          }}
        />
        <div className="relative z-10">
          {/* 말풍선 */}
          <div className="relative mx-auto max-w-xs animate-pop-in">
            <div className="bg-white rounded-2xl px-4 py-3 text-sm font-medium text-foreground shadow-md leading-relaxed">
              “{chitoGreeting}”
            </div>
            <div className="mx-auto w-3 h-3 bg-white rotate-45 -mt-1.5" />
          </div>
          <CharacterAvatar emotion={characterEmotion} size="hero" className="mx-auto mt-4" />
          <div className="mt-4">
            <div className="font-bold text-white">{CHITO.name}</div>
            <div className="text-sm text-white/60 mt-0.5">{TREND_COPY[characterTrend]}</div>
          </div>
        </div>
      </div>

      {/* Today's Emotion (기록은 감정 트래킹으로 일원화 — 여기서는 요약 + 진입 CTA만) */}
      <Card className="p-5 rounded-2xl border-border/50 shadow-sm">
        <h2 className="font-bold mb-3">오늘의 감정</h2>
        {todayEmotion ? (
          <div className="text-center py-2">
            <span className="text-3xl">{emotionEmojiMap[todayEmotion.primary_emotion] ?? "😐"}</span>
            <p className="text-sm font-medium mt-1.5">
              {emotionOptions.find(e => e.key === todayEmotion.primary_emotion)?.label ?? ""}
            </p>
            {todayEmotion.source === "coaching_chat" && (
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary mt-1.5">
                💬 AI 코칭 중 기록
              </span>
            )}
            {todayEmotion.situation && (
              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">"{todayEmotion.situation}"</p>
            )}
            <Button variant="ghost" size="sm" className="mt-1 text-primary" onClick={() => navigate("/emotion")}>
              한 번 더 기록하기 →
            </Button>
          </div>
        ) : (
          <div className="text-center py-2 space-y-3">
            <p className="text-sm text-muted-foreground">
              아직 오늘의 기록이 없어요. 치토와 대화하며 1분 만에 기록해보세요.
            </p>
            <Button variant="hero" className="rounded-xl" onClick={() => navigate("/emotion")}>
              치토와 감정 기록하기
            </Button>
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
          <div className="text-xs text-muted-foreground mt-0.5">26종 간이 심리검사</div>
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

      {/* Ad Banner */}
      <AdBannerSection />

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
