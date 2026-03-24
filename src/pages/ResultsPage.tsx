import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, MessageCircle, ClipboardList, LogIn, Loader2 } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";
import { getRiskLevel } from "@/data/seed-data";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";

function getBarColor(score: number, max: number) {
  const pct = (score / max) * 100;
  if (pct <= 40) return "hsl(160 84% 39%)";
  if (pct <= 60) return "hsl(38 92% 50%)";
  if (pct <= 80) return "hsl(24 95% 53%)";
  return "hsl(0 84% 60%)";
}

interface ResultData {
  testName: string;
  subdomains: string[];
  subdomainScores: Record<string, number>;
  totalScore: number;
  riskLevel: string;
  riskLabel: string;
  matchedSyndrome: string | null;
  createdAt: string | null;
  testId: string;
}

export default function ResultsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as any;

  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isTempResult, setIsTempResult] = useState(false);

  useEffect(() => {
    loadResult();
  }, [id]);

  const loadResult = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    setIsLoggedIn(!!user);

    // Case 1: temp result from state (not saved to DB)
    if (id === "temp" && locationState) {
      setIsTempResult(true);
      setResult({
        testName: locationState.testName || "심리검사",
        subdomains: locationState.subdomains || [],
        subdomainScores: locationState.subdomain_scores || {},
        totalScore: locationState.total_score || 0,
        riskLevel: locationState.risk_level || "safe",
        riskLabel: locationState.risk_label || "양호",
        matchedSyndrome: locationState.matched_syndrome || null,
        createdAt: null,
        testId: locationState.test_id || "",
      });
      setLoading(false);
      return;
    }

    // Case 2: load from DB by result ID
    if (id && id !== "temp") {
      const { data, error } = await supabase
        .from("test_results")
        .select("*, tests(*)")
        .eq("id", id)
        .maybeSingle();

      if (!error && data) {
        const testData = data.tests as any;
        setResult({
          testName: testData?.name || "심리검사",
          subdomains: (testData?.subdomains as string[]) || [],
          subdomainScores: (data.subdomain_scores as Record<string, number>) || {},
          totalScore: data.total_score,
          riskLevel: data.risk_level,
          riskLabel: data.risk_label,
          matchedSyndrome: data.matched_syndrome,
          createdAt: data.created_at,
          testId: data.test_id,
        });
        setIsTempResult(false);
      }
    }
    setLoading(false);
  };

  // Auto-save pending result after login
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setIsLoggedIn(true);
        const pending = localStorage.getItem("pendingTestResult");
        if (pending) {
          try {
            const parsed = JSON.parse(pending);
            const { data: saved, error } = await supabase
              .from("test_results")
              .insert({
                user_id: session.user.id,
                test_id: parsed.test_id,
                answers: parsed.answers,
                subdomain_scores: parsed.subdomain_scores,
                total_score: parsed.total_score,
                risk_level: parsed.risk_level,
                risk_label: parsed.risk_label,
                matched_syndrome: parsed.matched_syndrome,
              })
              .select("id")
              .single();

            if (!error && saved) {
              localStorage.removeItem("pendingTestResult");
              toast.success("검사 결과가 저장되었습니다!");
              navigate(`/results/${saved.id}`, { replace: true });
            }
          } catch (e) {
            console.error("Failed to save pending result:", e);
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="text-center py-16 text-sm text-muted-foreground">
        결과를 찾을 수 없습니다.
      </div>
    );
  }

  const risk = getRiskLevel(result.totalScore);
  const maxAreaScore = 25;

  const radarData = result.subdomains.map((area) => ({
    area: area.replace(/\s*\(.*?\)\s*/g, "").replace(/\s*\[.*?\]\s*/g, ""),
    score: result.subdomainScores[area] || 0,
    fullMark: maxAreaScore,
  }));

  const dateStr = result.createdAt
    ? (() => {
        const d = new Date(result.createdAt);
        const ampm = d.getHours() >= 12 ? "오후" : "오전";
        const hours12 = d.getHours() % 12 || 12;
        return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${ampm} ${hours12}:${d.getMinutes().toString().padStart(2, "0")}`;
      })()
    : (() => {
        const now = new Date();
        const ampm = now.getHours() >= 12 ? "오후" : "오전";
        const hours12 = now.getHours() % 12 || 12;
        return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${ampm} ${hours12}:${now.getMinutes().toString().padStart(2, "0")}`;
      })();

  return (
    <div className="space-y-5 animate-reveal-up">
      {/* Login prompt for temp results */}
      {isTempResult && !isLoggedIn && (
        <Card className="p-4 rounded-2xl border-primary/30 bg-primary/5 shadow-sm">
          <div className="flex items-center gap-3">
            <LogIn className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold">결과를 저장하려면 로그인하세요</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                로그인 후 결과가 자동 저장됩니다.
              </p>
            </div>
            <Button size="sm" className="rounded-lg shrink-0" onClick={() => navigate("/auth")}>
              로그인
            </Button>
          </div>
        </Card>
      )}

      {/* Header */}
      <div className="text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
          style={{ backgroundColor: risk.bgColor }}
        >
          <CheckCircle className="w-8 h-8" style={{ color: risk.color }} />
        </div>
        <h1 className="text-xl font-bold mb-0.5">{result.testName}</h1>
        <p className="text-xs text-muted-foreground">{dateStr} 실시</p>
      </div>

      {/* Total Score & Risk */}
      <Card className="p-5 rounded-2xl border-border/50 shadow-sm text-center">
        <div className="text-sm text-muted-foreground mb-2">종합 점수</div>
        <div className="text-4xl font-extrabold gradient-text mb-1">{result.totalScore}</div>
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
      {radarData.length > 0 && (
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
            {result.subdomains.map((area) => {
              const areaScore = result.subdomainScores[area] || 0;
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
      )}

      {/* Matched Syndrome */}
      {result.matchedSyndrome && (
        <Card className="p-5 rounded-2xl border-border/50 shadow-sm">
          <h2 className="font-bold mb-3">매칭된 증후군</h2>
          <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🧠</span>
              <span className="font-semibold text-sm">{result.matchedSyndrome}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              이 증후군에 대한 자세한 코칭을 AI 코칭에서 받아보세요.
            </p>
          </div>
        </Card>
      )}

      {/* CTAs */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 rounded-xl gap-1.5" onClick={() => navigate("/tests")}>
          <ClipboardList className="w-4 h-4" />
          다른 검사 해보기
        </Button>
        <Button
          className="flex-1 rounded-xl gap-1.5 gradient-primary text-primary-foreground"
          onClick={() =>
            navigate(`/coaching?syndrome=${encodeURIComponent(result.matchedSyndrome || "")}&resultId=${id}`)
          }
        >
          <MessageCircle className="w-4 h-4" />
          AI 코칭 시작하기
        </Button>
      </div>
    </div>
  );
}
