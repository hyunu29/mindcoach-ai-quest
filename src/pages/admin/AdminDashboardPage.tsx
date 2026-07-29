import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { Copy, ChevronRight, Loader2, Search, Info } from 'lucide-react';
import { useMyAcademy } from '@/hooks/useMyAcademy';
import { useAcademyStudents, type Signal, type StudentSignalRow } from '@/hooks/useAcademyStudents';
import { toast } from 'sonner';

type SortKey = 'signal' | 'name' | 'activity';

const SIGNAL_ORDER: Record<Signal, number> = {
  red: 1,
  yellow: 2,
  unassessed: 3,
  green: 4,
};

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
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('signal');

  const counts = useMemo(
    () => ({
      green: rows.filter((r) => r.signal === 'green').length,
      yellow: rows.filter((r) => r.signal === 'yellow').length,
      red: rows.filter((r) => r.signal === 'red').length,
      unassessed: rows.filter((r) => r.signal === 'unassessed').length,
    }),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = filter === 'all' ? rows : rows.filter((r) => r.signal === filter);
    const searched = q
      ? base.filter((r) => (r.nickname ?? '').toLowerCase().includes(q))
      : base;
    const sorted = [...searched];
    sorted.sort((a: StudentSignalRow, b: StudentSignalRow) => {
      if (sortKey === 'name') {
        return (a.nickname ?? '').localeCompare(b.nickname ?? '', 'ko');
      }
      if (sortKey === 'activity') {
        const ta = a.last_activity_at ? new Date(a.last_activity_at).getTime() : 0;
        const tb = b.last_activity_at ? new Date(b.last_activity_at).getTime() : 0;
        return tb - ta;
      }
      return SIGNAL_ORDER[a.signal] - SIGNAL_ORDER[b.signal];
    });
    return sorted;
  }, [rows, filter, query, sortKey]);

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

      {/* 검색 + 정렬 */}
      {(rows.length > 0 || !rowsLoading) && (
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="원생 이름 검색"
              className="pl-9 rounded-xl"
            />
          </div>
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="w-32 sm:w-40 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="signal">위험도순</SelectItem>
              <SelectItem value="name">이름순</SelectItem>
              <SelectItem value="activity">최근 활동순</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 원생 목록 */}
      <section className="space-y-3">
        {rowsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <Card className="p-6 rounded-2xl bg-primary/5 border-primary/20 border-dashed">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <h3 className="font-bold">아직 연결된 원생이 없어요</h3>
                <p className="text-muted-foreground">
                  원생에게 학원 코드 <span className="font-mono font-semibold text-foreground">{academy.code}</span>를 공유하면, 원생이 프로필에서 코드 입력 후 연결돼요.
                </p>
                <button
                  onClick={copyCode}
                  className="text-primary text-xs font-medium hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> 학원 코드 복사하기
                </button>
              </div>
            </div>
          </Card>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">
            {query ? '검색 결과가 없어요.' : '해당 신호의 원생이 없어요.'}
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
