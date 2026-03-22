import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Target, Flame, BatteryLow, Scale, Smartphone, ChevronRight } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Syndrome {
  name: string;
  icon: string;
  description: string;
}

const iconMap: Record<string, React.ElementType> = {
  "alert-triangle": AlertTriangle,
  target: Target,
  flame: Flame,
  "battery-low": BatteryLow,
  scale: Scale,
  smartphone: Smartphone,
};

function getRiskLevel(score: number) {
  if (score <= 40) return { label: "양호", color: "text-accent", bg: "bg-accent/10", desc: "전반적으로 안정적인 상태입니다. 현재의 좋은 습관을 유지하세요." };
  if (score <= 60) return { label: "주의 필요", color: "text-warning", bg: "bg-warning/10", desc: "일부 영역에서 주의가 필요합니다. 스트레스 관리에 신경 써 주세요." };
  if (score <= 80) return { label: "관리 필요", color: "text-orange-500", bg: "bg-orange-50", desc: "적극적인 관리가 필요한 상태입니다. AI 코칭을 통해 구체적인 전략을 세워보세요." };
  return { label: "전문 상담 권고", color: "text-destructive", bg: "bg-destructive/10", desc: "전문 상담이 권고되는 상태입니다. 가까운 상담센터 방문을 추천드려요." };
}

function getAreaColor(score: number, max: number) {
  const pct = (score / max) * 100;
  if (pct <= 40) return "hsl(160 84% 39%)"; // green
  if (pct <= 60) return "hsl(38 92% 50%)"; // yellow
  return "hsl(0 84% 60%)"; // red
}

export default function ResultsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // State from navigation or from DB
  const [scores, setScores] = useState<Record<string, number>>(location.state?.scores || {});
  const [totalScore, setTotalScore] = useState<number>(location.state?.totalScore || 0);
  const [testName, setTestName] = useState<string>(location.state?.testName || "");
  const [subAreas, setSubAreas] = useState<string[]>(location.state?.subAreas || []);
  const [syndromes, setSyndromes] = useState<Syndrome[]>([]);
  const [loading, setLoading] = useState(!location.state);

  useEffect(() => {
    const fetchTest = async () => {
      if (!id) return;
      const { data } = await supabase
        .from("tests")
        .select("name, sub_areas, syndromes")
        .eq("id", id)
        .single();

      if (data) {
        setTestName(data.name);
        setSubAreas(data.sub_areas as unknown as string[]);
        setSyndromes(data.syndromes as unknown as Syndrome[]);

        // If no scores from navigation state, generate sample
        if (!location.state) {
          const areas = data.sub_areas as unknown as string[];
          const mockScores: Record<string, number> = {};
          areas.forEach((a) => { mockScores[a] = Math.floor(Math.random() * 15) + 8; });
          setScores(mockScores);
          setTotalScore(Object.values(mockScores).reduce((a, b) => a + b, 0));
        }
      }
      setLoading(false);
    };
    fetchTest();
  }, [id, location.state]);

  // Also fetch syndromes if we came from navigation state
  useEffect(() => {
    if (location.state && id && syndromes.length === 0) {
      supabase.from("tests").select("syndromes").eq("id", id).single().then(({ data }) => {
        if (data) setSyndromes(data.syndromes as unknown as Syndrome[]);
      });
    }
  }, [id, location.state, syndromes.length]);

  if (loading) return <div className="h-64 rounded-2xl bg-muted animate-pulse" />;

  const risk = getRiskLevel(totalScore);
  const maxAreaScore = 25;

  const radarData = subAreas.map((area) => ({
    area,
    score: scores[area] || 0,
    fullMark: maxAreaScore,
  }));

  const now = new Date();
  const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}`;

  return (
    <div className="space-y-5 animate-reveal-up">
      {/* Header */}
      <div className="text-center">
        <div className={`w-16 h-16 rounded-full ${risk.bg} flex items-center justify-center mx-auto mb-3`}>
          <CheckCircle className={`w-8 h-8 ${risk.color}`} />
        </div>
        <h1 className="text-xl font-bold mb-0.5">{testName}</h1>
        <p className="text-xs text-muted-foreground">{dateStr} 실시</p>
      </div>

      {/* Total Score & Risk */}
      <Card className="p-5 rounded-2xl border-border/50 shadow-sm text-center">
        <div className="text-sm text-muted-foreground mb-2">종합 점수</div>
        <div className="text-4xl font-extrabold gradient-text mb-1">{totalScore}</div>
        <div className="text-xs text-muted-foreground mb-3">/ 100점</div>
        <Badge className={`${risk.bg} ${risk.color} border-0 text-xs font-semibold px-3 py-1`}>
          {risk.label}
        </Badge>
        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{risk.desc}</p>
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
                tick={{ fontSize: 11, fill: "hsl(220 9% 46%)" }}
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

        {/* Area scores */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          {subAreas.map((area) => {
            const areaScore = scores[area] || 0;
            const color = getAreaColor(areaScore, maxAreaScore);
            return (
              <div key={area} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                <span className="text-xs font-medium truncate">{area}</span>
                <span className="text-xs font-bold" style={{ color }}>{areaScore}/{maxAreaScore}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Syndromes */}
      {syndromes.length > 0 && (
        <Card className="p-5 rounded-2xl border-border/50 shadow-sm">
          <h2 className="font-bold mb-3">매칭된 증후군</h2>
          <div className="space-y-3">
            {syndromes.map((syn) => {
              const IconComp = iconMap[syn.icon] || AlertTriangle;
              return (
                <div key={syn.name} className="flex items-center gap-3 bg-muted/50 rounded-xl p-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <IconComp className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{syn.name}</div>
                    <div className="text-xs text-muted-foreground">{syn.description}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* CTAs */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 rounded-xl" onClick={() => navigate("/tests")}>
          다른 검사 해보기
        </Button>
        <Button variant="hero" className="flex-1 rounded-xl" onClick={() => navigate("/coaching")}>
          AI 코칭 시작하기
        </Button>
      </div>
    </div>
  );
}
