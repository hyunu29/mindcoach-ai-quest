import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Info, ArrowLeft, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface SignalRow {
  user_id: string;
  risk_area_count: number;
  emotion_avg: number | null;
  emotion_record_count: number;
  test_result_count: number;
  last_activity_at: string | null;
  signal: 'green' | 'yellow' | 'red' | 'unassessed';
}

interface ProfileRow {
  id: string;
  nickname: string | null;
  school: string | null;
  grade: string | null;
  academy_id: string | null;
}

interface IntResult {
  scores: { subdomain_scores?: Record<string, number> } | null;
  created_at: string;
}

interface IndividualResult {
  test_id: string;
  risk_level: string | null;
  created_at: string;
}

interface EmotionPoint {
  date: string;
  score: number;
}

const DOMAIN_THRESHOLD = 12;

const SIGNAL_LABEL: Record<SignalRow['signal'], string> = {
  green: '그린',
  yellow: '옐로',
  red: '레드',
  unassessed: '미평가',
};

const SIGNAL_DOT: Record<SignalRow['signal'], string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  unassessed: 'bg-gray-400',
};

export default function AdminStudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [signal, setSignal] = useState<SignalRow | null>(null);
  const [intResult, setIntResult] = useState<IntResult | null>(null);
  const [individualResults, setIndividualResults] = useState<IndividualResult[]>([]);
  const [emotionTrend, setEmotionTrend] = useState<EmotionPoint[]>([]);

  useEffect(() => {
    if (!id) return;
    void loadDetail(id);
  }, [id]);

  async function loadDetail(userId: string) {
    setLoading(true);
    try {
      // Profile
      const { data: pData } = await (supabase.from('profiles') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            single: () => Promise<{ data: ProfileRow | null }>;
          };
        };
      })
        .select('id, nickname, school, grade, academy_id')
        .eq('id', userId)
        .single();
      setProfile(pData);

      // Signal (RPC)
      const { data: sData } = await (supabase.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: SignalRow[] | null }>)('calculate_student_signal', { p_user_id: userId });
      if (sData && sData.length > 0) setSignal(sData[0]);

      // INT test latest result (30 days)
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: intData } = await (supabase.from('test_results') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            eq: (col: string, val: string) => {
              gte: (col: string, val: string) => {
                order: (col: string, opts: { ascending: boolean }) => {
                  limit: (n: number) => {
                    maybeSingle: () => Promise<{ data: IntResult | null }>;
                  };
                };
              };
            };
          };
        };
      })
        .select('scores, created_at')
        .eq('user_id', userId)
        .eq('test_id', 'INT')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setIntResult(intData);

      // Individual test results (non-INT, latest 10)
      const { data: indivData } = await (supabase.from('test_results') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            neq: (col: string, val: string) => {
              order: (col: string, opts: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: IndividualResult[] | null }>;
              };
            };
          };
        };
      })
        .select('test_id, risk_level, created_at')
        .eq('user_id', userId)
        .neq('test_id', 'INT')
        .order('created_at', { ascending: false })
        .limit(10);
      setIndividualResults(indivData ?? []);

      // Emotion trend (30 days)
      const { data: emotionData } = await (supabase.from('emotion_records') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            gte: (col: string, val: string) => {
              order: (col: string, opts: { ascending: boolean }) => Promise<{
                data: Array<{ emotion_score: number; recorded_at: string }> | null;
              }>;
            };
          };
        };
      })
        .select('emotion_score, recorded_at')
        .eq('user_id', userId)
        .gte('recorded_at', since)
        .order('recorded_at', { ascending: true });
      setEmotionTrend(
        (emotionData ?? []).map((r) => ({ date: r.recorded_at, score: r.emotion_score })),
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-2">
        <h1 className="text-xl font-bold">원생을 찾을 수 없어요</h1>
        <Button variant="outline" onClick={() => navigate('/admin')}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> 대시보드로
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-8 space-y-6 animate-reveal-up">
      <button
        onClick={() => navigate('/admin')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> 대시보드
      </button>

      <header>
        <h1 className="text-2xl font-bold">{profile.nickname ?? '(이름 미설정)'}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {profile.school}
          {profile.grade && ` · ${profile.grade}`}
        </p>
      </header>

      {/* 신호 카드 */}
      {signal && (
        <Card className="p-5 rounded-2xl">
          <div className="flex items-center gap-3">
            <span className={`w-4 h-4 rounded-full ${SIGNAL_DOT[signal.signal]}`} />
            <h2 className="text-lg font-bold">{SIGNAL_LABEL[signal.signal]}</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            위험 영역 {signal.risk_area_count}개
            {signal.emotion_avg !== null &&
              ` · 감정 평균 ${Number(signal.emotion_avg).toFixed(1)} / 5.0`}
            {' '}
            (최근 30일)
          </p>
        </Card>
      )}

      {/* 통합검사 결과 */}
      {intResult?.scores?.subdomain_scores && (
        <Card className="p-5 rounded-2xl">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-bold">통합검사 결과</h2>
            <span className="text-xs text-muted-foreground">
              {new Date(intResult.created_at).toLocaleDateString('ko-KR')}
            </span>
          </div>
          <div className="space-y-1.5">
            {Object.entries(intResult.scores.subdomain_scores).map(([domain, score]) => {
              const isRisk = (score as number) < DOMAIN_THRESHOLD;
              return (
                <div key={domain} className="flex items-center gap-2 text-sm">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isRisk ? 'bg-red-500' : 'bg-green-500'
                    }`}
                  />
                  <span className="flex-1 truncate">{domain}</span>
                  <Badge
                    variant={isRisk ? 'destructive' : 'outline'}
                    className="text-[10px] shrink-0"
                  >
                    {isRisk ? '위험' : '보통'} ({score}/25)
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 감정 트렌드 */}
      {emotionTrend.length > 0 && (
        <Card className="p-5 rounded-2xl">
          <h2 className="font-bold mb-3">감정 트렌드 (30일)</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={emotionTrend}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) =>
                    new Date(v).toLocaleDateString('ko-KR', {
                      month: 'numeric',
                      day: 'numeric',
                    })
                  }
                  tick={{ fontSize: 10 }}
                />
                <YAxis domain={[1, 5]} tick={{ fontSize: 10 }} />
                <Tooltip
                  labelFormatter={(v: string) => new Date(v).toLocaleDateString('ko-KR')}
                  formatter={(v: number) => [`${v}점`, '감정']}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground mt-2">기록 {emotionTrend.length}회</p>
        </Card>
      )}

      {/* 개별 검사 이력 */}
      {individualResults.length > 0 && (
        <Card className="p-5 rounded-2xl">
          <h2 className="font-bold mb-3">개별 검사 이력</h2>
          <div className="space-y-2">
            {individualResults.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="font-mono">{r.test_id}</span>
                <div className="flex items-center gap-2">
                  {r.risk_level && (
                    <Badge
                      variant={r.risk_level === 'high' ? 'destructive' : 'outline'}
                      className="text-[10px]"
                    >
                      {r.risk_level === 'high'
                        ? '위험'
                        : r.risk_level === 'medium'
                          ? '보통'
                          : '안전'}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 프라이버시 배너 */}
      <Card className="p-4 rounded-2xl bg-muted/50 border-dashed">
        <div className="flex gap-2 text-xs text-muted-foreground">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            감정 메모 원문과 AI 코칭 대화 내용은 학원에서 볼 수 없습니다. 원생의 사적 표현을 보호하기 위한 원칙입니다.
          </p>
        </div>
      </Card>
    </div>
  );
}
