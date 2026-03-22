import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, MessageCircle, ClipboardList } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";
import { getRiskLevel, syndromeMatchMap, testList } from "@/data/seed-data";

function getBarColor(score: number, max: number) {
  const pct = (score / max) * 100;
  if (pct <= 40) return "hsl(160 84% 39%)";
  if (pct <= 60) return "hsl(38 92% 50%)";
  if (pct <= 80) return "hsl(24 95% 53%)";
  return "hsl(0 84% 60%)";
}

export default function ResultsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as {
    subdomainScores: Record<string, number>;
    totalScore: number;
    testName: string;
    subdomains: string[];
    matchedSyndromes: string[];
    durationSeconds: number;
  } | null;

  const test = testList.find((t) => t.id === id);

  // Fallback: generate sample data if navigated directly
  const testName = state?.testName || test?.name || "심리검사";
  const subdomains = state?.subdomains || test?.subdomains || [];
  const subdomainScores = state?.subdomainScores || (() => {
    const mock: Record<string, number> = {};
    subdomains.forEach((s) => { mock[s] = Math.floor(Math.random() * 15) + 8; });
    return mock;
  })();
  const totalScore = state?.totalScore || Object.values(subdomainScores).reduce((a, b) => a + b, 0);
  const matchedSyndromeIds = state?.matchedSyndromes || syndromeMatchMap.filter((s) => s.relatedTests.includes(id || "")).map((s) => s.id);

  const risk = getRiskLevel(totalScore);
  const maxAreaScore = 25;

  const radarData = subdomains.map((area) => ({
    area: area.replace(/\s*\(.*?\)\s*/g, "").replace(/\s*\[.*?\]\s*/g, ""),
    score: subdomainScores[area] || 0,
    fullMark: maxAreaScore,
  }));

  const matchedSyndromes = syndromeMatchMap.filter((s) => matchedSyndromeIds.includes(s.id));

  const now = new Date();
  const ampm = now.getHours() >= 12 ? "오후" : "오전";
  const hours12 = now.getHours() % 12 || 12;
  const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${ampm} ${hours12}:${now.getMinutes().toString().padStart(2, "0")}`;

  return (
    <div className="space-y-5 animate-reveal-up">
      {/* Header */}
      <div className="text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
          style={{ backgroundColor: risk.bgColor }}
        >
          <CheckCircle className="w-8 h-8" style={{ color: risk.color }} />
        </div>
        <h1 className="text-xl font-bold mb-0.5">{testName}</h1>
        <p className="text-xs text-muted-foreground">{dateStr} 실시</p>
      </div>

      {/* Total Score & Risk */}
      <Card className="p-5 rounded-2xl border-border/50 shadow-sm text-center">
        <div className="text-sm text-muted-foreground mb-2">종합 점수</div>
        <div className="text-4xl font-extrabold gradient-text mb-1">{totalScore}</div>
        <div className="text-xs text-muted-foreground mb-3">/ 100점</div>
        <Badge
          className="border-0 text-xs font-semibold px-3 py-1"
          style={{ backgroundColor: risk.bgColor, color: risk.color }}
        >
          {risk.level}
        </Badge>
        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{risk.description}</p>
      </Card>

      {/* Radar Chart */}
      <Card className="p-5 rounded-2xl border-border/50 shadow-sm">
        <h2 className="font-bold mb-1">하위영역 분석</h2>
        <p className="text-xs text-muted-foreground mb-3">각 축은 25점 만점입니다.</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="hsl(220 13% 91%)" />
              <PolarAngleAxis
                dataKey="area"
                tick={{ fontSize: 10, fill: "hsl(220 9% 46%)" }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, maxAreaScore]}
                tick={{ fontSize: 10 }}
                axisLine={false}
              />
              <Radar
                name="점수"
                dataKey="score"
                stroke="hsl(239 84% 67%)"
                fill="hsl(239 84% 67%)"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Area score bars */}
        <div className="space-y-2 mt-4">
          {subdomains.map((area) => {
            const areaScore = subdomainScores[area] || 0;
            const label = area.replace(/\s*\(.*?\)\s*/g, "").replace(/\s*\[.*?\]\s*/g, "");
            const barColor = getBarColor(areaScore, maxAreaScore);
            const widthPct = (areaScore / maxAreaScore) * 100;
            return (
              <div key={area}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium truncate">{label}</span>
                  <span className="text-xs font-bold" style={{ color: barColor }}>
                    {areaScore}/{maxAreaScore}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${widthPct}%`, backgroundColor: barColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Matched Syndromes */}
      {matchedSyndromes.length > 0 && (
        <Card className="p-5 rounded-2xl border-border/50 shadow-sm">
          <h2 className="font-bold mb-3">매칭된 증후군</h2>
          <div className="space-y-3">
            {matchedSyndromes.map((syn) => (
              <div key={syn.id} className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{syn.icon}</span>
                  <span className="font-semibold text-sm">{syn.name}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{syn.description}</p>
                <div className="bg-background/80 rounded-lg p-3 border border-border/50">
                  <p className="text-xs leading-relaxed text-foreground/80">
                    💡 {syn.advice}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* CTAs */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 rounded-xl gap-1.5" onClick={() => navigate("/tests")}>
          <ClipboardList className="w-4 h-4" />
          다른 검사 해보기
        </Button>
        <Button variant="hero" className="flex-1 rounded-xl gap-1.5" onClick={() => navigate("/coaching")}>
          <MessageCircle className="w-4 h-4" />
          AI 코칭 시작하기
        </Button>
      </div>
    </div>
  );
}
