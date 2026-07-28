# 학원 교직원 심리검사 통합 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 학원 관리자용 교직원 심리건강 자가 진단검사(30문항 4점 Likert, STAFF-1)를 시스템에 추가하고 `/admin/staff-test` 소개 페이지 + 응시/결과 흐름을 구축한다.

**Architecture:** `tests` 테이블에 `likert_min`/`likert_max`/`likert_labels`/`is_staff_only` 컬럼 추가하여 검사별 척도 저장. STAFF-1은 `is_staff_only=true`로 원생 목록에서 제외. TestTakingPage는 하드코딩된 5점 Likert 대신 검사 데이터의 척도 정보 사용. ResultsPage는 STAFF-1 전용 4구간 해석 분기. StaffTestIntroPage 신규(소개 + 지난 결과 + 응시 CTA).

**Tech Stack:** React 18 + TS + Vite + Supabase (Postgres + RLS), shadcn/ui, react-router-dom.

**Branch:** `vercel-migration` (production).

**참고 디자인 문서:** `docs/plans/2026-07-28-academy-staff-test-design.md`

---

### Task 1: DB — tests 테이블 확장

**Files:**
- Create: `supabase/migrations/20260728120000_tests_likert_and_staff.sql`

**Step 1: 마이그레이션**

```sql
alter table public.tests
  add column likert_min integer not null default 1,
  add column likert_max integer not null default 5,
  add column likert_labels jsonb,
  add column is_staff_only boolean not null default false;

create index idx_tests_is_staff_only on public.tests (is_staff_only) where is_staff_only;

comment on column public.tests.likert_min is 'Likert 척도 최소값 (기본 1)';
comment on column public.tests.likert_max is 'Likert 척도 최대값 (기본 5)';
comment on column public.tests.likert_labels is '척도별 라벨 배열. null이면 기본 라벨 사용';
comment on column public.tests.is_staff_only is 'true면 학원 관리자용 (원생 목록 제외)';
```

**Step 2: 커밋**

```bash
git add supabase/migrations/20260728120000_tests_likert_and_staff.sql
git commit -m "sql(tests): likert 척도 + is_staff_only 컬럼 추가"
```

---

### Task 2: DB — STAFF-1 seed 마이그레이션

**Files:**
- Create: `supabase/migrations/20260728120100_seed_staff_test.sql`

**Step 1: STAFF-1 seed SQL 작성**

30문항 JSON 배열은 디자인 문서 원본 문항 순서대로. 각 문항: `{ id, text, subdomain, subdomainEn, isReversed: false }`. subdomain은 한국어 그대로, subdomainEn은 영어 축약.

```sql
insert into public.tests (
  id, name, category, related_syndrome, description,
  question_count, duration_minutes,
  is_recommended, is_coming_soon, is_integrated, is_free, price_krw,
  likert_min, likert_max, likert_labels, is_staff_only,
  subdomains, questions
) values (
  'STAFF-1',
  '학원 교직원 심리건강 자가 진단검사',
  'STAFF',
  '교직원 번아웃',
  '학원 종사자의 우울, 감정소모, 근무환경 스트레스, 사회적 고립을 측정합니다.',
  30, 10,
  false, false, false, true, 0,
  0, 3,
  '["전혀 그렇지 않다", "가끔 그렇다 (주 1~2회)", "자주 그렇다 (주 3~4회)", "거의 항상 그렇다 (주 5회 이상)"]'::jsonb,
  true,
  '["정서적 및 신체적 우울 증상","학생 및 학부모 관리에 따른 감정소모","근무환경 및 직무 스트레스","사회적 고립 및 냉소성"]'::jsonb,
  '[
    {"id":1,"text":"아침에 눈을 뜰 때 깊은 무기력감이나 우울함을 느낀다.","subdomain":"정서적 및 신체적 우울 증상","subdomainEn":"Depression","isReversed":false},
    {"id":2,"text":"예전에 즐겁게 하던 일이나 취미 활동에 아무런 흥미를 느끼지 못한다.","subdomain":"정서적 및 신체적 우울 증상","subdomainEn":"Depression","isReversed":false},
    {"id":3,"text":"푹 자고 일어나도 피로가 저혀 풀리지 않거나, 오히려 온 몸이 묵직하다.","subdomain":"정서적 및 신체적 우울 증상","subdomainEn":"Depression","isReversed":false},
    {"id":4,"text":"이유 없이 눈물이 나거나 마음이 쉽게 쿵쾅거리고 불안해진다.","subdomain":"정서적 및 신체적 우울 증상","subdomainEn":"Depression","isReversed":false},
    {"id":5,"text":"식욕이 급격히 떨어지거나, 반대로 스트레스로 인한 폭식을 하게 된다.","subdomain":"정서적 및 신체적 우울 증상","subdomainEn":"Depression","isReversed":false},
    {"id":6,"text":"밤에 잠들기 어렵거나, 자다가 자주 깨서 다시 잠들지 못한다.","subdomain":"정서적 및 신체적 우울 증상","subdomainEn":"Depression","isReversed":false},
    {"id":7,"text":"내가 가치 없는 사람처럼 느껴지거나, 나만 뒤처지고 있다는 자괴감이 든다.","subdomain":"정서적 및 신체적 우울 증상","subdomainEn":"Depression","isReversed":false},
    {"id":8,"text":"하루 중 대부분의 시간에 마음이 멍하고 집중하기가 어렵다.","subdomain":"정서적 및 신체적 우울 증상","subdomainEn":"Depression","isReversed":false},
    {"id":9,"text":"학생들의 성적 하락이나 수시/정시 결과에 대해 과도한 죄책감이나 중압감을 느낀다.","subdomain":"학생 및 학부모 관리에 따른 감정소모","subdomainEn":"Consumption","isReversed":false},
    {"id":10,"text":"학생이나 학부모의 컴플레인(민원)을 접할 때 필요 이상으로 가슴이 답답하고 두렵다.","subdomain":"학생 및 학부모 관리에 따른 감정소모","subdomainEn":"Consumption","isReversed":false},
    {"id":11,"text":"학생들을 진심으로 대하기보다 영혼 없이 기계적으로 응대하게 된다.","subdomain":"학생 및 학부모 관리에 따른 감정소모","subdomainEn":"Consumption","isReversed":false},
    {"id":12,"text":"학생들의 둔감하거나 비협조적인 태도를 볼 때 감정 조절이 어렵고 울컥 화가 난다.","subdomain":"학생 및 학부모 관리에 따른 감정소모","subdomainEn":"Consumption","isReversed":false},
    {"id":13,"text":"상담이나 생활지도 업무를 앞두고 심한 부담감과 피하고 싶은 마음이 든다.","subdomain":"학생 및 학부모 관리에 따른 감정소모","subdomainEn":"Consumption","isReversed":false},
    {"id":14,"text":"학원 내에서 일어나는 학생 관련 문제나 사고가 모두 내 탓으로 느껴진다.","subdomain":"학생 및 학부모 관리에 따른 감정소모","subdomainEn":"Consumption","isReversed":false},
    {"id":15,"text":"퇴근 후(또는 휴게시간)에도 학생이나 학부모에게 연락이 올까 봐 불안해한다.","subdomain":"학생 및 학부모 관리에 따른 감정소모","subdomainEn":"Consumption","isReversed":false},
    {"id":16,"text":"학생들에게 더 이상 긍정적인 영향을 주지 못하는 ''무능한 선생님''이라는 생각이 든다.","subdomain":"학생 및 학부모 관리에 따른 감정소모","subdomainEn":"Consumption","isReversed":false},
    {"id":17,"text":"출근할 때나 학원 정문을 통과할 때 가슴이 답답하고 숨이 막히는 느낌을 느낀다.","subdomain":"근무환경 및 직무 스트레스","subdomainEn":"WorkStress","isReversed":false},
    {"id":18,"text":"과도한 근무 시간이나 불규칙한 생활 패턴으로 인해 삶의 균형이 깨졌다고 느낀다.","subdomain":"근무환경 및 직무 스트레스","subdomainEn":"WorkStress","isReversed":false},
    {"id":19,"text":"나에게 주어진 역할(강의/관리/입시 등)의 양이 혼자 감당하기 버겁다.","subdomain":"근무환경 및 직무 스트레스","subdomainEn":"WorkStress","isReversed":false},
    {"id":20,"text":"학원 특유의 폐쇄적이거나 고립된 환경 때문에 갇혀 있다는 답답함을 느낀다.","subdomain":"근무환경 및 직무 스트레스","subdomainEn":"WorkStress","isReversed":false},
    {"id":21,"text":"직장 내(동료, 상사, 원장 등)와의 소통이 원활하지 않고 혼자 고립된 것 같다.","subdomain":"근무환경 및 직무 스트레스","subdomainEn":"WorkStress","isReversed":false},
    {"id":22,"text":"나의 노력이 성과나 보상으로 충분히 인정받지 못한다고 느낀다.","subdomain":"근무환경 및 직무 스트레스","subdomainEn":"WorkStress","isReversed":false},
    {"id":23,"text":"쉬는 날에도 학원 업무나 학생 관리 생각에서 벗어나지 못한다.","subdomain":"근무환경 및 직무 스트레스","subdomainEn":"WorkStress","isReversed":false},
    {"id":24,"text":"이 일을 언제까지 계속 할 수 있을지 미래에 대한 불확실성으로 우울해진다.","subdomain":"근무환경 및 직무 스트레스","subdomainEn":"WorkStress","isReversed":false},
    {"id":25,"text":"퇴근 후나 쉬는 날에 가족, 친구 등 지인들과 연락하거나 만나는 것이 귀찮고 피하고 싶다.","subdomain":"사회적 고립 및 냉소성","subdomainEn":"Isolation","isReversed":false},
    {"id":26,"text":"타인에게 내 힘듦을 털어놓아도 아무것도 바뀌지 않을 것이라 생각하여 말을 아끼게 된다.","subdomain":"사회적 고립 및 냉소성","subdomainEn":"Isolation","isReversed":false},
    {"id":27,"text":"주변 사람들이 나를 이해하지 못하거나 나에게 관심이 없다고 느낀다.","subdomain":"사회적 고립 및 냉소성","subdomainEn":"Isolation","isReversed":false},
    {"id":28,"text":"\"다 의미없다\", \"어차피 안 될 것이다.\"와 같은 냉소적인 생각이 자주 든다.","subdomain":"사회적 고립 및 냉소성","subdomainEn":"Isolation","isReversed":false},
    {"id":29,"text":"혼자 있을 때 원인을 알 수 없는 외로움이나 고립감이 강하게 밀려온다.","subdomain":"사회적 고립 및 냉소성","subdomainEn":"Isolation","isReversed":false},
    {"id":30,"text":"현재 상황을 벗어날 수 있는 방법이 없다는 무기력함이나 절망감이 든다.","subdomain":"사회적 고립 및 냉소성","subdomainEn":"Isolation","isReversed":false}
  ]'::jsonb
)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  related_syndrome = excluded.related_syndrome,
  description = excluded.description,
  question_count = excluded.question_count,
  duration_minutes = excluded.duration_minutes,
  is_free = excluded.is_free,
  price_krw = excluded.price_krw,
  likert_min = excluded.likert_min,
  likert_max = excluded.likert_max,
  likert_labels = excluded.likert_labels,
  is_staff_only = excluded.is_staff_only,
  subdomains = excluded.subdomains,
  questions = excluded.questions;
```

**Step 2: 커밋**

```bash
git add supabase/migrations/20260728120100_seed_staff_test.sql
git commit -m "sql(tests): STAFF-1 학원 교직원 심리검사 30문항 seed"
```

---

### Task 3: TestsPage에 is_staff_only 필터 추가

**Files:**
- Modify: `src/pages/TestsPage.tsx` (line ~246 — fetch 쿼리)

**Step 1: fetch 쿼리에 필터 추가**

```tsx
const { data } = await supabase
  .from("tests")
  .select("*")
  .eq("is_staff_only", false)  // ← 이 줄 추가
  .order("is_coming_soon", { ascending: true })
  .order("category")
  .order("id");
```

**Step 2: 타입체크 + 커밋**

```bash
npx tsc --noEmit
git add src/pages/TestsPage.tsx
git commit -m "feat(tests): is_staff_only 검사는 원생 목록에서 제외"
```

---

### Task 4: TestTakingPage — 검사별 Likert 척도 반영

**Files:**
- Modify: `src/pages/TestTakingPage.tsx`

**Step 1: TestData 인터페이스에 likert 필드 추가**

라인 31 근처:
```tsx
interface TestData {
  id: string;
  name: string;
  category: string;
  related_syndrome: string;
  description: string;
  question_count: number;
  duration_minutes: number;
  is_recommended: boolean;
  is_coming_soon: boolean;
  is_integrated?: boolean;
  likert_min?: number;
  likert_max?: number;
  likert_labels?: string[] | null;
  subdomains: string[];
  questions: QuestionItem[];
}
```

**Step 2: 하드코딩된 likertOptions 제거, 검사 기반 파생값으로 대체**

라인 15-21 삭제. 컴포넌트 안에 useMemo 추가:

```tsx
const DEFAULT_LIKERT_LABELS = [
  "전혀 그렇지 않다",
  "그렇지 않다",
  "보통이다",
  "그렇다",
  "매우 그렇다",
];

// 컴포넌트 내부:
const likertOptions = useMemo(() => {
  const min = test?.likert_min ?? 1;
  const max = test?.likert_max ?? 5;
  const labels = test?.likert_labels;
  const count = max - min + 1;
  return Array.from({ length: count }, (_, i) => ({
    score: min + i,
    label: labels?.[i] ?? DEFAULT_LIKERT_LABELS[i] ?? `${min + i}점`,
  }));
}, [test]);
```

**Step 3: 반전 처리 공식 일반화 (line ~149)**

```tsx
const likertMin = test.likert_min ?? 1;
const likertMax = test.likert_max ?? 5;
const defaultAnswer = Math.floor((likertMin + likertMax) / 2);
// ...
questions.forEach((q, i) => {
  const raw = answers[i] ?? defaultAnswer;
  const score = q.isReversed ? (likertMax + likertMin - raw) : raw;
  // ... 나머지 동일
});
```

**Step 4: useMemo import 추가 (기존 라인 5)**

```tsx
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
```

**Step 5: 타입체크 + build + 커밋**

```bash
npx tsc --noEmit && npm run build
git add src/pages/TestTakingPage.tsx
git commit -m "feat(tests): TestTakingPage에 검사별 Likert 척도 반영"
```

---

### Task 5: ResultsPage — STAFF-1 전용 해석 문구

**Files:**
- Modify: `src/pages/ResultsPage.tsx`

**Step 1: STAFF-1 해석 헬퍼 추가**

파일 상단에 상수 + 함수:

```tsx
const STAFF_INTERPRETATIONS = [
  { min: 0, max: 22, level: 'safe', label: '정상범위', message: '현재 직무 스트레스를 적절하게 관리하고 계십니다. 주기적인 휴식과 환기로 건강한 상태 유지가 필요합니다.' },
  { min: 23, max: 44, level: 'caution', label: '경도 우울 및 경미한 번아웃', message: '직무 관련 스트레스와 감정 소모가 누적되고 있습니다. 휴식시간을 늘리고, 동료나 주변 사람들과 힘듦을 공유하는 것이 좋습니다.' },
  { min: 45, max: 66, level: 'warning', label: '중증도 우울 및 심각한 번아웃', message: '높은 수준의 우울감과 피로를 겪고 있습니다. 업무 우선순위를 조정하고, 전문 상담이나 심리적 지원 조치가 필요합니다.' },
  { min: 67, max: 90, level: 'danger', label: '고도 우울 위험군', message: '즉각적인 휴식과 전문적인 치료가 강력하게 권장됩니다.' },
] as const;

function getStaffInterpretation(totalScore: number) {
  return STAFF_INTERPRETATIONS.find((r) => totalScore >= r.min && totalScore <= r.max) ?? STAFF_INTERPRETATIONS[0];
}
```

**Step 2: 렌더링에 STAFF-1 분기 추가**

기존 렌더링에서 `test_id === 'STAFF-1'`이면 `getStaffInterpretation(total_score)` 사용하고, subdomains 요약 카드 위 또는 아래에 별도 해석 Card 표시:

```tsx
{result.test_id === 'STAFF-1' && (() => {
  const interp = getStaffInterpretation(result.total_score);
  return (
    <Card className="p-5 rounded-2xl">
      <div className="flex items-center gap-2 mb-2">
        <Badge className={`text-xs ${
          interp.level === 'safe' ? 'bg-green-500' :
          interp.level === 'caution' ? 'bg-yellow-500' :
          interp.level === 'warning' ? 'bg-orange-500' : 'bg-red-500'
        } text-white border-0`}>{interp.label}</Badge>
        <span className="text-sm text-muted-foreground">총점 {result.total_score} / 90</span>
      </div>
      <p className="text-sm leading-relaxed">{interp.message}</p>
    </Card>
  );
})()}
```

정확한 위치는 파일 구조에 따라 조정. 기존 리스크 뱃지 근처 or 하위 영역 요약 카드 앞에 배치.

**Step 3: 타입체크 + build + 커밋**

```bash
npx tsc --noEmit && npm run build
git add src/pages/ResultsPage.tsx
git commit -m "feat(results): STAFF-1 4구간 해석 문구 렌더링"
```

---

### Task 6: StaffTestIntroPage 신규

**Files:**
- Create: `src/pages/admin/StaffTestIntroPage.tsx`

**Step 1: 컴포넌트 작성**

```tsx
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
              <div className="text-2xl font-bold">{recent.total_score} <span className="text-sm text-muted-foreground">/ 90</span></div>
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
```

**Step 2: 타입체크 + 커밋**

```bash
npx tsc --noEmit
git add src/pages/admin/StaffTestIntroPage.tsx
git commit -m "feat(admin): StaffTestIntroPage — 교직원 심리검사 소개 페이지"
```

---

### Task 7: AdminLayout 사이드바 확장 + App.tsx 라우트

**Files:**
- Modify: `src/layouts/AdminLayout.tsx`
- Modify: `src/App.tsx`

**Step 1: AdminLayout 사이드바에 "교직원 심리검사" 링크 추가**

기존 "체험" 그룹의 "AI 코칭 체험" NavLink 아래에:
```tsx
<NavLink
  to="/admin/staff-test"
  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
  activeClassName="bg-primary/10 text-primary"
>
  <ClipboardCheck className="w-4 h-4" />
  교직원 심리검사
</NavLink>
```

**Step 2: App.tsx에 라우트 추가**

```tsx
import StaffTestIntroPage from './pages/admin/StaffTestIntroPage';
// ...
<Route element={<AdminLayout />}>
  {/* 기존 admin 라우트들 */}
  <Route
    path="/admin/staff-test"
    element={
      <ProtectedRoute requiredUserType="academy_admin">
        <StaffTestIntroPage />
      </ProtectedRoute>
    }
  />
</Route>
```

**Step 3: 타입체크 + build + 커밋**

```bash
npx tsc --noEmit && npm run build
git add src/layouts/AdminLayout.tsx src/App.tsx
git commit -m "feat(admin): /admin/staff-test 라우트 + 사이드바 링크"
```

---

### Task 8: 배포 + 검증

**Files:** 없음

**Step 1: DB 마이그레이션 apply (2개)**

```bash
supabase db push --linked
```

Expected: 2개 마이그레이션 apply
- `20260728120000_tests_likert_and_staff.sql`
- `20260728120100_seed_staff_test.sql`

**Step 2: git push + Vercel 배포**

```bash
git push origin vercel-migration
vercel deploy --prod --yes
```

**Step 3: 라이브 검증**

관리자 계정(`admin+test@mych.ai`) 로그인 → 사이드바 "교직원 심리검사" 클릭:
- `/admin/staff-test` 소개 페이지 표시
- 4개 영역 · 30문항 · 10분 표시
- "검사 시작하기" 클릭 → `/tests/STAFF-1` 이동
- 4점 Likert 옵션 표시 (0/1/2/3 + 4개 라벨)
- 30문항 응시 완료 → 결과 페이지에 총점 및 4구간 해석 문구
- `/admin/staff-test` 재접속 시 "지난 응시 결과" 카드 노출

원생 계정에서 `/tests` 접속 시 STAFF-1 목록에 안 보이는지 확인.

---

## 실패 시 롤백

- 각 태스크 별도 커밋 → `git revert <sha>`
- Vercel 이전 배포로 promote
- DB `alter table tests drop column ...` 및 `delete from tests where id = 'STAFF-1'`

## 스코프 밖 (v3+)

- 관리자 응시 히스토리 페이지 (다회 응시 결과 나열)
- 학원 여러 교직원 응시 집계 대시보드
- 문항별 커스텀 옵션 라벨 (v2)
