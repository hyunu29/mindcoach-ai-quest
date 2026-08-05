import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, MessageCircle, ClipboardList, LogIn, Loader2, AlertTriangle, Info, ChevronRight } from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";
import { getRiskLevel } from "@/data/seed-data";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import {
  buildGatewayMessage,
  buildComplexRiskNote,
  FOLLOW_UP_INTERVAL_NOTICE,
  INTEGRATED_DOMAINS,
  DOMAIN_MAX_SCORE,
  type IntegratedScoringResult,
  type DomainScore,
} from "@/lib/integrated-test-scoring";
import {
  recommendCharacter,
  type DomainScores,
  type DomainKey,
} from "@/lib/character/recommend";
import { CHITO_MAIN_URL } from "@/lib/character/chito";

function getBarColor(score: number, max: number) {
  const pct = (score / max) * 100;
  if (pct <= 40) return "hsl(160 84% 39%)";
  if (pct <= 60) return "hsl(38 92% 50%)";
  if (pct <= 80) return "hsl(24 95% 53%)";
  return "hsl(0 84% 60%)";
}

const RISK_COLORS: Record<string, { color: string; bgColor: string }> = {
  safe: { color: "#10B981", bgColor: "#ECFDF5" },
  caution: { color: "#F59E0B", bgColor: "#FFFBEB" },
  warning: { color: "#F97316", bgColor: "#FFF7ED" },
  danger: { color: "#EF4444", bgColor: "#FEF2F2" },
};

const STAFF_INTERPRETATIONS = [
  { min: 0, max: 22, level: 'safe' as const, label: '정상범위', message: '현재 직무 스트레스를 적절하게 관리하고 계십니다. 주기적인 휴식과 환기로 건강한 상태 유지가 필요합니다.' },
  { min: 23, max: 44, level: 'caution' as const, label: '경도 우울 및 경미한 번아웃', message: '직무 관련 스트레스와 감정 소모가 누적되고 있습니다. 휴식시간을 늘리고, 동료나 주변 사람들과 힘듦을 공유하는 것이 좋습니다.' },
  { min: 45, max: 66, level: 'warning' as const, label: '중증도 우울 및 심각한 번아웃', message: '높은 수준의 우울감과 피로를 겪고 있습니다. 업무 우선순위를 조정하고, 전문 상담이나 심리적 지원 조치가 필요합니다.' },
  { min: 67, max: 90, level: 'danger' as const, label: '고도 우울 위험군', message: '즉각적인 휴식과 전문적인 치료가 강력하게 권장됩니다.' },
];

function getStaffInterpretation(totalScore: number) {
  return STAFF_INTERPRETATIONS.find((r) => totalScore >= r.min && totalScore <= r.max) ?? STAFF_INTERPRETATIONS[0];
}

interface DomainRecommendation {
  domain: string;
  domainName: string;
  score: number;
  recommendedTestIds: string[];
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
  isIntegrated: boolean;
  recommendations: DomainRecommendation[] | null;
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
  const [testNameById, setTestNameById] = useState<Record<string, string>>({});
  useEffect(() => {
    loadResult();
  }, [id]);

  const loadResult = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    setIsLoggedIn(!!user);

    // Case 1: temp result from state or localStorage
    if (id === "temp") {
      setIsTempResult(true);
      const stateData = locationState || (() => {
        try {
          const pending = localStorage.getItem("pendingTestResult");
          return pending ? JSON.parse(pending) : null;
        } catch { return null; }
      })();

      if (stateData) {
        setResult({
          testName: stateData.testName || "심리검사",
          subdomains: stateData.subdomains || [],
          subdomainScores: stateData.subdomain_scores || {},
          totalScore: stateData.total_score || 0,
          riskLevel: stateData.risk_level || "safe",
          riskLabel: stateData.risk_label || "양호",
          matchedSyndrome: stateData.matched_syndrome || null,
          createdAt: null,
          testId: stateData.test_id || "",
          isIntegrated: !!stateData.is_integrated || stateData.test_id === "INT",
          recommendations: stateData.recommendations || null,
        });
        await loadTestNames(stateData.recommendations || null);
      }
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
        const recs = (data.recommendations as unknown as DomainRecommendation[] | null) || null;
        setResult({
          testName: testData?.name || "심리검사",
          subdomains: (testData?.subdomains as string[]) || Object.keys((data.subdomain_scores as Record<string, number>) || {}),
          subdomainScores: (data.subdomain_scores as Record<string, number>) || {},
          totalScore: data.total_score,
          riskLevel: data.risk_level,
          riskLabel: data.risk_label,
          matchedSyndrome: data.matched_syndrome,
          createdAt: data.created_at,
          testId: data.test_id,
          isIntegrated: !!testData?.is_integrated,
          recommendations: recs,
        });
        setIsTempResult(false);
        await loadTestNames(recs);
      }
    }
    setLoading(false);
  };

  const loadTestNames = async (recs: DomainRecommendation[] | null) => {
    if (!recs || recs.length === 0) return;
    const allIds = Array.from(new Set(recs.flatMap((r) => r.recommendedTestIds)));
    if (allIds.length === 0) return;
    const { data } = await supabase.from("tests").select("id,name").in("id", allIds);
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((t: any) => { map[t.id] = t.name; });
      setTestNameById(map);
    }
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
                recommendations: parsed.recommendations ?? null,
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

  const isIntegrated = result.isIntegrated;
  const fallbackRisk = getRiskLevel(result.totalScore);
  const riskPalette = RISK_COLORS[result.riskLevel] || { color: fallbackRisk.color, bgColor: fallbackRisk.bgColor };
  const riskLabel = result.riskLabel || fallbackRisk.level;
  const maxAreaScore = 25;
  const maxTotal = isIntegrated ? 250 : 100;

  const recommendations = result.recommendations || [];
  const highCount = recommendations.length;

  const topDomainEntry = isIntegrated
    ? [...Object.entries(result.subdomainScores)].sort((a, b) => (b[1] as number) - (a[1] as number))[0]
    : null;
  const topDomainName = topDomainEntry ? topDomainEntry[0] : null;

  const domainScoresForHelpers: DomainScore[] = INTEGRATED_DOMAINS.map((d) => {
    const score = (result.subdomainScores[d.name] as number) ?? 0;
    return {
      key: d.key,
      name: d.name,
      description: d.description,
      score,
      maxScore: DOMAIN_MAX_SCORE,
      percent: Math.round((score / DOMAIN_MAX_SCORE) * 100),
      isHigh: score >= 15,
    };
  });
  const topDomainScore = domainScoresForHelpers.length
    ? [...domainScoresForHelpers].sort((a, b) => b.score - a.score)[0]
    : null;
  const characterDomainScores: DomainScores = {
    emotional_instability: 0,
    test_stage_anxiety: 0,
    learning_obsession: 0,
    routine_time_control: 0,
    cognitive_focus: 0,
    learning_avoidance: 0,
    somatic_pain: 0,
    energy_burnout: 0,
    self_relationships: 0,
    sleep_routine: 0,
  };
  for (const ds of domainScoresForHelpers) {
    if (ds.key in characterDomainScores) {
      characterDomainScores[ds.key as DomainKey] = ds.score;
    }
  }
  const characterRecommendation = recommendCharacter(characterDomainScores);

  const helperResult: IntegratedScoringResult = {
    totalScore: result.totalScore,
    maxTotalScore: 250,
    domainScores: domainScoresForHelpers,
    subdomainScores: result.subdomainScores,
    recommendations: recommendations,
    topDomain: topDomainScore,
    riskLevel: (result.riskLevel as any) || "safe",
    riskLabel: riskLabel,
    characterRecommendation,
  };

  const integratedDescription = isIntegrated
    ? highCount === 0
      ? "모든 영역이 안정 범위입니다. 평소 루틴을 잘 유지하고 있어요."
      : highCount >= 5
        ? `${highCount}개 영역이 고위험으로 나타났어요. 종합 코칭이 필요합니다.`
        : `${highCount}개 영역이 주의 수준으로 나타났어요. 간이 검사를 살펴보세요.`
    : fallbackRisk.description;

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
          style={{ backgroundColor: riskPalette.bgColor }}
        >
          <CheckCircle className="w-8 h-8" style={{ color: riskPalette.color }} />
        </div>
        <h1 className="text-xl font-bold mb-0.5">{result.testName}</h1>
        <p className="text-xs text-muted-foreground">{dateStr} 실시</p>
      </div>

      {/* STAFF-1 interpretation card (4-band) */}
      {result.testId === 'STAFF-1' && (() => {
        const interp = getStaffInterpretation(result.totalScore);
        const badgeColor =
          interp.level === 'safe' ? 'bg-green-500' :
          interp.level === 'caution' ? 'bg-yellow-500' :
          interp.level === 'warning' ? 'bg-orange-500' :
          'bg-red-500';
        return (
          <Card className="p-5 rounded-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Badge className={`text-xs ${badgeColor} text-white border-0`}>{interp.label}</Badge>
              <span className="text-sm text-muted-foreground">총점 {result.totalScore} / 90</span>
            </div>
            <p className="text-sm leading-relaxed">{interp.message}</p>
          </Card>
        );
      })()}

      {/* Total Score & Risk (skipped for STAFF-1) */}
      {result.testId !== 'STAFF-1' && (
        <Card className="p-5 rounded-2xl border-border/50 shadow-sm text-center">
          <div className="text-sm text-muted-foreground mb-2">종합 점수</div>
          <div className="text-4xl font-extrabold gradient-text mb-1">{result.totalScore}</div>
          <div className="text-xs text-muted-foreground mb-3">/ {maxTotal}점</div>
          <Badge
            className="border-0 text-xs font-semibold px-3 py-1"
            style={{ backgroundColor: riskPalette.bgColor, color: riskPalette.color }}
          >
            {riskLabel}
          </Badge>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{integratedDescription}</p>
        </Card>
      )}

      {/* Gateway Message (Integrated only) */}
      {isIntegrated && topDomainScore && topDomainScore.isHigh && (
        <Card className="p-5 rounded-2xl border-0 shadow-sm bg-gradient-to-br from-primary/10 via-primary/5 to-purple-500/10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center shrink-0 overflow-hidden">
              <img src={CHITO_MAIN_URL} alt="치토" className="w-9 h-9 object-contain" loading="lazy" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-primary mb-1">치토의 조언</div>
              <p className="text-sm leading-relaxed text-foreground">
                {buildGatewayMessage(helperResult, testNameById)}
              </p>
            </div>
          </div>
        </Card>
      )}

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

      {/* Recommended follow-up tests (Integrated only) */}
      {isIntegrated && recommendations.length > 0 && (
        <Card className="p-5 rounded-2xl border-border/50 shadow-sm">
          <h2 className="font-bold mb-1">추천 필수 간이 검사</h2>
          <p className="text-xs text-muted-foreground mb-4">
            고득점 영역에 맞는 간이 심리검사를 추천드려요.
          </p>
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <div key={rec.domain} className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-sm">{rec.domainName}</span>
                  <Badge className="border-0 bg-primary/15 text-primary text-xs">
                    {rec.score}/25점
                  </Badge>
                </div>
                <div className="space-y-2">
                  {rec.recommendedTestIds.map((tid) => (
                    <button
                      key={tid}
                      onClick={() => {
                        void track('recommendation_clicked', {
                          from_test: 'integrated-test',
                          recommended_test_id: tid,
                          recommended_test_name: testNameById[tid] || tid,
                          source_score: rec.score,
                        });
                        navigate(`/tests/${tid}`);
                      }}
                      className="w-full flex items-center justify-between rounded-lg bg-background border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-colors p-3 text-left"
                    >
                      <span className="text-sm font-medium truncate">
                        {testNameById[tid] || tid}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-primary font-semibold shrink-0">
                        검사하기 <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Complex risk note */}
      {isIntegrated && recommendations.length >= 2 && (
        <Card className="p-4 rounded-2xl border-amber-300/50 bg-amber-50 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed text-amber-900">
              {buildComplexRiskNote(helperResult)}
            </p>
          </div>
        </Card>
      )}

      {/* Follow-up interval notice */}
      {isIntegrated && recommendations.length >= 1 && (
        <div className="flex items-start gap-2 rounded-xl bg-muted/60 p-3">
          <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {FOLLOW_UP_INTERVAL_NOTICE}
          </p>
        </div>
      )}

      {/* Matched Syndrome (general tests only) */}
      {!isIntegrated && result.matchedSyndrome && (
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
            navigate(
              `/coaching?syndrome=${encodeURIComponent(
                isIntegrated ? (topDomainName || "") : (result.matchedSyndrome || "")
              )}&resultId=${id}`,
            )
          }
        >
          <MessageCircle className="w-4 h-4" />
          AI 코칭 시작하기
        </Button>
      </div>
    </div>
  );
}
