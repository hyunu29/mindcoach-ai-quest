import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, ClipboardCheck, Loader2, ChevronRight, Flame, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import AdBannerSection from "@/components/ads/AdBannerSection";
import EmotionAgentChat from "@/components/emotion/EmotionAgentChat";
import { CHITO, CHITO_POSES, getChitoTransparentEmotionUrl } from "@/lib/character/chito";
import { calculateEmotionTrend, TREND_COPY } from "@/lib/character/trend";
import { emotionOptions, emotionEmojiMap, type PrimaryEmotion } from "@/lib/emotion-agent-types";
import { useChitoGreeting } from "@/hooks/useChitoGreeting";
import { track } from "@/lib/analytics";

interface TodayEmotionRecord {
  primary_emotion: PrimaryEmotion;
  emotion_score: number;
  situation: string | null;
  source: string;
  recorded_at?: string;
}

interface DailyTest {
  id: string;
  name: string;
  category: string;
  description: string;
}

// 로컬(사용자 시간대) 기준 YYYY-MM-DD 키
function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const VIEWED_HOME_KEY = 'mc_character_viewed_home_date';

/* 카테고리 이모지 (TestsPage와 동일 코딩) */
const CATEGORY_EMOJI: Record<string, string> = { A: "📱", B: "🔥", C: "🌙", D: "⏳", E: "🎯" };

/* 데일리 카드 치토 멘트 로테이션 */
const DAILY_LINES = [
  "오늘은 이 검사 어때? 내가 골라봤어.",
  "요즘 이런 고민 하는 애들이 많더라. 너는 어때?",
  "3분이면 돼. 궁금하지 않아?",
  "이건 한번 들여다볼 만해. 같이 볼래?",
];

/* ─── 무디형 장면 홈 — 시간대별 수채화 배경 위에 치토가 산다 ───
 * 배경: public/screens/{morning,day,sunset,night}.jpg (동일 장면의 시간대 변형)
 * UI는 장면 위에 얹히는 반투명 카드로 최소화 (레퍼런스: Moodee) */
const SCENES = {
  morning: { src: "/screens/morning.jpg", inkOnScene: "text-[#3A3E52]", subOnScene: "text-[#3A3E52]/60" },
  day: { src: "/screens/day.jpg", inkOnScene: "text-[#2E3448]", subOnScene: "text-[#2E3448]/60" },
  sunset: { src: "/screens/sunset.jpg", inkOnScene: "text-[#43324A]", subOnScene: "text-[#43324A]/65" },
  night: { src: "/screens/night.jpg", inkOnScene: "text-white", subOnScene: "text-white/65" },
} as const;

export default function DashboardPage() {
  const [nickname, setNickname] = useState<string | null>(null);
  const [todayEmotion, setTodayEmotion] = useState<TodayEmotionRecord | null>(null);
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [weekData, setWeekData] = useState<{ day: string; score: number | null }[]>([]);
  const [streak, setStreak] = useState(0);
  const [dailyTest, setDailyTest] = useState<DailyTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  /* 감정 기록 인라인 채팅 (홈 통합) */
  const [chatEmotion, setChatEmotion] = useState<PrimaryEmotion | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const now = new Date();
  const hour = now.getHours();
  const isNight = hour >= 23 || hour < 6;
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", user.id)
        .single();
      setNickname(profile?.nickname || user.email?.split("@")[0] || null);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: todayEmotions } = await supabase
        .from("emotion_records")
        .select("primary_emotion, emotion_score, situation, source, recorded_at")
        .eq("user_id", user.id)
        .gte("recorded_at", todayStart.toISOString())
        .order("recorded_at", { ascending: false })
        .limit(1);
      setTodayEmotion(todayEmotions?.[0] as unknown as TodayEmotionRecord ?? null);

      const { data: results } = await supabase
        .from("test_results")
        .select("*, tests(name, category)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3);
      setRecentResults(results || []);

      const { data: streakRow } = await supabase
        .from("emotion_streaks")
        .select("current_streak")
        .eq("user_id", user.id)
        .maybeSingle();
      setStreak(streakRow?.current_streak ?? 0);

      // 주간 감정 데이터
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

      // 데일리 추천 검사 — 날짜 시드 로테이션
      const { data: tests } = await supabase
        .from("tests")
        .select("id, name, category, description")
        .eq("is_staff_only", false)
        .eq("is_coming_soon", false)
        .eq("is_integrated", false)
        .order("id");
      if (tests && tests.length > 0) {
        setDailyTest(tests[dayOfYear % tests.length] as DailyTest);
      }

      setLoading(false);
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, refreshKey]);

  const characterTrend = useMemo(() => {
    const scores = weekData.map((d) => d.score).filter((s): s is number => s !== null);
    return calculateEmotionTrend(scores);
  }, [weekData]);

  const characterEmotion: PrimaryEmotion = todayEmotion?.primary_emotion ?? 'neutral';

  // character_viewed_home daily dedup
  useEffect(() => {
    if (loading) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const last = localStorage.getItem(VIEWED_HOME_KEY);
      if (last === today) return;
      localStorage.setItem(VIEWED_HOME_KEY, today);
      void track('character_viewed_home', { breed: 'chito', emotion: characterEmotion, trend: characterTrend });
    } catch { /* localStorage unavailable */ }
  }, [loading, characterEmotion, characterTrend]);

  // 폴백 인사 (AI 실패/로딩 시 — CHITO-STORY-SCENARIO.md 분기)
  const fallbackGreeting = useMemo(() => {
    if (isNight) return "늦었네. 오늘도 여기까지 오느라 수고했어.";
    if (!todayEmotion) {
      if (characterTrend === "declining" || characterTrend === "crashing") {
        return "요즘 좀 무거웠지? 그래도 여기 와줘서 고마워.";
      }
      return "왔구나! 오늘 마음은 어때? 나한테 들려줄래?";
    }
    if (characterTrend === "rising") return "요즘 네 마음, 조금씩 가벼워지고 있는 게 느껴져.";
    return "오늘 이야기 들려줘서 고마워. 네 덕분에 내 하루가 조금 밝아졌어.";
  }, [todayEmotion, characterTrend, isNight]);

  const greeting = useChitoGreeting(
    user?.id ?? null,
    fallbackGreeting,
    todayEmotion?.recorded_at ?? "none",
  );

  // 시간대별 장면
  const sceneKey = hour >= 6 && hour < 12 ? "morning" : hour >= 12 && hour < 18 ? "day" : hour >= 18 && hour < 21 ? "sunset" : "night";
  const scene = SCENES[sceneKey];
  const timeLabel = hour < 6 ? "고요한 새벽" : hour < 12 ? "좋은 아침" : hour < 18 ? "오늘의 한가운데" : hour < 21 ? "노을 지는 저녁" : "깊은 밤";
  const stageSrc = isNight
    ? CHITO_POSES.sleeping
    : todayEmotion
      ? getChitoTransparentEmotionUrl(todayEmotion.primary_emotion)
      : CHITO_POSES.waving;

  const riskColor = (level: string) => {
    switch (level) {
      case "safe": return "text-green-600 bg-green-50";
      case "caution": return "text-yellow-600 bg-yellow-50";
      case "warning": return "text-orange-600 bg-orange-50";
      case "danger": return "text-red-600 bg-red-50";
      default: return "text-muted-foreground bg-muted";
    }
  };

  const openChat = (emotion: PrimaryEmotion) => {
    void track('home_emotion_chip_selected', { emotion });
    setChatEmotion(emotion);
    setChatOpen(true);
  };

  const handleRecordSaved = () => {
    setRefreshKey((k) => k + 1);
  };

  if (loading) {
    return (
      <div className="-m-4 md:-m-8 min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="-m-4 md:-m-8 min-h-[100dvh] relative">
      {/* 장면 배경 — 시간대별 수채화 (fixed로 은은한 패럴랙스) */}
      <div className="fixed inset-0 md:left-auto md:right-0 md:w-[calc(100%-0px)]">
        <img
          src={scene.src}
          alt=""
          className="w-full h-full object-cover"
          aria-hidden
        />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto p-5 md:p-8 space-y-4 pb-10">
        {/* 상단 행 — 장면 위 텍스트 */}
        <div className="flex items-center justify-between animate-reveal-up">
          <div>
            <p className={`text-[11px] font-medium ${scene.subOnScene}`}>
              {now.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" })}
            </p>
            <p className={`text-base font-bold mt-0.5 ${scene.inkOnScene}`}>
              {timeLabel}, {nickname ?? "친구"}
            </p>
          </div>
          {streak > 0 && (
            <span className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-white/75 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-sm">
              <Flame className="w-3.5 h-3.5" /> {streak}일 연속
            </span>
          )}
        </div>

        {/* 치토 스테이지 — 장면 속에 앉아 있는 치토 */}
        <div className="text-center pt-1 animate-reveal-up delay-100">
          {/* AI 생성 말풍선 */}
          <div className="relative mx-auto max-w-sm animate-pop-in">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3 text-sm font-medium text-[#2E3448] shadow-sm leading-relaxed">
              “{greeting}”
            </div>
            <div className="mx-auto w-3 h-3 bg-white/90 rotate-45 -mt-1.5" />
          </div>
          <img
            src={stageSrc}
            alt={CHITO.name}
            className="w-40 h-40 md:w-48 md:h-48 object-contain mx-auto mt-3 animate-chito-float"
            style={{ filter: "drop-shadow(0 10px 16px rgba(46,52,72,0.25))" }}
            loading="eager"
          />
          <div className="mt-1.5">
            <span className={`font-bold text-sm ${scene.inkOnScene}`}>{CHITO.name}</span>
            <span className={`text-xs ml-2 ${scene.subOnScene}`}>{TREND_COPY[characterTrend]}</span>
          </div>
        </div>

        {/* 감정 기록 — 홈 통합 */}
        {chatOpen ? (
          <div className="animate-pop-in">
            <div className="flex items-center justify-between mb-2 px-1">
              <p className={`text-xs font-semibold ${scene.subOnScene}`}>치토와 감정 기록</p>
              <button
                onClick={() => { setChatOpen(false); setChatEmotion(null); }}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white/75 text-foreground/60 hover:text-foreground shadow-sm transition-colors"
                aria-label="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-card rounded-3xl overflow-hidden h-[480px] shadow-lg">
              <EmotionAgentChat
                key={chatEmotion ?? "chat"}
                userId={user!.id}
                onRecordSaved={handleRecordSaved}
                todayRecord={todayEmotion}
                initialEmotion={chatEmotion ?? undefined}
                hideHeader
              />
            </div>
          </div>
        ) : todayEmotion ? (
          <div className="rounded-2xl bg-white/80 backdrop-blur-md p-4 shadow-sm animate-reveal-up delay-200">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground mb-0.5">오늘의 감정</p>
                <p className="text-sm font-semibold">
                  {emotionEmojiMap[todayEmotion.primary_emotion] ?? "😐"}{" "}
                  {emotionOptions.find((e) => e.key === todayEmotion.primary_emotion)?.label ?? ""}
                  {todayEmotion.source === "coaching_chat" && (
                    <span className="ml-2 text-[10px] font-medium text-primary">💬 코칭 중 기록</span>
                  )}
                </p>
                {todayEmotion.situation && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">"{todayEmotion.situation}"</p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full shrink-0 text-xs bg-white/60"
                onClick={() => { setChatEmotion(null); setChatOpen(true); }}
              >
                한 번 더
              </Button>
            </div>
          </div>
        ) : (
          <div className="animate-reveal-up delay-200">
            <p className={`text-center text-xs font-semibold mb-3 ${scene.subOnScene}`}>지금 마음은 어때?</p>
            <div className="flex flex-wrap justify-center gap-2">
              {emotionOptions.map((e, i) => (
                <button
                  key={e.key}
                  onClick={() => openChat(e.key as PrimaryEmotion)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/85 backdrop-blur-sm text-sm font-medium text-foreground/80 shadow-sm hover:bg-white transition-all active:scale-95 animate-pop-in"
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <span className="text-base">{e.emoji}</span>
                  {e.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 데일리 추천 — 오늘은 이런 검사 어때? */}
        {dailyTest && (
          <button
            onClick={() => {
              void track('daily_test_card_clicked', { test_id: dailyTest.id });
              navigate(`/tests/${dailyTest.id}`);
            }}
            className="w-full text-left rounded-2xl bg-white/80 backdrop-blur-md p-4 shadow-sm hover:bg-white/90 transition-colors animate-reveal-up delay-300"
          >
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-xl shrink-0">
                {CATEGORY_EMOJI[dailyTest.category] ?? "📋"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-primary mb-0.5">
                  오늘의 소식 · {DAILY_LINES[dayOfYear % DAILY_LINES.length]}
                </p>
                <p className="text-sm font-semibold truncate">{dailyTest.name}</p>
                <p className="text-xs text-muted-foreground truncate">{dailyTest.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          </button>
        )}

        {/* 퀵 액션 */}
        <div className="grid grid-cols-2 gap-3 animate-reveal-up delay-300">
          <button
            className="rounded-2xl bg-white/80 backdrop-blur-md p-4 text-left shadow-sm hover:bg-white/90 transition-colors active:scale-[0.98]"
            onClick={() => navigate("/tests")}
          >
            <ClipboardCheck className="w-7 h-7 text-primary mb-2" />
            <div className="font-semibold text-sm">심리검사</div>
            <div className="text-xs text-muted-foreground mt-0.5">26종 간이 심리검사</div>
          </button>
          <button
            className="rounded-2xl bg-white/80 backdrop-blur-md p-4 text-left shadow-sm hover:bg-white/90 transition-colors active:scale-[0.98]"
            onClick={() => navigate("/coaching")}
          >
            <MessageCircle className="w-7 h-7 text-secondary mb-2" />
            <div className="font-semibold text-sm">AI 코칭</div>
            <div className="text-xs text-muted-foreground mt-0.5">치토와 1:1 대화</div>
          </button>
        </div>

        {/* 최근 검사 결과 */}
        <div className="rounded-2xl bg-white/80 backdrop-blur-md p-4 shadow-sm animate-reveal-up delay-400">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm">최근 검사 결과</h2>
            <button className="text-xs text-muted-foreground hover:text-foreground transition-colors" onClick={() => navigate("/history")}>
              전체보기
            </button>
          </div>
          {recentResults.length === 0 ? (
            <div className="bg-muted/50 rounded-xl p-4 text-center text-xs text-muted-foreground">
              아직 검사 기록이 없어.<br />
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
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{(r as any).tests?.name || r.test_id}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("ko-KR")}
                    </div>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${riskColor(r.risk_level)}`}>
                    {r.risk_label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 주간 감정 추이 */}
        <div className="rounded-2xl bg-white/80 backdrop-blur-md p-4 shadow-sm animate-reveal-up delay-400">
          <h2 className="font-bold text-sm mb-3">주간 감정 추이</h2>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekData}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
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
        </div>

        {/* Ad Banner */}
        <AdBannerSection />
      </div>
    </div>
  );
}
