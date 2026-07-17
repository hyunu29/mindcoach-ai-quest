# B2B 학원 관리자 대시보드 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 학원 관리자가 원생 심리 신호(그린/옐로/레드)를 대시보드에서 확인하고, 원생은 학원 코드로 자기 계정을 학원에 연결하는 B2B POC MVP를 배포한다.

**Architecture:** `academies` 테이블 + `profiles.academy_id` 단일 컬럼 관계. 신호는 Postgres RPC로 실시간 계산 (최근 30일 test_results subdomain_scores + emotion_records.emotion_score). 관리자 전용 `/admin/*` 라우트, RLS로 자기 학원 원생 데이터만 select. 학원 프로비저닝은 슈퍼 어드민이 SQL 함수로 수행.

**Tech Stack:** React 18 + TypeScript + Vite + Supabase (Postgres + Auth + RLS), shadcn/ui, TanStack Query, react-router-dom, recharts (감정 트렌드 차트).

**Branch:** `vercel-migration` (production).

**참고 디자인 문서:** `docs/plans/2026-07-15-b2b-academy-admin-design.md`

---

## 사전 확인

- `profiles.user_type` 이미 `('student','academy_admin','super_admin')` CHECK 있음 → 재사용
- INT 검사 결과 `scores.subdomain_scores` (한글 도메인명 → 점수) 형태
- `emotion_records.emotion_score` (1~5)
- `test_results.risk_level` 컬럼 존재 (`low`/`medium`/`high`)

---

### Task 1: DB 마이그레이션 — academies 테이블 + profiles.academy_id + RLS

**목표:** 학원 데이터 모델 세팅. 관리자가 자기 학원 정보 + 원생 정보 select 가능하도록 RLS.

**Files:**
- Create: `supabase/migrations/20260715120000_academies_and_admin_dashboard.sql`

**Step 1: 마이그레이션 파일 생성**

```sql
-- =============================================================
-- Academies + admin dashboard RLS
-- 학원 관리자가 자기 학원 원생들의 심리 신호를 열람
-- =============================================================

-- 1. academies 테이블
create table public.academies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  admin_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index idx_academies_code_lower on public.academies (lower(code));
create index idx_academies_admin_user_id on public.academies (admin_user_id);

comment on table public.academies is '학원 조직 (B2B POC)';
comment on column public.academies.code is '원생이 입력해서 학원에 연결하는 공유 코드';
comment on column public.academies.admin_user_id is '학원 관리자 (profile.user_type = academy_admin)';

alter table public.academies enable row level security;

-- 관리자: 자기 학원만 select
create policy "academy_admin selects own academy"
  on public.academies for select to authenticated
  using (admin_user_id = auth.uid());

-- 원생: 코드 조회 시 name 확인 필요 → SECURITY DEFINER 함수로 별도 노출 (다음 마이그레이션에서 처리)

-- 2. profiles.academy_id 컬럼
alter table public.profiles
  add column academy_id uuid references public.academies(id) on delete set null,
  add column academy_joined_at timestamptz;

create index idx_profiles_academy_id on public.profiles (academy_id);

-- 관리자: 자기 학원 원생 profiles select
create policy "academy_admin selects own students profiles"
  on public.profiles for select to authenticated
  using (
    academy_id in (select id from public.academies where admin_user_id = auth.uid())
  );

-- 3. test_results / emotion_records 관리자 select 정책 (정량 데이터만)
create policy "academy_admin selects own students test_results"
  on public.test_results for select to authenticated
  using (
    user_id in (
      select id from public.profiles
      where academy_id in (select id from public.academies where admin_user_id = auth.uid())
    )
  );

create policy "academy_admin selects own students emotion_records"
  on public.emotion_records for select to authenticated
  using (
    user_id in (
      select id from public.profiles
      where academy_id in (select id from public.academies where admin_user_id = auth.uid())
    )
  );

-- 4. 학원 코드로 학원 조회 (원생용 SECURITY DEFINER)
create or replace function public.get_academy_by_code(p_code text)
returns table (id uuid, name text)
language sql security definer
set search_path = public
as $$
  select id, name from public.academies where lower(code) = lower(p_code);
$$;

grant execute on function public.get_academy_by_code(text) to authenticated;
```

**Step 2: 마이그레이션 dry-run**

```
supabase db push --linked --dry-run
```

Expected: `20260715120000_academies_and_admin_dashboard.sql` 하나 나열됨

**Step 3: 커밋 (아직 실제 apply는 안 함 — Task 10에서 배포 전에 한 번에)**

```bash
git add supabase/migrations/20260715120000_academies_and_admin_dashboard.sql
git commit -m "sql(academies): 학원 테이블 + profiles.academy_id + RLS"
```

---

### Task 2: 신호 계산 RPC 함수

**목표:** 대시보드에서 실시간으로 원생별 신호 계산. `calculate_academy_signals(academy_id)`가 원생 목록 + 신호를 한 번에 반환.

**Files:**
- Create: `supabase/migrations/20260715120100_signal_calculation_rpc.sql`

**Step 1: 마이그레이션 파일**

```sql
-- =============================================================
-- 신호 계산 RPC
-- 최근 30일 test_results + emotion_records → 그린/옐로/레드/미평가
-- =============================================================

create or replace function public.calculate_student_signal(p_user_id uuid)
returns table (
  user_id uuid,
  risk_area_count integer,
  emotion_avg numeric,
  emotion_record_count integer,
  test_result_count integer,
  last_activity_at timestamptz,
  signal text  -- 'green' | 'yellow' | 'red' | 'unassessed'
)
language plpgsql security definer
set search_path = public
as $$
declare
  v_risk_count integer := 0;
  v_emotion_avg numeric := null;
  v_emotion_count integer := 0;
  v_test_count integer := 0;
  v_last_activity timestamptz := null;
  v_signal text;
  v_int_result record;
  v_domain_threshold constant integer := 12;  -- 25점 만점 중 12 미만 = 위험
begin
  -- INT 검사 최신 결과에서 위험 영역 개수
  select tr.scores, tr.created_at into v_int_result
  from public.test_results tr
  where tr.user_id = p_user_id
    and tr.test_id = 'INT'
    and tr.created_at >= now() - interval '30 days'
  order by tr.created_at desc
  limit 1;

  if v_int_result.scores is not null then
    -- subdomain_scores jsonb에서 threshold 미만 카운트
    select count(*)::int into v_risk_count
    from jsonb_each_text(v_int_result.scores -> 'subdomain_scores') e
    where (e.value)::numeric < v_domain_threshold;
  end if;

  -- 개별 단품 검사 위험 등급 카운트 (최근 30일)
  v_risk_count := v_risk_count + coalesce(
    (select count(*)::int
     from public.test_results
     where user_id = p_user_id
       and test_id <> 'INT'
       and risk_level = 'high'
       and created_at >= now() - interval '30 days'), 0);

  -- 감정 평균 (최근 30일)
  select avg(emotion_score)::numeric(4,2), count(*)::int
    into v_emotion_avg, v_emotion_count
  from public.emotion_records
  where user_id = p_user_id
    and recorded_at >= now() - interval '30 days';

  -- 검사 응시 횟수 (최근 30일)
  select count(*)::int into v_test_count
  from public.test_results
  where user_id = p_user_id
    and created_at >= now() - interval '30 days';

  -- 최근 활동
  select greatest(
    (select max(created_at) from public.test_results where user_id = p_user_id),
    (select max(recorded_at) from public.emotion_records where user_id = p_user_id)
  ) into v_last_activity;

  -- 신호 결정
  if v_test_count = 0 and v_emotion_count = 0 then
    v_signal := 'unassessed';
  elsif v_risk_count >= 3 or (v_emotion_avg is not null and v_emotion_avg < 2.5) then
    v_signal := 'red';
  elsif v_risk_count between 1 and 2 or (v_emotion_avg is not null and v_emotion_avg < 3.5) then
    v_signal := 'yellow';
  else
    v_signal := 'green';
  end if;

  return query select
    p_user_id, v_risk_count, v_emotion_avg, v_emotion_count,
    v_test_count, v_last_activity, v_signal;
end;
$$;

grant execute on function public.calculate_student_signal(uuid) to authenticated;

-- 학원 관리자용: 학원 전체 원생 신호 집계
create or replace function public.calculate_academy_signals(p_academy_id uuid)
returns table (
  user_id uuid,
  nickname text,
  school_name text,
  grade text,
  risk_area_count integer,
  emotion_avg numeric,
  last_activity_at timestamptz,
  signal text
)
language plpgsql security definer
set search_path = public
as $$
begin
  -- 호출자 권한 체크: 자기 학원만 조회 가능
  if not exists (
    select 1 from public.academies
    where id = p_academy_id and admin_user_id = auth.uid()
  ) then
    raise exception 'unauthorized: not the admin of this academy';
  end if;

  return query
  select
    p.id as user_id,
    p.nickname,
    p.school_name,
    p.grade,
    s.risk_area_count,
    s.emotion_avg,
    s.last_activity_at,
    s.signal
  from public.profiles p
  cross join lateral public.calculate_student_signal(p.id) s
  where p.academy_id = p_academy_id
  order by
    case s.signal
      when 'red' then 1
      when 'yellow' then 2
      when 'unassessed' then 3
      when 'green' then 4
    end,
    p.nickname;
end;
$$;

grant execute on function public.calculate_academy_signals(uuid) to authenticated;
```

**Step 2: 커밋**

```bash
git add supabase/migrations/20260715120100_signal_calculation_rpc.sql
git commit -m "sql(signal): 원생 신호 계산 RPC + 학원 대시보드 집계 RPC"
```

---

### Task 3: 학원 프로비저닝 함수 + 런북

**목표:** 슈퍼 어드민이 SQL 한 번으로 학원+관리자 계정 생성. 오퍼레이션 매뉴얼 작성.

**Files:**
- Create: `supabase/migrations/20260715120200_academy_provisioning.sql`
- Create: `docs/runbooks/2026-07-15-academy-provisioning.md`

**Step 1: 프로비저닝 함수**

```sql
-- =============================================================
-- 학원 프로비저닝 (슈퍼 어드민 전용)
-- SQL Editor에서 직접 호출
-- =============================================================

create or replace function public.provision_academy(
  p_academy_name text,
  p_admin_user_id uuid,  -- 이메일 회원가입 후 auth.users.id 전달
  p_code text
)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_academy_id uuid;
begin
  -- 관리자 user_type 승격
  update public.profiles
     set user_type = 'academy_admin'
   where id = p_admin_user_id;

  -- 학원 생성
  insert into public.academies(name, code, admin_user_id, created_by)
  values (p_academy_name, p_code, p_admin_user_id, auth.uid())
  returning id into v_academy_id;

  return v_academy_id;
end;
$$;

-- 슈퍼 어드민만 실행 (RLS 없이 revoke → 특정 role만 grant는 어려우니 SECURITY DEFINER + 호출 시 auth.uid() 체크)
-- 초기엔 SQL Editor에서만 실행하므로 grant 안 함
```

**Step 2: 런북 작성**

```markdown
# 학원 프로비저닝 런북

## 프로세스

1. **학원 관리자 이메일 등록** (Supabase Auth Dashboard)
   - Dashboard → Authentication → Users → Invite user
   - 이메일: `admin@<학원도메인>` 또는 우리가 관리하는 임시 이메일
   - 임시 비밀번호: 자동 생성 후 학원장에게 전달

2. **auth.users.id 확인**
   - Users 리스트에서 새로 생성된 유저 클릭 → `User UID` 복사

3. **SQL Editor에서 프로비저닝**
   ```sql
   select public.provision_academy(
     '서울대치학원',                 -- 학원 이름
     '<복사한 uuid>'::uuid,          -- 관리자 user id
     'MYCH-2601'                      -- 학원 코드 (공유용, 대소문자 무관)
   );
   ```
   반환되는 academy_id 기록.

4. **학원장에게 전달**
   - 로그인 URL: `https://mindcoach-ai-quest.vercel.app/auth`
   - 이메일 + 임시 비밀번호
   - 학원 코드 (원생 배포용): `MYCH-2601`

5. **첫 로그인 시 학원장이 비밀번호 변경**
   - `/profile`에서 (또는 Supabase Auth 이메일 기반 재설정)

## 학원 코드 명명 규칙

- 형식: `<학원약칭>-<연월>` 예: `MYCH-2601`, `MEIN-2607`
- 대소문자 무관 (lower 인덱스 존재)
- 유니크 제약 있음 (중복 불가)

## 회수/재발급

- 학원 계약 종료 시:
  ```sql
  update public.academies set code = code || '-EXPIRED' where id = '<academy_id>';
  update public.profiles set user_type = 'student' where id = '<admin_user_id>';
  ```
```

**Step 3: 커밋**

```bash
git add supabase/migrations/20260715120200_academy_provisioning.sql docs/runbooks/2026-07-15-academy-provisioning.md
git commit -m "sql(academies): provision_academy 함수 + 프로비저닝 런북"
```

---

### Task 4: ProtectedRoute academy_admin 가드 + AdminLayout

**목표:** `/admin/*` 접근 시 `user_type === 'academy_admin'` 검사. AdminLayout에 관리자 전용 사이드바.

**Files:**
- Modify: `src/components/ProtectedRoute.tsx` (props에 `requiredUserType` 추가)
- Create: `src/layouts/AdminLayout.tsx`

**Step 1: ProtectedRoute 확장**

```tsx
// src/components/ProtectedRoute.tsx
interface Props {
  children: React.ReactNode;
  requiredUserType?: 'student' | 'academy_admin' | 'super_admin';
}

export default function ProtectedRoute({ children, requiredUserType }: Props) {
  // 기존 auth 체크 + profile.user_type 로드
  // requiredUserType 불일치 시 → 학원 관리자면 /admin, 원생이면 /dashboard로 리다이렉트
}
```

**Step 2: AdminLayout**

```tsx
// src/layouts/AdminLayout.tsx
import { Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, Settings } from 'lucide-react';
import { NavLink } from '@/components/NavLink';

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden md:flex flex-col w-56 border-r bg-card p-4">
        <div className="font-bold text-lg mb-8 px-2">마이치 관리자</div>
        <nav className="flex flex-col gap-1">
          <NavLink to="/admin" end icon={<LayoutDashboard />}>대시보드</NavLink>
          <NavLink to="/admin/settings" icon={<Settings />}>학원 정보</NavLink>
        </nav>
      </aside>
      <main className="flex-1"><Outlet /></main>
    </div>
  );
}
```

**Step 3: 커밋**

```bash
git add src/components/ProtectedRoute.tsx src/layouts/AdminLayout.tsx
git commit -m "feat(admin): AdminLayout + ProtectedRoute academy_admin 가드"
```

---

### Task 5: /admin 대시보드 페이지

**목표:** 원생 목록 + 신호 요약. RPC `calculate_academy_signals` 호출.

**Files:**
- Create: `src/pages/admin/AdminDashboardPage.tsx`
- Create: `src/hooks/useAcademyStudents.ts`
- Modify: `src/App.tsx` (라우트 추가)

**Step 1: useAcademyStudents 훅**

```tsx
// src/hooks/useAcademyStudents.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type Signal = 'green' | 'yellow' | 'red' | 'unassessed';

export interface StudentSignalRow {
  user_id: string;
  nickname: string | null;
  school_name: string | null;
  grade: string | null;
  risk_area_count: number;
  emotion_avg: number | null;
  last_activity_at: string | null;
  signal: Signal;
}

export function useAcademyStudents(academyId: string | null) {
  const [rows, setRows] = useState<StudentSignalRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!academyId) return;
    const run = async () => {
      const { data, error } = await supabase.rpc('calculate_academy_signals', {
        p_academy_id: academyId,
      });
      if (!error && data) setRows(data as StudentSignalRow[]);
      setLoading(false);
    };
    void run();
  }, [academyId]);

  return { rows, loading };
}
```

**Step 2: 관리자의 학원 조회 훅 (my academy)**

```tsx
// src/hooks/useMyAcademy.ts
export function useMyAcademy() {
  const [academy, setAcademy] = useState<{ id: string; name: string; code: string } | null>(null);
  useEffect(() => {
    supabase.from('academies').select('id, name, code').maybeSingle().then(({ data }) => {
      if (data) setAcademy(data);
    });
  }, []);
  return academy;
}
```

**Step 3: AdminDashboardPage 컴포넌트**

```tsx
// src/pages/admin/AdminDashboardPage.tsx
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Copy, ChevronRight } from 'lucide-react';
import { useMyAcademy } from '@/hooks/useMyAcademy';
import { useAcademyStudents, type Signal } from '@/hooks/useAcademyStudents';
import { toast } from 'sonner';

const SIGNAL_LABEL: Record<Signal, string> = {
  green: '그린', yellow: '옐로', red: '레드', unassessed: '미평가',
};
const SIGNAL_COLOR: Record<Signal, string> = {
  green: 'bg-green-500', yellow: 'bg-yellow-500',
  red: 'bg-red-500', unassessed: 'bg-gray-400',
};

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const academy = useMyAcademy();
  const { rows, loading } = useAcademyStudents(academy?.id ?? null);
  const [filter, setFilter] = useState<Signal | 'all'>('all');

  const counts = useMemo(() => ({
    green: rows.filter((r) => r.signal === 'green').length,
    yellow: rows.filter((r) => r.signal === 'yellow').length,
    red: rows.filter((r) => r.signal === 'red').length,
    unassessed: rows.filter((r) => r.signal === 'unassessed').length,
  }), [rows]);

  const filtered = filter === 'all' ? rows : rows.filter((r) => r.signal === filter);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 space-y-6">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">{academy?.name ?? '학원 대시보드'}</h1>
        <p className="text-sm text-muted-foreground mt-1">원생 {rows.length}명</p>
        {academy && (
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="outline">학원 코드: <span className="font-mono ml-1">{academy.code}</span></Badge>
            <button onClick={() => {
              navigator.clipboard.writeText(academy.code);
              toast.success('학원 코드를 복사했어요');
            }} className="p-1.5 rounded-md hover:bg-muted">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        )}
      </header>

      {/* 신호 요약 */}
      <div className="grid grid-cols-4 gap-3">
        {(['green', 'yellow', 'red', 'unassessed'] as Signal[]).map((s) => (
          <Card key={s} className={`p-4 rounded-2xl cursor-pointer ${filter === s ? 'ring-2 ring-primary' : ''}`}
                onClick={() => setFilter(filter === s ? 'all' : s)}>
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${SIGNAL_COLOR[s]}`} />
              <span className="text-xs">{SIGNAL_LABEL[s]}</span>
            </div>
            <div className="text-2xl font-bold mt-1">{counts[s]}</div>
          </Card>
        ))}
      </div>

      {/* 원생 목록 */}
      <section className="space-y-3">
        {loading ? (
          <p className="text-center text-muted-foreground py-8">불러오는 중...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">해당 신호의 원생이 없어요.</p>
        ) : (
          filtered.map((r) => (
            <Card key={r.user_id} className="p-4 rounded-2xl flex items-center gap-3 cursor-pointer hover:shadow-md"
                  onClick={() => navigate(`/admin/students/${r.user_id}`)}>
              <span className={`w-3 h-3 rounded-full shrink-0 ${SIGNAL_COLOR[r.signal]}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold">{r.nickname ?? '(이름 미설정)'}</h3>
                  {r.grade && <Badge variant="outline" className="text-[10px]">{r.grade}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  위험 영역 {r.risk_area_count}
                  {r.emotion_avg !== null && ` · 감정 ${r.emotion_avg.toFixed(1)}`}
                  {r.last_activity_at && ` · 최근 활동 ${new Date(r.last_activity_at).toLocaleDateString('ko-KR')}`}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
```

**Step 4: 라우트 추가 (`src/App.tsx`)**

```tsx
import AdminLayout from './layouts/AdminLayout';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
// ...
<Route element={<AdminLayout />}>
  <Route path="/admin" element={<ProtectedRoute requiredUserType="academy_admin"><AdminDashboardPage /></ProtectedRoute>} />
</Route>
```

**Step 5: 타입체크 + 빌드 + 커밋**

```bash
npx tsc --noEmit && npm run build
git add src/pages/admin/AdminDashboardPage.tsx src/hooks/useAcademyStudents.ts src/hooks/useMyAcademy.ts src/App.tsx
git commit -m "feat(admin): /admin 대시보드 (원생 목록 + 신호 요약)"
```

---

### Task 6: /admin/students/:id 원생 상세

**목표:** 원생 개별 상세. 신호 근거, 검사 결과, 감정 트렌드, 프라이버시 배너.

**Files:**
- Create: `src/pages/admin/AdminStudentDetailPage.tsx`
- Modify: `src/App.tsx`

**Step 1: 컴포넌트 (핵심만)**

```tsx
// src/pages/admin/AdminStudentDetailPage.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface StudentDetail {
  profile: { id: string; nickname: string | null; school_name: string | null; grade: string | null };
  signal: { signal: string; risk_area_count: number; emotion_avg: number | null };
  intResult: { scores: { subdomain_scores: Record<string, number> } | null; created_at: string } | null;
  individualResults: Array<{ test_id: string; risk_level: string | null; created_at: string }>;
  emotionTrend: Array<{ date: string; score: number }>;
}

export default function AdminStudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<StudentDetail | null>(null);

  useEffect(() => {
    if (!id) return;
    void loadDetail();

    async function loadDetail() {
      const [profileRes, signalRes, intRes, indivRes, emotionRes] = await Promise.all([
        supabase.from('profiles').select('id, nickname, school_name, grade').eq('id', id).single(),
        supabase.rpc('calculate_student_signal', { p_user_id: id }).single(),
        supabase.from('test_results').select('scores, created_at').eq('user_id', id).eq('test_id', 'INT').order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('test_results').select('test_id, risk_level, created_at').eq('user_id', id).neq('test_id', 'INT').order('created_at', { ascending: false }).limit(10),
        supabase.from('emotion_records').select('emotion_score, recorded_at').eq('user_id', id).gte('recorded_at', new Date(Date.now() - 30 * 86400000).toISOString()).order('recorded_at'),
      ]);
      if (profileRes.data && signalRes.data) {
        setDetail({
          profile: profileRes.data,
          signal: signalRes.data as any,
          intResult: intRes.data as any,
          individualResults: (indivRes.data ?? []) as any,
          emotionTrend: (emotionRes.data ?? []).map((r: any) => ({ date: r.recorded_at, score: r.emotion_score })),
        });
      }
    }
  }, [id]);

  if (!detail) return <div className="p-8">불러오는 중...</div>;

  const domainThreshold = 12;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 md:py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{detail.profile.nickname ?? '(이름 미설정)'}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {detail.profile.school_name} {detail.profile.grade && `· ${detail.profile.grade}`}
        </p>
      </header>

      {/* 신호 카드 */}
      <Card className="p-5 rounded-2xl">
        <div className="flex items-center gap-3">
          <span className={`w-4 h-4 rounded-full ${
            detail.signal.signal === 'red' ? 'bg-red-500' :
            detail.signal.signal === 'yellow' ? 'bg-yellow-500' :
            detail.signal.signal === 'green' ? 'bg-green-500' : 'bg-gray-400'
          }`} />
          <h2 className="text-lg font-bold">
            {detail.signal.signal === 'red' ? '레드' : detail.signal.signal === 'yellow' ? '옐로' : detail.signal.signal === 'green' ? '그린' : '미평가'}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          위험 영역 {detail.signal.risk_area_count}개
          {detail.signal.emotion_avg !== null && ` · 감정 평균 ${detail.signal.emotion_avg.toFixed(1)} / 5.0`}
          {' '}(최근 30일)
        </p>
      </Card>

      {/* 통합검사 결과 */}
      {detail.intResult && (
        <Card className="p-5 rounded-2xl">
          <h2 className="font-bold mb-3">통합검사 결과 ({new Date(detail.intResult.created_at).toLocaleDateString('ko-KR')})</h2>
          <div className="space-y-1.5">
            {Object.entries(detail.intResult.scores.subdomain_scores).map(([domain, score]) => (
              <div key={domain} className="flex items-center gap-2 text-sm">
                <span className={`w-2 h-2 rounded-full ${(score as number) < domainThreshold ? 'bg-red-500' : 'bg-green-500'}`} />
                <span className="flex-1">{domain}</span>
                <Badge variant={(score as number) < domainThreshold ? 'destructive' : 'outline'} className="text-[10px]">
                  {(score as number) < domainThreshold ? '위험' : '보통'} ({score}/25)
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 감정 트렌드 */}
      {detail.emotionTrend.length > 0 && (
        <Card className="p-5 rounded-2xl">
          <h2 className="font-bold mb-3">감정 트렌드 (30일)</h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={detail.emotionTrend}>
                <XAxis dataKey="date" tickFormatter={(v) => new Date(v).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })} tick={{ fontSize: 10 }} />
                <YAxis domain={[1, 5]} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground mt-2">기록 {detail.emotionTrend.length}회</p>
        </Card>
      )}

      {/* 개별 검사 이력 */}
      {detail.individualResults.length > 0 && (
        <Card className="p-5 rounded-2xl">
          <h2 className="font-bold mb-3">개별 검사 이력</h2>
          <div className="space-y-1.5">
            {detail.individualResults.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span>{r.test_id}</span>
                <div className="flex items-center gap-2">
                  {r.risk_level && (
                    <Badge variant={r.risk_level === 'high' ? 'destructive' : 'outline'} className="text-[10px]">
                      {r.risk_level === 'high' ? '위험' : r.risk_level === 'medium' ? '보통' : '안전'}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 프라이버시 배너 */}
      <Card className="p-4 rounded-2xl bg-muted/50">
        <div className="flex gap-2 text-xs text-muted-foreground">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p>감정 메모 원문과 AI 코칭 대화 내용은 학원에서 볼 수 없습니다. 원생의 사적 표현을 보호하기 위한 원칙입니다.</p>
        </div>
      </Card>
    </div>
  );
}
```

**Step 2: 라우트 추가**

```tsx
<Route path="/admin/students/:id" element={<ProtectedRoute requiredUserType="academy_admin"><AdminStudentDetailPage /></ProtectedRoute>} />
```

**Step 3: 커밋**

```bash
git add src/pages/admin/AdminStudentDetailPage.tsx src/App.tsx
git commit -m "feat(admin): /admin/students/:id 원생 상세 (신호 + 검사 + 감정 트렌드)"
```

---

### Task 7: /admin/settings 학원 정보

**목표:** 학원명, 코드, 관리자 이메일 조회. (수정 기능은 v2)

**Files:**
- Create: `src/pages/admin/AdminSettingsPage.tsx`
- Modify: `src/App.tsx`

**Step 1: 컴포넌트**

```tsx
// src/pages/admin/AdminSettingsPage.tsx
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy } from 'lucide-react';
import { useMyAcademy } from '@/hooks/useMyAcademy';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const academy = useMyAcademy();
  if (!academy) return <div className="p-8">불러오는 중...</div>;
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-4">
      <h1 className="text-2xl font-bold">학원 정보</h1>
      <Card className="p-5 rounded-2xl space-y-3">
        <div>
          <div className="text-xs text-muted-foreground">학원명</div>
          <div className="font-medium mt-0.5">{academy.name}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">학원 코드 (원생 공유용)</div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="font-mono">{academy.code}</Badge>
            <button onClick={() => {
              navigator.clipboard.writeText(academy.code);
              toast.success('복사했어요');
            }} className="p-1.5 rounded-md hover:bg-muted">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground pt-2 border-t">
          학원명이나 코드 변경이 필요하면 마이치 운영팀에 문의해 주세요.
        </p>
      </Card>
    </div>
  );
}
```

**Step 2: 라우트 + 커밋**

```tsx
<Route path="/admin/settings" element={<ProtectedRoute requiredUserType="academy_admin"><AdminSettingsPage /></ProtectedRoute>} />
```

```bash
git add src/pages/admin/AdminSettingsPage.tsx src/App.tsx
git commit -m "feat(admin): /admin/settings 학원 정보"
```

---

### Task 8: 원생 온보딩/프로필 학원 코드 입력 + 프라이버시 모달

**목표:** 원생이 학원 코드로 자기 계정 연결. 최초 연결 시 프라이버시 모달 표시.

**Files:**
- Create: `src/components/academy/AcademyCodeInput.tsx`
- Create: `src/components/academy/PrivacyDisclosureModal.tsx`
- Modify: `src/pages/OnboardingPage.tsx`
- Modify: `src/pages/ProfilePage.tsx`

**Step 1: AcademyCodeInput 컴포넌트**

```tsx
// src/components/academy/AcademyCodeInput.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  onConnected: (academy: { id: string; name: string }) => void;
}

export default function AcademyCodeInput({ onConnected }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setLoading(true);
    const { data, error: err } = await supabase.rpc('get_academy_by_code', { p_code: code.trim() });
    setLoading(false);
    if (err || !data || (data as any[]).length === 0) {
      setError('이 코드에 해당하는 학원이 없어요');
      return;
    }
    const academy = (data as any[])[0];
    onConnected(academy);
  };

  return (
    <div>
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="예: MYCH-2601"
          className="flex-1"
        />
        <Button onClick={submit} disabled={!code.trim() || loading}>
          {loading ? '확인 중...' : '연결'}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
    </div>
  );
}
```

**Step 2: PrivacyDisclosureModal**

```tsx
// src/components/academy/PrivacyDisclosureModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, Lock } from 'lucide-react';

interface Props {
  open: boolean;
  academyName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function PrivacyDisclosureModal({ open, academyName, onConfirm, onCancel }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{academyName}과 공유되는 정보</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="flex items-center gap-1.5 font-semibold mb-2 text-primary">
              <Check className="w-4 h-4" /> 학원이 볼 수 있는 정보
            </h3>
            <ul className="space-y-1 text-muted-foreground ml-5 list-disc">
              <li>3색 심리 신호 (그린/옐로/레드)</li>
              <li>검사 위험 영역 개수</li>
              <li>감정 점수 평균</li>
              <li>검사 응시 이력</li>
            </ul>
          </div>
          <div>
            <h3 className="flex items-center gap-1.5 font-semibold mb-2">
              <Lock className="w-4 h-4" /> 학원이 볼 수 없는 정보
            </h3>
            <ul className="space-y-1 text-muted-foreground ml-5 list-disc">
              <li>감정 메모 원문</li>
              <li>AI 코칭 대화 내용</li>
              <li>개별 문항 응답 답변</li>
            </ul>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={onCancel}>취소</Button>
          <Button className="flex-1" onClick={onConfirm}>동의하고 연결</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 3: OnboardingPage에 학원 코드 필드 추가 (선택 입력)**

기존 온보딩 스텝에 "학원 코드 (선택)" 필드 추가. Skip 가능. 입력 시 PrivacyDisclosureModal 표시 → 동의하면 profiles.academy_id, academy_joined_at 세팅.

**Step 4: ProfilePage에 학원 연결 카드 추가**

`profile.academy_id`가 있으면 "OO학원 연결됨" 표시, 없으면 AcademyCodeInput.

**Step 5: 커밋**

```bash
git add src/components/academy/ src/pages/OnboardingPage.tsx src/pages/ProfilePage.tsx
git commit -m "feat(academy): 원생 학원 코드 입력 UI + 프라이버시 고지 모달"
```

---

### Task 9: 로그인 후 라우팅 로직

**목표:** 로그인 시 `user_type === 'academy_admin'`이면 `/admin`, 원생이면 `/dashboard`로 자동 이동.

**Files:**
- Modify: `src/pages/AuthCallbackPage.tsx` (카카오 콜백 - 원생용)
- Modify: `src/pages/AuthPage.tsx` (이메일 로그인 후 처리)

**Step 1: 로그인 성공 후 profile.user_type을 조회해서 분기**

```tsx
// 로그인 성공 후
const { data: profile } = await supabase.from('profiles').select('user_type').eq('id', user.id).single();
navigate(profile?.user_type === 'academy_admin' ? '/admin' : '/dashboard');
```

AuthPage에 이메일+비밀번호 로그인 폼이 이미 있는지 확인 필요. 없으면 추가 (학원장용).

**Step 2: 커밋**

```bash
git add src/pages/AuthCallbackPage.tsx src/pages/AuthPage.tsx
git commit -m "feat(auth): user_type 기반 로그인 후 라우팅 분기"
```

---

### Task 10: DB 마이그레이션 적용 + 프로덕션 배포 + 검증

**목표:** 모든 변경사항을 프로덕션에 반영하고 라이브 검증.

**Files:** 없음 (오퍼레이션)

**Step 1: DB 마이그레이션 적용**

```bash
supabase db push --linked
```

Expected: 3개 마이그레이션 적용 (academies_and_admin_dashboard, signal_calculation_rpc, academy_provisioning)

**Step 2: git push**

```bash
git push origin vercel-migration
```

**Step 3: Vercel 배포**

```bash
vercel deploy --prod --yes
```

**Step 4: 시드 학원 프로비저닝 (테스트 학원 1곳)**

```
- Supabase Auth Dashboard → Users → Invite user: admin+test@mych.ai (임시 비번)
- SQL Editor:
  select public.provision_academy('테스트학원', '<uuid>'::uuid, 'TEST-0001');
```

**Step 5: 라이브 검증**

- `https://mindcoach-ai-quest.vercel.app/auth`에서 test admin 로그인
- `/admin` 대시보드 접속 → 학원명 + 코드 표시, 원생 0명
- 다른 계정으로 원생 온보딩 → 학원 코드 `TEST-0001` 입력 → 프라이버시 모달 → 연결
- 원생 계정에서 통합검사 응시
- 관리자 페이지 재접속 → 원생 1명 표시, 신호 계산됨

**Step 6: 오류 시 롤백**

- Vercel 대시보드에서 이전 배포로 promote
- DB는 마이그레이션 리버스: `drop table academies cascade` (원상복구 SQL 준비)

---

## 실패 시 롤백

각 태스크가 별도 커밋 → `git revert <sha>` 로 되돌리기. Vercel에서 이전 배포로 promote.

## 스코프 밖 (v2 이후 별도 세션)

- AI 코칭 대화 스캔 → 신호 로직 편입
- 학원 자체 회원가입/결제 흐름
- 레드 신호 이메일 알림
- CSV export
- 여러 관리자 스태프 초대
- 학원 광고 배너/포스터 관리
