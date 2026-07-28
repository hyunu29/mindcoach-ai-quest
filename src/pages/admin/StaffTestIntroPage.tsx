import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface RecentResult {
  id: string;
  total_score: number;
  created_at: string;
}

const SUBDOMAINS = [
  { name: '정서적 및 신체적 우울 증상', count: 8 },
  { name: '학생 및 학부모 관리에 따른 감정소모', count: 8 },
  { name: '근무환경 및 직무 스트레스', count: 8 },
  { name: '사회적 고립 및 냉소성', count: 6 },
];

export default function StaffTestIntroPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recent, setRecent] = useState<RecentResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await (supabase.from('test_results') as unknown as {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            eq: (col: string, val: string) => {
              order: (col: string, opts: { ascending: boolean }) => {
                limit: (n: number) => {
                  maybeSingle: () => Promise<{ data: RecentResult | null }>;
                };
              };
            };
          };
        };
      })
        .select('id, total_score, created_at')
        .eq('user_id', user.id)
        .eq('test_id', 'STAFF-1')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setRecent(data);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:py-8 space-y-6 animate-reveal-up">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">교직원 심리검사</h1>
        <p className="text-sm text-muted-foreground mt-1">
          학원 종사자의 우울, 감정소모, 근무환경 스트레스, 사회적 고립을 측정합니다
        </p>
      </header>

      <Card className="p-5 rounded-2xl space-y-4">
        <h2 className="font-bold">검사 개요</h2>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <ClipboardCheck className="w-4 h-4 text-primary" /> 30문항
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-primary" /> 약 10분
          </span>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">측정 영역</h3>
          <ul className="space-y-1.5">
            {SUBDOMAINS.map((s) => (
              <li key={s.name} className="flex items-center justify-between text-sm">
                <span>{s.name}</span>
                <Badge variant="outline" className="text-[10px]">{s.count}문항</Badge>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {loading ? (
        <div className="p-4 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : recent ? (
        <Card className="p-5 rounded-2xl">
          <h2 className="font-bold mb-2">지난 응시 결과</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">
                {recent.total_score}
                <span className="text-sm text-muted-foreground"> / 90</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(recent.created_at).toLocaleDateString('ko-KR')}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate(`/results/${recent.id}`)}>
              결과 다시 보기 <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      ) : null}

      <Button className="w-full h-12 rounded-xl text-base" onClick={() => navigate('/tests/STAFF-1')}>
        {recent ? '새로 응시하기' : '검사 시작하기'}
      </Button>
    </div>
  );
}
