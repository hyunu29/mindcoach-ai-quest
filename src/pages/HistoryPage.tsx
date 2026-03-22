import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ClipboardCheck,
  MessageSquare,
  Calendar,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";

/* ─── Risk helper ────────────────────────────────── */

function getRiskBadge(score: number) {
  if (score <= 40) return { label: "양호", cls: "bg-accent/10 text-accent" };
  if (score <= 60) return { label: "주의 필요", cls: "bg-warning/10 text-warning" };
  if (score <= 80) return { label: "관리 필요", cls: "bg-orange-50 text-orange-500" };
  return { label: "전문 상담 권고", cls: "bg-destructive/10 text-destructive" };
}

/* ─── Dummy test history ─────────────────────────── */

const testHistory = [
  {
    id: "r1",
    testId: "t1",
    testName: "비교불안 검사",
    date: "2026-03-22",
    totalScore: 58,
    scores: { "자기비교 경향": 16, "SNS 의존도": 14, "열등감 수준": 15, "자기평가 왜곡": 13 },
  },
  {
    id: "r2",
    testId: "t1",
    testName: "비교불안 검사",
    date: "2026-03-10",
    totalScore: 68,
    scores: { "자기비교 경향": 19, "SNS 의존도": 17, "열등감 수준": 18, "자기평가 왜곡": 14 },
  },
  {
    id: "r3",
    testId: "t2",
    testName: "시험불안 검사",
    date: "2026-03-18",
    totalScore: 45,
    scores: { "인지적 걱정": 12, "신체적 긴장": 11, "수행 불안": 13, "회피 행동": 9 },
  },
  {
    id: "r4",
    testId: "t3",
    testName: "번아웃 검사",
    date: "2026-03-14",
    totalScore: 72,
    scores: { "정서적 소진": 20, "신체적 피로": 18, "학업 냉소": 19, "효능감 저하": 15 },
  },
];

/* ─── Dummy coaching history ─────────────────────── */

const coachingHistory = [
  { id: "c1", title: "비교불안 코칭", date: "2026-03-22", preview: "비교하는 마음이 들 때 정말 힘들 수 있어요..." },
  { id: "c2", title: "시험불안 상담", date: "2026-03-20", preview: "시험 전 긴장으로 머리가 하얘지는 건 흔한 경험이에요..." },
  { id: "c3", title: "번아웃 코칭", date: "2026-03-15", preview: "학업 번아웃 증후군 결과가 나왔네요..." },
];

/* ─── Dummy emotion data for timeline ────────────── */

const emotionTimeline = (() => {
  const emojis = ["😊", "😐", "😢", "😤", "😰"];
  const labels = ["좋아요", "보통이에요", "우울해요", "짜증나요", "불안해요"];
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
  const result = [];
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const idx = i % emojis.length;
    result.push({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      emoji: emojis[idx],
      label: labels[idx],
      memo: memos[i] || "",
    });
  }
  return result;
})();

/* ─── Pie chart data ─────────────────────────────── */

const emotionPieData = [
  { name: "😊 좋아요", value: 3, color: "hsl(160 84% 39%)" },
  { name: "😐 보통", value: 3, color: "hsl(220 9% 66%)" },
  { name: "😢 우울해요", value: 3, color: "hsl(239 84% 67%)" },
  { name: "😤 짜증나요", value: 3, color: "hsl(38 92% 50%)" },
  { name: "😰 불안해요", value: 2, color: "hsl(0 84% 60%)" },
];

/* ─── Component ──────────────────────────────────── */

export default function HistoryPage() {
  const navigate = useNavigate();
  const [compareId, setCompareId] = useState<string | null>(null);

  // Group test history by testId to find repeats
  const testGroups = useMemo(() => {
    const groups: Record<string, typeof testHistory> = {};
    testHistory.forEach((r) => {
      if (!groups[r.testId]) groups[r.testId] = [];
      groups[r.testId].push(r);
    });
    return groups;
  }, []);

  const compareData = useMemo(() => {
    if (!compareId) return null;
    const group = testGroups[compareId];
    if (!group || group.length < 2) return null;
    const [latest, prev] = group;
    const areas = Object.keys(latest.scores);
    return {
      latest,
      prev,
      radarData: areas.map((area) => ({
        area,
        최근: latest.scores[area as keyof typeof latest.scores],
        이전: prev.scores[area as keyof typeof prev.scores],
        fullMark: 25,
      })),
    };
  }, [compareId, testGroups]);

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
          {testHistory.map((r) => {
            const risk = getRiskBadge(r.totalScore);
            const group = testGroups[r.testId];
            const canCompare = group && group.length >= 2;

            return (
              <Card
                key={r.id}
                className="p-4 rounded-2xl border-border/50 shadow-sm cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
                onClick={() => navigate(`/results/${r.testId}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <ClipboardCheck className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{r.testName}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {r.date}
                      </span>
                      <span className="text-xs font-bold gradient-text">{r.totalScore}점</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={`${risk.cls} border-0 text-[10px] font-semibold`}>
                      {risk.label}
                    </Badge>
                    {canCompare && (
                      <button
                        className="text-[10px] text-primary font-semibold hover:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCompareId(compareId === r.testId ? null : r.testId);
                        }}
                      >
                        {compareId === r.testId ? "닫기" : "이전과 비교"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Compare radar overlay */}
                {compareId === r.testId && compareData && r.id === compareData.latest.id && (
                  <div className="mt-4 border-t border-border/50 pt-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                    <p className="text-xs text-muted-foreground mb-2 font-medium">
                      {compareData.latest.date} vs {compareData.prev.date}
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
                      종합 점수: {compareData.prev.totalScore}점 → {compareData.latest.totalScore}점
                      <span className={compareData.latest.totalScore < compareData.prev.totalScore ? " text-accent font-semibold" : " text-destructive font-semibold"}>
                        {" "}({compareData.latest.totalScore < compareData.prev.totalScore ? "▼" : "▲"}
                        {Math.abs(compareData.latest.totalScore - compareData.prev.totalScore)}점)
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
          {coachingHistory.map((c) => (
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
                  <div className="font-semibold text-sm">{c.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {c.date}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{c.preview}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* ── Emotion Records ── */}
        <TabsContent value="emotions" className="space-y-5 mt-4">
          {/* Pie chart */}
          <Card className="p-5 rounded-2xl border-border/50 shadow-sm">
            <h2 className="font-bold mb-1">이번 달 감정 통계</h2>
            <p className="text-xs text-muted-foreground mb-3">기록된 감정의 분포</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={emotionPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {emotionPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                    formatter={(value: number, name: string) => [`${value}회`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {emotionPieData.map((e) => (
                <span key={e.name} className="text-[10px] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: e.color }} />
                  {e.name} ({e.value})
                </span>
              ))}
            </div>
          </Card>

          {/* Timeline */}
          <Card className="p-5 rounded-2xl border-border/50 shadow-sm">
            <h2 className="font-bold mb-3">타임라인</h2>
            <div className="space-y-3">
              {emotionTimeline.map((e, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <span className="text-xl">{e.emoji}</span>
                    {i < emotionTimeline.length - 1 && (
                      <div className="w-px h-6 bg-border/50 mt-1" />
                    )}
                  </div>
                  <div className="pt-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{e.label}</span>
                      <span className="text-[10px] text-muted-foreground">{e.date}</span>
                    </div>
                    {e.memo && (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">"{e.memo}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
