import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Copy, ChevronRight, Loader2 } from 'lucide-react';
import { useMyAcademy } from '@/hooks/useMyAcademy';
import { useAcademyStudents, type Signal } from '@/hooks/useAcademyStudents';
import { toast } from 'sonner';

const SIGNAL_LABEL: Record<Signal, string> = {
  green: '그린',
  yellow: '옐로',
  red: '레드',
  unassessed: '미평가',
};

const SIGNAL_DOT: Record<Signal, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  unassessed: 'bg-gray-400',
};

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { academy, loading: academyLoading } = useMyAcademy();
  const { rows, loading: rowsLoading } = useAcademyStudents(academy?.id ?? null);
  const [filter, setFilter] = useState<Signal | 'all'>('all');

  const counts = useMemo(
    () => ({
      green: rows.filter((r) => r.signal === 'green').length,
      yellow: rows.filter((r) => r.signal === 'yellow').length,
      red: rows.filter((r) => r.signal === 'red').length,
      unassessed: rows.filter((r) => r.signal === 'unassessed').length,
    }),
    [rows],
  );

  const filtered = filter === 'all' ? rows : rows.filter((r) => r.signal === filter);

  const copyCode = () => {
    if (!academy) return;
    void navigator.clipboard.writeText(academy.code);
    toast.success('학원 코드를 복사했어요');
  };

  if (academyLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!academy) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-2">
        <h1 className="text-xl font-bold">연결된 학원이 없어요</h1>
        <p className="text-sm text-muted-foreground">
          마이치 운영팀에 학원 등록을 문의해 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 space-y-6 animate-reveal-up">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{academy.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">원생 {rows.length}명</p>
        <div className="mt-3 inline-flex items-center gap-2">
          <Badge variant="outline" className="font-mono">
            학원 코드: {academy.code}
          </Badge>
          <button
            onClick={copyCode}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            aria-label="학원 코드 복사"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 신호 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(['red', 'yellow', 'green', 'unassessed'] as Signal[]).map((s) => (
          <Card
            key={s}
            className={`p-4 rounded-2xl cursor-pointer transition-all ${
              filter === s ? 'ring-2 ring-primary shadow-md' : 'hover:shadow-sm'
            }`}
            onClick={() => setFilter(filter === s ? 'all' : s)}
          >
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${SIGNAL_DOT[s]}`} />
              <span className="text-xs font-medium">{SIGNAL_LABEL[s]}</span>
            </div>
            <div className="text-2xl font-bold mt-1">{counts[s]}</div>
          </Card>
        ))}
      </div>

      {filter !== 'all' && (
        <button
          className="text-xs text-muted-foreground underline"
          onClick={() => setFilter('all')}
        >
          필터 해제
        </button>
      )}

      {/* 원생 목록 */}
      <section className="space-y-3">
        {rowsLoading ? (
          <p className="text-center text-muted-foreground py-8">불러오는 중...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {filter === 'all' ? '연결된 원생이 아직 없어요.' : '해당 신호의 원생이 없어요.'}
          </p>
        ) : (
          filtered.map((r) => (
            <Card
              key={r.user_id}
              className="p-4 rounded-2xl flex items-center gap-3 cursor-pointer hover:shadow-md transition-all"
              onClick={() => navigate(`/admin/students/${r.user_id}`)}
            >
              <span className={`w-3 h-3 rounded-full shrink-0 ${SIGNAL_DOT[r.signal]}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold">{r.nickname ?? '(이름 미설정)'}</h3>
                  {r.grade && (
                    <Badge variant="outline" className="text-[10px]">
                      {r.grade}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  위험 영역 {r.risk_area_count}
                  {r.emotion_avg !== null && ` · 감정 ${Number(r.emotion_avg).toFixed(1)}`}
                  {r.last_activity_at &&
                    ` · 최근 활동 ${new Date(r.last_activity_at).toLocaleDateString('ko-KR')}`}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
