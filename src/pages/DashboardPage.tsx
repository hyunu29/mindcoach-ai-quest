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
    return "오늘 이야기 들려줘서 고마워. 네 덕분에 내 밤이 조금 밝아졌어.";
  }, [todayEmotion, characterTrend, isNight]);

  const greeting = useChitoGreeting(
    user?.id ?? null,
    fallbackGreeting,
    todayEmotion?.recorded_at ?? "none",
  );

  // 시간대별 연출
  const timeLabel = hour < 6 ? "고요한 새벽" : hour < 12 ? "좋은 아침" : hour < 18 ? "오늘의 한가운데" : hour < 23 ? "하루의 끝자락" : "깊은 밤";
  const glowColor =
    hour < 6 ? "rgba(80, 90, 190, 0.24)"
    : hour < 12 ? "rgba(250, 190, 90, 0.16)"
    : hour < 18 ? "rgba(100, 102, 241, 0.26)"
    : hour < 23 ? "rgba(180, 110, 240, 0.22)"
    : "rgba(80, 90, 190, 0.24)";
  const stageSrc = isNight
    ? CHITO_POSES.sleeping
    : todayEmotion
      ? getChitoTransparentEmotionUrl(todayEmotion.primary_emotion)
      : CHITO_POSES.waving;

  const riskColor = (level: string) => {
    switch (level) {
      case "safe": return "text-emerald-300 bg-emerald-400/10";
      case "caution": return "text-yellow-300 bg-yellow-400/10";
      case "warning": return "text-orange-300 bg-orange-400/10";
      case "danger": return "text-red-300 bg-red-400/10";
      default: return "text-white/50 bg-white/5";
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
      <div className="-m-4 md:-m-8 min-h-[100dvh] bg-[#0c0e18] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#8B8DF7]" />
      </div>
    );
  }

  return (
    <div className="-m-4 md:-m-8 min-h-[100dvh] bg-[#0c0e18] relative overflow-hidden">
      {/* 시간대별 글로우 */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[760px] h-[560px] animate-glow-pulse"
        style={{ background: `radial-gradient(ellipse at center, ${glowColor} 0%, transparent 65%)` }}
      />

      <div className="relative z-10 max-w-2xl mx-auto p-5 md:p-8 space-y-5">
        {/* 상단 행 */}
        <div className="flex items-center justify-between animate-reveal-up">
          <div>
            <p className="text-[11px] text-white/35">
              {now.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" })}
            </p>
            <p className="text-sm font-semibold text-white/70 mt-0.5">
              {timeLabel}, {nickname ?? "친구"}
            </p>
          </div>
          {streak > 0 && (
            <span className="flex items-center gap-1 text-xs font-bold text-orange-300 bg-orange-400/10 rounded-full px-3 py-1.5">
              <Flame className="w-3.5 h-3.5" /> {streak}일 연속
            </span>
          )}
        </div>

        {/* 치토 스테이지 */}
        <div className="text-center pt-2 animate-reveal-up delay-100">
          {/* AI 생성 말풍선 */}
          <div className="relative mx-auto max-w-sm animate-pop-in">
            <div className="bg-white rounded-2xl px-4 py-3 text-sm font-medium text-[#23263A] shadow-md leading-relaxed">
              “{greeting}”
            </div>
            <div className="mx-auto w-3 h-3 bg-white rotate-45 -mt-1.5" />
          </div>
          <img
            src={stageSrc}
            alt={CHITO.name}
            className="w-44 h-44 md:w-52 md:h-52 object-contain mx-auto mt-4 animate-chito-float"
            style={{ filter: "drop-shadow(0 0 32px rgba(100,102,241,0.35))" }}
            loading="eager"
          />
          <div className="mt-2">
            <span className="font-bold text-white text-sm">{CHITO.name}</span>
            <span className="text-xs text-white/50 ml-2">{TREND_COPY[characterTrend]}</span>
          </div>
        </div>

        {/* 감정 기록 — 홈 통합 */}
        {chatOpen ? (
          <div className="animate-pop-in">
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-xs font-semibold text-white/50">치토와 감정 기록</p>
              <button
                onClick={() => { setChatOpen(false); setChatEmotion(null); }}
                className="w-7 h-7 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* 다크의 밤 위에 열리는 밝은 창문 */}
            <div className="bg-card rounded-3xl overflow-hidden h-[480px] shadow-[0_0_50px_rgba(100,102,241,0.25)]">
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
          <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-4 animate-reveal-up delay-200">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] text-white/40 mb-0.5">오늘의 감정</p>
                <p className="text-sm font-semibold text-white">
                  {emotionEmojiMap[todayEmotion.primary_emotion] ?? "😐"}{" "}
                  {emotionOptions.find((e) => e.key === todayEmotion.primary_emotion)?.label ?? ""}
                  {todayEmotion.source === "coaching_chat" && (
                    <span className="ml-2 text-[10px] font-medium text-[#A5A7F9]">💬 코칭 중 기록</span>
                  )}
                </p>
                {todayEmotion.situation && (
                  <p className="text-xs text-white/40 mt-1 line-clamp-1">"{todayEmotion.situation}"</p>
                )}
              </div>
              <Button
                size="sm"
                className="rounded-full shrink-0 bg-white/10 text-white/80 hover:bg-white/15 text-xs"
                onClick={() => { setChatEmotion(null); setChatOpen(true); }}
              >
                한 번 더
              </Button>
            </div>
          </div>
        ) : (
          <div className="animate-reveal-up delay-200">
            <p className="text-center text-xs font-semibold text-white/50 mb-3">지금 마음은 어때?</p>
            <div className="flex flex-wrap justify-center gap-2">
              {emotionOptions.map((e, i) => (
                <button
                  key={e.key}
                  onClick={() => openChat(e.key as PrimaryEmotion)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/[0.06] border border-white/10 text-sm text-white/75 hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 animate-pop-in"
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
            className="w-full text-left rounded-2xl bg-gradient-to-r from-[#1a1d33] to-[#171a2b] border border-[#8B8DF7]/20 p-4 hover:border-[#8B8DF7]/45 transition-colors animate-reveal-up delay-300"
          >
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-xl bg-white/[0.07] flex items-center justify-center text-xl shrink-0">
                {CATEGORY_EMOJI[dailyTest.category] ?? "📋"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-[#A5A7F9] mb-0.5">
                  오늘의 소식 · {DAILY_LINES[dayOfYear % DAILY_LINES.length]}
                </p>
                <p className="text-sm font-semibold text-white truncate">{dailyTest.name}</p>
                <p className="text-xs text-white/40 truncate">{dailyTest.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/30 shrink-0" />
            </div>
          </button>
        )}

        {/* 퀵 액션 */}
        <div className="grid grid-cols-2 gap-3 animate-reveal-up delay-300">
          <button
            className="rounded-2xl bg-white/[0.05] border border-white/10 p-4 text-left hover:bg-white/[0.08] transition-colors active:scale-[0.98]"
            onClick={() => navigate("/tests")}
          >
            <ClipboardCheck className="w-7 h-7 text-[#8B8DF7] mb-2" />
            <div className="font-semibold text-sm text-white">심리검사</div>
            <div className="text-xs text-white/40 mt-0.5">26종 간이 심리검사</div>
          </button>
          <button
            className="rounded-2xl bg-white/[0.05] border border-white/10 p-4 text-left hover:bg-white/[0.08] transition-colors active:scale-[0.98]"
            onClick={() => navigate("/coaching")}
          >
            <MessageCircle className="w-7 h-7 text-[#C4B5FD] mb-2" />
            <div className="font-semibold text-sm text-white">AI 코칭</div>
            <div className="text-xs text-white/40 mt-0.5">치토와 1:1 대화</div>
          </button>
        </div>

        {/* 최근 검사 결과 */}
        <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-4 animate-reveal-up delay-400">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm text-white">최근 검사 결과</h2>
            <button className="text-xs text-white/40 hover:text-white/70 transition-colors" onClick={() => navigate("/history")}>
              전체보기
            </button>
          </div>
          {recentResults.length === 0 ? (
            <div className="bg-white/[0.04] rounded-xl p-4 text-center text-xs text-white/40">
              아직 검사 기록이 없어.<br />
              <button className="text-[#A5A7F9] font-semibold mt-1" onClick={() => navigate("/tests")}>
                첫 검사 시작하기 →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {recentResults.map((r) => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/results/${r.id}`)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors text-left"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white/85 truncate">{(r as any).tests?.name || r.test_id}</div>
                    <div className="text-[11px] text-white/35">
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
        <div className="rounded-2xl bg-white/[0.05] border border-white/10 p-4 animate-reveal-up delay-400">
          <h2 className="font-bold text-sm text-white mb-3">주간 감정 추이</h2>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weekData}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "rgba(255,255,255,0.35)" }} />
                <YAxis hide domain={[1, 5]} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.4)", backgroundColor: "#1a1d33", color: "#fff" }} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#A5A7F9"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#A5A7F9" }}
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
