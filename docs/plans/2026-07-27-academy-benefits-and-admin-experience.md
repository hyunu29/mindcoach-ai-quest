# 학원 코드 베네핏 + 관리자 체험 Implementation Plan (Wave 1 of v2)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 원생이 학원 코드로 연결하면 유료 검사 이용권 + AI 코칭 크레딧을 자동 지급하고(환영 팩+주간), 학원 관리자가 원생 페이지에서 검사·코칭을 체험할 수 있게 배너와 사이드바를 확장한다.

**Architecture:** 별도 `academy_test_vouchers` 테이블로 학원 이용권 관리 (`user_test_access`는 결제 접근권 전용, `test_id NOT NULL` 제약 유지). 크레딧은 기존 `user_credits` 재사용. Weekly grant edge function에 학원 원생 대상 RPC 추가 호출. 관리자 체험은 `ProtectedRoute.allowAdmin` 옵션 + 상단 sticky 배너로 처리 (원생 URL 그대로 재사용).

**Tech Stack:** React 18 + TS + Vite + Supabase (Postgres + Deno Edge Functions + RLS), shadcn/ui, react-router-dom.

**Branch:** `vercel-migration` (production).

**참고 디자인 문서:** `docs/plans/2026-07-27-academy-benefits-and-admin-experience-design.md`

---

### Task 1: DB — academy_test_vouchers 테이블 + RLS + 헬퍼

**Files:**
- Create: `supabase/migrations/20260727120000_academy_test_vouchers.sql`

**Step 1: 마이그레이션 파일 생성**

```sql
-- =============================================================
-- 학원 이용권 테이블 (환영 팩/주간 grant로 지급)
-- user_test_access는 결제 접근권 유지. 이용권 소진 시 user_test_access row 생성
-- =============================================================

create table public.academy_test_vouchers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  academy_id uuid references public.academies(id) on delete set null,
  source text not null check (source in ('welcome', 'weekly')),
  granted_at timestamptz not null default now(),
  used_at timestamptz,
  used_for_test_id text,
  expires_at timestamptz not null
);

create index idx_academy_test_vouchers_user_unused
  on public.academy_test_vouchers (user_id, expires_at)
  where used_at is null;

create index idx_academy_test_vouchers_academy on public.academy_test_vouchers (academy_id);

comment on table public.academy_test_vouchers is
  '학원 연결 원생에게 지급된 유료 검사 무료 이용권. used_at is null이면 사용 가능.';

alter table public.academy_test_vouchers enable row level security;

create policy "user selects own vouchers"
  on public.academy_test_vouchers for select to authenticated
  using (auth.uid() = user_id);

-- 관리자는 자기 학원 원생 이용권 조회 가능
create policy "academy_admin selects own students vouchers"
  on public.academy_test_vouchers for select to authenticated
  using (
    user_id in (
      select id from public.profiles
      where academy_id in (select id from public.academies where admin_user_id = auth.uid())
    )
  );

-- 미사용 이용권 개수 조회 헬퍼 (원생이 프로필에서 사용)
create or replace function public.count_unused_academy_vouchers(p_user_id uuid)
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::int
  from public.academy_test_vouchers
  where user_id = p_user_id
    and used_at is null
    and expires_at > now();
$$;

grant execute on function public.count_unused_academy_vouchers(uuid) to authenticated;
```

**Step 2: 커밋**

```bash
git add supabase/migrations/20260727120000_academy_test_vouchers.sql
git commit -m "sql(academy): academy_test_vouchers 테이블 + 미사용 개수 헬퍼"
```

---

### Task 2: DB — 환영 팩 grant RPC

**Files:**
- Create: `supabase/migrations/20260727120100_grant_academy_welcome_pack.sql`

**Step 1: 마이그레이션 파일**

```sql
-- =============================================================
-- 학원 연결 즉시 지급: 이용권 3개(30일) + 크레딧 20개
-- =============================================================

create or replace function public.grant_academy_welcome_pack(p_user_id uuid, p_academy_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_already_granted int;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_kst_now timestamp;
begin
  -- 이미 welcome pack 지급받았는지 확인 (재연결 방지)
  select count(*) into v_already_granted
  from public.academy_test_vouchers
  where user_id = p_user_id
    and source = 'welcome';

  if v_already_granted > 0 then
    return;
  end if;

  -- 이용권 3장 (30일 유효)
  insert into public.academy_test_vouchers(user_id, academy_id, source, expires_at)
  select p_user_id, p_academy_id, 'welcome', now() + interval '30 days'
  from generate_series(1, 3);

  -- 크레딧 +20 (이번 주 user_credits 행 없으면 새로 만듦)
  v_kst_now := (now() AT TIME ZONE 'Asia/Seoul')::timestamp;
  v_period_start := (date_trunc('day', v_kst_now) - (EXTRACT(dow FROM v_kst_now) || ' days')::interval) AT TIME ZONE 'Asia/Seoul';
  v_period_end := v_period_start + interval '7 days';

  insert into public.user_credits(user_id, period_start, period_end, credits_granted, source)
  values (p_user_id, v_period_start, v_period_end, 20, 'academy_welcome')
  on conflict do nothing;
end;
$$;

grant execute on function public.grant_academy_welcome_pack(uuid, uuid) to authenticated;
```

**Step 2: 커밋**

```bash
git add supabase/migrations/20260727120100_grant_academy_welcome_pack.sql
git commit -m "sql(academy): 환영 팩 지급 RPC (이용권 3장 + 크레딧 20)"
```

---

### Task 3: 프론트 — useConnectAcademy에 환영 팩 호출 추가

**Files:**
- Modify: `src/hooks/useConnectAcademy.ts`

**Step 1: connect() 이후 RPC 호출 추가**

기존 코드에서 profile 업데이트 성공 시:

```tsx
if (!error) {
  void track('academy_connected', { academy_id: academyId });
  // 환영 팩 지급 (실패해도 연결 자체는 성공)
  await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ error: unknown }>)('grant_academy_welcome_pack', {
    p_user_id: user.id,
    p_academy_id: academyId,
  });
  return true;
}
```

**Step 2: 타입체크**

```bash
npx tsc --noEmit
```

**Step 3: 커밋**

```bash
git add src/hooks/useConnectAcademy.ts
git commit -m "feat(academy): 학원 연결 시 환영 팩 자동 지급 (RPC 호출)"
```

---

### Task 4: 프론트 — PrivacyDisclosureModal에 베네핏 안내

**Files:**
- Modify: `src/components/academy/PrivacyDisclosureModal.tsx`

**Step 1: 하단에 베네핏 hero 추가**

기존 두 섹션(볼 수 있는/없는 정보) 아래에 강조 카드:

```tsx
<div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
  <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
    <Gift className="w-4 h-4" /> 연결 즉시 지급되는 혜택
  </p>
  <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground ml-6 list-disc">
    <li>유료 검사 무료 이용권 3장 (30일 유효)</li>
    <li>AI 코칭 크레딧 20개</li>
    <li>매주 유료 검사 이용권 1장 + 크레딧 5개 추가 지급</li>
  </ul>
</div>
```

`Gift` import는 `lucide-react`에서.

**Step 2: 타입체크 + 커밋**

```bash
npx tsc --noEmit
git add src/components/academy/PrivacyDisclosureModal.tsx
git commit -m "ui(academy): 프라이버시 모달에 학원 연결 혜택 안내 추가"
```

---

### Task 5: DB — 유료 검사 응시 시 이용권 우선 소진 함수

**Files:**
- Create: `supabase/migrations/20260727120200_redeem_academy_voucher.sql`

**Step 1: 마이그레이션 파일**

```sql
-- =============================================================
-- 이용권 사용: 유료 검사 응시 시 이용권 하나를 소진하고
-- user_test_access row 생성 (30일 접근권)
-- =============================================================

create or replace function public.redeem_academy_voucher(p_user_id uuid, p_test_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voucher_id uuid;
begin
  -- 오래된 미사용 이용권부터 소진
  select id into v_voucher_id
  from public.academy_test_vouchers
  where user_id = p_user_id
    and used_at is null
    and expires_at > now()
  order by expires_at asc
  limit 1
  for update skip locked;

  if v_voucher_id is null then
    return false;
  end if;

  update public.academy_test_vouchers
     set used_at = now(),
         used_for_test_id = p_test_id
   where id = v_voucher_id;

  -- user_test_access에 30일 접근권 추가
  insert into public.user_test_access(user_id, test_id, expires_at)
  values (p_user_id, p_test_id, now() + interval '30 days');

  return true;
end;
$$;

grant execute on function public.redeem_academy_voucher(text, uuid) to authenticated;
grant execute on function public.redeem_academy_voucher(uuid, text) to authenticated;
```

**Step 2: 커밋**

```bash
git add supabase/migrations/20260727120200_redeem_academy_voucher.sql
git commit -m "sql(academy): 이용권 소진 RPC (has_test_access 결제 전 호출)"
```

---

### Task 6: 프론트 — 유료 검사 구매 UI에 "이용권으로 응시" 옵션

**Files:**
- Modify: `src/pages/TestsPage.tsx` — `TestCard`의 paid state 처리
- Create: `src/hooks/useAcademyVouchers.ts` — 미사용 이용권 개수 훅

**Step 1: 새 훅**

`src/hooks/useAcademyVouchers.ts`:
```tsx
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useAcademyVouchers() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setCount(0); setLoading(false); return; }
    const { data } = await (supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: number | null }>)('count_unused_academy_vouchers', { p_user_id: user.id });
    setCount(data ?? 0);
    setLoading(false);
  }, [user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const redeem = useCallback(async (testId: string): Promise<boolean> => {
    if (!user) return false;
    const { data } = await (supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: boolean | null }>)('redeem_academy_voucher', {
      p_user_id: user.id,
      p_test_id: testId,
    });
    if (data === true) {
      await refresh();
      return true;
    }
    return false;
  }, [user, refresh]);

  return { count, loading, refresh, redeem };
}
```

**Step 2: TestsPage에서 paid 카드에 "이용권 사용" 옵션 추가**

paid state 카드의 CTA 부분에서, `voucherCount > 0`이면 "구매하기" 버튼 위에 outline 버튼 하나 추가:

```tsx
<Button variant="secondary" size="sm" className="w-full mb-2" onClick={() => onRedeemVoucher(test)}>
  🎁 이용권으로 응시 ({voucherCount})
</Button>
<Button size="sm" className="w-full" ...>구매하기</Button>
```

`TestsPage`가 `useAcademyVouchers()` 호출, `TestCard`에 `voucherCount`와 `onRedeemVoucher` prop 전달. `onRedeemVoucher`는 `redeem()` 성공 시 `navigate('/tests/{id}')`.

**Step 3: 타입체크 + build + 커밋**

```bash
npx tsc --noEmit
npm run build
git add src/hooks/useAcademyVouchers.ts src/pages/TestsPage.tsx
git commit -m "feat(academy): 유료 검사 카드에 이용권 응시 버튼 추가"
```

---

### Task 7: 프론트 — ProfilePage 학원 연결 카드에 지급 현황

**Files:**
- Modify: `src/pages/ProfilePage.tsx`

**Step 1: 학원 연결 카드에 이용권 카운트 표시**

`useAcademyVouchers()` 사용해서 학원 연결된 상태이면:

```tsx
{academyId && academyName && (
  <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/20">
    <div>
      <div className="text-sm font-medium">{academyName}</div>
      <div className="text-[10px] text-muted-foreground">
        {academyJoinedAt ? `${new Date(academyJoinedAt).toLocaleDateString('ko-KR')} 연결` : '연결됨'}
      </div>
    </div>
    <span className="text-xs text-primary font-medium">연결됨</span>
  </div>
)}
{academyId && (
  <div className="mt-3 flex items-center justify-between text-xs">
    <span className="text-muted-foreground">사용 가능 무료 이용권</span>
    <span className="font-medium">{voucherCount}개</span>
  </div>
)}
```

**Step 2: 커밋**

```bash
git add src/pages/ProfilePage.tsx
git commit -m "ui(academy): 프로필 학원 카드에 사용 가능 이용권 개수 표시"
```

---

### Task 8: DB — 주간 grant 함수에 학원 원생 지급 추가

**Files:**
- Create: `supabase/migrations/20260727120300_grant_weekly_academy_benefits.sql`

**Step 1: 마이그레이션 파일**

```sql
-- =============================================================
-- 주간 학원 원생 지급: 이용권 1장 + 크레딧 5개
-- weekly-grant edge function이 grant_weekly_pro_benefits와 별개로 호출
-- =============================================================

create or replace function public.grant_weekly_academy_benefits()
returns table (granted_count int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  v_kst_now timestamp;
  v_period_start timestamptz;
  v_period_end timestamptz;
begin
  v_kst_now := (now() AT TIME ZONE 'Asia/Seoul')::timestamp;
  v_period_start := (date_trunc('day', v_kst_now) - (EXTRACT(dow FROM v_kst_now) || ' days')::interval) AT TIME ZONE 'Asia/Seoul';
  v_period_end := v_period_start + interval '7 days';

  with academy_students as (
    select id as user_id from public.profiles where academy_id is not null
  ),
  voucher_insert as (
    insert into public.academy_test_vouchers(user_id, academy_id, source, expires_at)
    select p.id, p.academy_id, 'weekly', now() + interval '30 days'
    from public.profiles p
    where p.academy_id is not null
      and not exists (
        select 1 from public.academy_test_vouchers v
        where v.user_id = p.id
          and v.source = 'weekly'
          and v.granted_at >= v_period_start
      )
    returning user_id
  ),
  credit_insert as (
    insert into public.user_credits(user_id, period_start, period_end, credits_granted, source)
    select user_id, v_period_start, v_period_end, 5, 'academy_weekly'
    from voucher_insert
    on conflict do nothing
    returning user_id
  )
  select count(*)::int into v_count from voucher_insert;

  return query select v_count;
end;
$$;

grant execute on function public.grant_weekly_academy_benefits() to service_role;
```

**Step 2: 커밋**

```bash
git add supabase/migrations/20260727120300_grant_weekly_academy_benefits.sql
git commit -m "sql(academy): 주간 학원 원생 지급 RPC (이용권 1장 + 크레딧 5)"
```

---

### Task 9: Edge function — weekly-grant에 학원 grant 호출 추가

**Files:**
- Modify: `supabase/functions/weekly-grant/index.ts`

**Step 1: 두 RPC 순차 호출로 확장**

기존:
```tsx
const { data, error } = await supabase.rpc("grant_weekly_pro_benefits");
```

변경:
```tsx
const { data: proData, error: proErr } = await supabase.rpc("grant_weekly_pro_benefits");
if (proErr) { console.error("pro rpc error", proErr); return json(500, { error: proErr.message }); }
const proGranted = Array.isArray(proData) && proData.length > 0 ? proData[0].granted_count : 0;

const { data: acData, error: acErr } = await supabase.rpc("grant_weekly_academy_benefits");
if (acErr) { console.error("academy rpc error", acErr); return json(500, { error: acErr.message }); }
const academyGranted = Array.isArray(acData) && acData.length > 0 ? acData[0].granted_count : 0;

console.log("weekly-grant success", { proGranted, academyGranted });
return json(200, { ok: true, pro: proGranted, academy: academyGranted });
```

**Step 2: 커밋**

```bash
git add supabase/functions/weekly-grant/index.ts
git commit -m "feat(cron): weekly-grant에 학원 원생 grant 추가"
```

Edge function 배포는 Task 12(배포)에서 함께.

---

### Task 10: 프론트 — ProtectedRoute allowAdmin + App.tsx 확장

**Files:**
- Modify: `src/components/ProtectedRoute.tsx`
- Modify: `src/App.tsx`

**Step 1: ProtectedRoute에 allowAdmin prop 추가**

```tsx
interface Props {
  children: React.ReactNode;
  requiredUserType?: 'student' | 'academy_admin' | 'super_admin';
  allowAdmin?: boolean;  // 추가
}
```

useEffect의 로직 조정: `allowAdmin`이 true이고 user_type이 `academy_admin`이면 강제 리다이렉트하지 않음.

핵심 변경 (기존 `else` 블록):
```tsx
} else {
  // 기본 원생용 페이지
  if (userType === 'academy_admin' && !allowAdmin) setRedirectTo('/admin');
  else if (userType === 'super_admin' && !allowAdmin) setRedirectTo('/sysadmin');
  else if (userType === 'student' && !data?.onboarded_at) setRedirectTo('/onboarding');
}
```

**Step 2: App.tsx의 원생 라우트에 allowAdmin 추가**

`/tests`, `/tests/:id`, `/results/:id`, `/coaching`, `/emotion`, `/history`, `/profile` — 학원 관리자가 접근하도록:

```tsx
<Route path="/tests" element={<ProtectedRoute allowAdmin><TestsPage /></ProtectedRoute>} />
<Route path="/tests/:id" element={<ProtectedRoute allowAdmin><TestTakingPage /></ProtectedRoute>} />
<Route path="/results/:id" element={<ProtectedRoute allowAdmin><ResultsPage /></ProtectedRoute>} />
<Route path="/coaching" element={<ProtectedRoute allowAdmin><CoachingPage /></ProtectedRoute>} />
<Route path="/emotion" element={<ProtectedRoute allowAdmin><EmotionPage /></ProtectedRoute>} />
```

`/dashboard`, `/history`, `/profile`은 관리자용이 아니므로 allowAdmin 없이 두면 자동으로 /admin으로 리다이렉트.

**Step 3: 타입체크 + build + 커밋**

```bash
npx tsc --noEmit && npm run build
git add src/components/ProtectedRoute.tsx src/App.tsx
git commit -m "feat(admin): ProtectedRoute allowAdmin + 원생 페이지 접근 허용"
```

---

### Task 11: 프론트 — AdminExperienceBanner + AppLayout + AdminLayout 사이드바

**Files:**
- Create: `src/components/academy/AdminExperienceBanner.tsx`
- Modify: `src/layouts/AppLayout.tsx`
- Modify: `src/layouts/AdminLayout.tsx`

**Step 1: AdminExperienceBanner**

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft } from 'lucide-react';

export default function AdminExperienceBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    void (supabase.from('profiles') as unknown as {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          single: () => Promise<{ data: { user_type: string | null } | null }>;
        };
      };
    })
      .select('user_type')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setIsAdmin(data?.user_type === 'academy_admin'));
  }, [user]);

  if (!isAdmin) return null;

  return (
    <div className="sticky top-0 z-40 bg-primary/10 border-b border-primary/30 px-4 py-2 flex items-center justify-between gap-2">
      <span className="text-xs">🎓 관리자 체험 중 · 원생이 보는 화면입니다</span>
      <button
        onClick={() => navigate('/admin')}
        className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        <ArrowLeft className="w-3 h-3" /> 관리자 대시보드
      </button>
    </div>
  );
}
```

**Step 2: AppLayout 최상단에 배너 마운트**

```tsx
import AdminExperienceBanner from '@/components/academy/AdminExperienceBanner';

export default function AppLayout() {
  return (
    <>
      <AdminExperienceBanner />
      {/* 기존 레이아웃 */}
    </>
  );
}
```

**Step 3: AdminLayout 사이드바에 체험 링크 추가**

기존 nav 아래에 구분선 + 추가 링크:

```tsx
<div className="mt-2 mb-1 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">체험</div>
<NavLink to="/tests" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors" activeClassName="bg-primary/10 text-primary">
  <ClipboardCheck className="w-4 h-4" /> 심리검사 체험
</NavLink>
<NavLink to="/coaching" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors" activeClassName="bg-primary/10 text-primary">
  <MessageCircle className="w-4 h-4" /> AI 코칭 체험
</NavLink>
```

**Step 4: 타입체크 + build + 커밋**

```bash
npx tsc --noEmit && npm run build
git add src/components/academy/AdminExperienceBanner.tsx src/layouts/AppLayout.tsx src/layouts/AdminLayout.tsx
git commit -m "feat(admin): 관리자 체험 배너 + 사이드바 체험 링크"
```

---

### Task 12: 배포 + 검증

**Files:** 없음

**Step 1: DB 마이그레이션 적용**

```bash
supabase db push --linked
```

Expected: 4개 마이그레이션 적용 (`academy_test_vouchers`, `grant_academy_welcome_pack`, `redeem_academy_voucher`, `grant_weekly_academy_benefits`).

**Step 2: Edge function 재배포**

```bash
supabase functions deploy weekly-grant
```

**Step 3: git push + Vercel 배포**

```bash
git push origin vercel-migration
vercel deploy --prod --yes
```

**Step 4: 검증**

- 새 계정 카카오 로그인 → `/profile` → `TEST-0001` 입력 → 프라이버시 모달에 "연결 즉시 지급되는 혜택" 카드 표시 확인
- 동의 후 학원 카드 하단에 "사용 가능 무료 이용권: 3개" 표시
- `/tests`에서 유료 검사 카드에 "🎁 이용권으로 응시 (3)" 버튼 표시, 클릭 시 이용권 소진되고 검사 응시 가능
- 학원 관리자 계정으로 로그인 → 사이드바 "심리검사 체험", "AI 코칭 체험" 링크 확인
- "심리검사 체험" 클릭 → `/tests` 진입 → 상단에 "🎓 관리자 체험 중" 배너 표시 확인
- 배너의 "← 관리자 대시보드" 클릭 시 `/admin`으로 복귀

---

## 실패 시 롤백

각 태스크 별도 커밋 → `git revert <sha>`. Vercel 이전 배포로 promote.

## 스코프 밖 (Wave 2 이후)

- 월구독 (D)
- 담임/실장 개인 코드 (C)
- 시즌 프로모션 트래킹 (E)
- 학원별 커스텀 지급량
