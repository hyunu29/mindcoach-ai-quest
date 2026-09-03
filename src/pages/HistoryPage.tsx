import { useState, useMemo, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  ClipboardCheck, MessageSquare, Calendar, ChevronRight, Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from "recharts";
import { emotionEmojiMap, type PrimaryEmotion } from "@/lib/emotion-agent-types";

/* ─── Risk helper ────────────────────────────────── */

function getRiskBadge(level: string) {
  switch (level) {
    case "safe": return { label: "양호", cls: "bg-accent/10 text-accent" };
    case "caution": return { label: "주의", cls: "bg-warning/10 text-warning" };
    case "warning": return { label: "관리 필요", cls: "bg-orange-50 text-orange-500" };
    case "danger": return { label: "전문 상담 권고", cls: "bg-destructive/10 text-destructive" };
    default: return { label: level, cls: "bg-muted text-muted-foreground" };
  }
}

import { EMOTION_COLORS_BY_EMOJI } from "@/lib/emotion-colors";

const EMOTION_LABELS: Record<string, string> = {
  "😊": "좋아요",
  "😌": "편안해요",
  "😐": "그저 그래요",
  "😢": "우울해요",
  "😤": "짜증나요",
  "😰": "불안해요",
};

/* ─── Component ──────────────────────────────────── */

export default function HistoryPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [coachingSessions, setCoachingSessions] = useState<any[]>([]);
  const [emotions, setEmotions] = useState<any[]>([]);
  const [compareId, setCompareId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const [testsRes, coachingRes, emotionsRes] = await Promise.all([
        supabase.from("test_results").select("*, tests(name, category)").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("coaching_sessions").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }),
        supabase.from("emotion_records").select("id, primary_emotion, emotion_score, situation, recorded_at").eq("user_id", user.id).order("recorded_at", { ascending: false }).limit(100),
      ]);

      setTestResults(testsRes.data || []);
      setCoachingSessions(coachingRes.data || []);
      // 기존 렌더 로직(emoji/memo/created_at 기반)에 맞게 정규화
      setEmotions(
        ((emotionsRes.data || []) as any[]).map((r) => ({
          id: r.id,
          emoji: emotionEmojiMap[r.primary_emotion as PrimaryEmotion] ?? "😐",
          score: r.emotion_score,
          memo: r.situation,
          created_at: r.recorded_at,
        })),
      );
      setLoading(false);
    };
    load();
  }, []);

  // Group test results by test_id for comparison
  const testGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    testResults.forEach((r) => {
      if (!groups[r.test_id]) groups[r.test_id] = [];
      groups[r.test_id].push(r);
    });
    return groups;
  }, [testResults]);

  const compareData = useMemo(() => {
    if (!compareId) return null;
    const group = testGroups[compareId];
    if (!group || group.length < 2) return null;
    const [latest, prev] = group;
    const latestScores = latest.subdomain_scores as Record<string, number>;
    const prevScores = prev.subdomain_scores as Record<string, number>;
    const areas = Object.keys(latestScores);
    return {
      latest, prev,
      radarData: areas.map((area) => ({
        area: area.length > 8 ? area.slice(0, 8) + "…" : area,
        최근: latestScores[area] || 0,
        이전: prevScores[area] || 0,
        fullMark: 25,
      })),
    };
  }, [compareId, testGroups]);

  // Emotion pie data
  const emotionPieData = useMemo(() => {
    const counts: Record<string, number> = {};
    emotions.forEach((e) => { counts[e.emoji] = (counts[e.emoji] || 0) + 1; });
    return Object.entries(counts).map(([emoji, value]) => ({
      name: `${emoji} ${EMOTION_LABELS[emoji] || ""}`,
      value,
      color: EMOTION_COLORS_BY_EMOJI[emoji] || "#9CA3AF",
    }));
  }, [emotions]);

  const formatDate = (d: string) => new Date(d).toLocaleDateString("ko-KR", { year: "numeric", month: "short", day: "numeric" });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  if (!userId) {
    return (
      <div className="space-y-6 animate-reveal-up">
        <h1 className="text-2xl font-bold">내 기록</h1>
        <Card className="p-8 rounded-2xl text-center">
          <p className="text-muted-foreground mb-4">로그인하면 기록을 확인할 수 있어요.</p>
          <Button onClick={() => navigate("/auth")} className="gradient-primary text-primary-foreground rounded-xl">로그인하기</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-reveal-up">
      <h1 className="text-2xl font-bold">내 기록</h1>

      <Tabs defaultValue="tests">
        <TabsList className="w-full grid grid-cols-3 rounded-xl h-10">
          <TabsTrigger value="tests" className="rounded-lg text-xs">검사 이력</TabsTrigger>
          <TabsTrigger value="coaching" className="rounded-lg text-xs">코칭 이력</TabsTrigger>
          <TabsTrigger value="emotions" className="rounded-lg text-xs">감정 기록</TabsTrigger>
        </TabsList>

        {/* ── Test History ── */}
        <TabsContent value="tests" className="space-y-3 mt-4">
          {testResults.length === 0 && (
            <Card className="p-8 rounded-2xl text-center">
              <p className="text-muted-foreground text-sm">아직 검사 기록이 없어요.</p>
              <Button variant="link" className="text-primary mt-2" onClick={() => navigate("/tests")}>첫 검사 시작하기 →</Button>
            </Card>
          )}
          {testResults.map((r) => {
            const risk = getRiskBadge(r.risk_level);
            const group = testGroups[r.test_id];
            const canCompare = group && group.length >= 2;
            const testName = r.tests?.name || r.test_id;

            return (
              <Card
                key={r.id}
                className="p-4 rounded-2xl border-border/50 shadow-sm cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
                onClick={() => navigate(`/results/${r.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <ClipboardCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{testName}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />{formatDate(r.created_at)}
                      </span>
                      <span className="text-xs font-bold gradient-text">{r.total_score}점</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={`${risk.cls} border-0 text-[10px] font-semibold`}>{risk.label}</Badge>
                    {canCompare && (
                      <button
                        className="text-[10px] text-primary font-semibold hover:underline"
                        onClick={(e) => { e.stopPropagation(); setCompareId(compareId === r.test_id ? null : r.test_id); }}
                      >
                        {compareId === r.test_id ? "닫기" : "이전과 비교"}
                      </button>
                    )}
                  </div>
                </div>

                {compareId === r.test_id && compareData && r.id === compareData.latest.id && (
                  <div className="mt-4 border-t border-border/50 pt-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                    <p className="text-xs text-muted-foreground mb-2 font-medium">
                      {formatDate(compareData.latest.created_at)} vs {formatDate(compareData.prev.created_at)}
                    </p>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={compareData.radarData} cx="50%" cy="50%" outerRadius="65%">
                          <PolarGrid stroke="hsl(220 13% 91%)" />
                          <PolarAngleAxis dataKey="area" tick={{ fontSize: 10, fill: "hsl(220 9% 46%)" }} />
                          <PolarRadiusAxis angle={90} domain={[0, 25]} tick={false} axisLine={false} />
                          <Radar name="최근" dataKey="최근" stroke="hsl(239 84% 67%)" fill="hsl(239 84% 67%)" fillOpacity={0.2} strokeWidth={2} />
                          <Radar name="이전" dataKey="이전" stroke="hsl(0 84% 60%)" fill="hsl(0 84% 60%)" fillOpacity={0.1} strokeWidth={2} strokeDasharray="4 4" />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      종합 점수: {compareData.prev.total_score}점 → {compareData.latest.total_score}점
                      <span className={compareData.latest.total_score < compareData.prev.total_score ? " text-accent font-semibold" : " text-destructive font-semibold"}>
                        {" "}({compareData.latest.total_score < compareData.prev.total_score ? "▼" : "▲"}{Math.abs(compareData.latest.total_score - compareData.prev.total_score)}점)
                      </span>
                    </p>
                  </div>
                )}
              </Card>
            );
          })}
        </TabsContent>

        {/* ── Coaching History ── */}
        <TabsContent value="coaching" className="space-y-3 mt-4">
          {coachingSessions.length === 0 && (
            <Card className="p-8 rounded-2xl text-center">
              <p className="text-muted-foreground text-sm">아직 코칭 기록이 없어요.</p>
              <Button variant="link" className="text-primary mt-2" onClick={() => navigate("/coaching")}>AI 코칭 시작하기 →</Button>
            </Card>
          )}
          {coachingSessions.map((c) => {
            const msgs = Array.isArray(c.messages) ? c.messages : [];
            const lastMsg = msgs[msgs.length - 1];
            return (
              <Card
                key={c.id}
                className="p-4 rounded-2xl border-border/50 shadow-sm cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
                onClick={() => navigate("/coaching")}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5 text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{c.related_syndrome || "일반 코칭"}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />{formatDate(c.updated_at)}
                    </div>
                    {lastMsg && <p className="text-xs text-muted-foreground mt-1 truncate">{lastMsg.content?.slice(0, 50)}...</p>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              </Card>
            );
          })}
        </TabsContent>

        {/* ── Emotion Records ── */}
        <TabsContent value="emotions" className="space-y-5 mt-4">
          {emotions.length === 0 ? (
            <Card className="p-8 rounded-2xl text-center">
              <p className="text-muted-foreground text-sm">아직 감정 기록이 없어요.</p>
              <Button variant="link" className="text-primary mt-2" onClick={() => navigate("/emotion")}>감정 기록하기 →</Button>
            </Card>
          ) : (
            <>
              {/* Pie chart */}
              <Card className="p-5 rounded-2xl border-border/50 shadow-sm">
                <h2 className="font-bold mb-1">감정 통계</h2>
                <p className="text-xs text-muted-foreground mb-3">기록된 감정의 분포</p>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={emotionPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                        {emotionPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} formatter={(value: number, name: string) => [`${value}회`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {emotionPieData.map((e) => (
                    <span key={e.name} className="text-[10px] flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ background: e.color }} />{e.name} ({e.value})
                    </span>
                  ))}
                </div>
              </Card>

              {/* Timeline */}
              <Card className="p-5 rounded-2xl border-border/50 shadow-sm">
                <h2 className="font-bold mb-3">타임라인</h2>
                <div className="space-y-3">
                  {emotions.slice(0, 20).map((e, i) => (
                    <div key={e.id} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <span className="text-xl">{e.emoji}</span>
                        {i < Math.min(emotions.length, 20) - 1 && <div className="w-px h-6 bg-border/50 mt-1" />}
                      </div>
                      <div className="pt-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold">{EMOTION_LABELS[e.emoji] || e.emoji}</span>
                          <span className="text-[10px] text-muted-foreground">{formatDate(e.created_at)}</span>
                        </div>
                        {e.memo && <p className="text-xs text-muted-foreground mt-0.5 italic">"{e.memo}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
