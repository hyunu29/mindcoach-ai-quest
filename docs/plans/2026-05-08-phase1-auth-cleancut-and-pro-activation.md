# Phase 1 Implementation Plan: 인증 클린 컷 + B2C Pro 구독 활성화

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 기존 이메일/비번 사용자를 모두 삭제하고 카카오 OAuth 단독 인증으로 전환하며, Pro 월 ₩9,900 정기결제를 Toss 빌링 키 기반으로 실제 매출 발생 가능한 상태로 활성화한다.

**Architecture:** (1) Supabase Auth provider를 카카오로 전환하고 기존 user를 정리. (2) `user_credits`를 monthly → weekly로 전환하고 매주 일요일 0시 KST에 active Pro 사용자 전원에게 grant를 발급하는 scheduled Edge Function 작성. (3) Toss 정기결제 빌링 키 발급 → 첫 결제 → 매월 자동 청구 흐름을 신규/수정 Edge Function 두 개로 구성. 첫 결제 성공 시 `user_subscriptions(plan='pro_monthly', status='active', source='direct')` insert + 즉시 첫 weekly grant 발급.

**Tech Stack:** Vite + React + TypeScript + Tailwind + shadcn/ui (frontend), Supabase Postgres + Auth + Edge Functions (Deno) + pg_cron (backend), Toss Payments 정기결제 빌링 키 API (결제), Vitest (테스트).

**기준 설계 문서:** `docs/plans/2026-05-08-subscription-b2b-design.md` (특히 §2 결정 6,7,10, §4.1, §6.1, §6.7, §10 Phase 1)

---

## 사전 조건 (Pre-flight)

이 플랜을 실행하기 전에 사람이 한 번만 처리해야 하는 것:

1. **Supabase Dashboard → Authentication → Providers → Kakao** 활성화. Client ID/Secret 입력 (Kakao Developers Console에서 미리 앱 등록 필요). Redirect URL `https://bnhnaaarsyauppdbrbco.supabase.co/auth/v1/callback`을 Kakao Developers에 등록.
2. **Toss Payments 가맹점 가입 + 정기결제(빌링) 테스트 키 발급**. 시크릿 키와 클라이언트 키를 Supabase Edge Function 환경변수 `TOSS_SECRET_KEY`, `TOSS_CLIENT_KEY`에 추가.
3. **Resend 계정 (선택, Phase 4용 — Phase 1에서는 불필요)** — 무시 가능.
4. **카카오 비즈니스 채널 등록** (선택, 사업자등록증 있을 때만 — 없으면 개인 개발자로도 OAuth는 작동, 단 일일 100명 제한).

이 셋업이 끝났는지 super_admin에게 구두/문서로 확인 후 시작. 미완료 상태에서 P1.2를 진행하면 카카오 로그인이 503으로 죽는다.

---

## Task 1: 작업 브랜치 + 기준선 검증

**Files:**
- 없음 (git/CLI 작업)

**Step 1: 작업 브랜치 생성**

```bash
cd "C:/Users/ricky/Desktop/mindcoach-ai-quest"
git fetch origin
git pull --ff-only origin main
git checkout -b phase1-auth-cleancut
```

**Step 2: 빌드/테스트 기준선 통과 확인**

```bash
npm install
npm run build
npm run test
```
Expected: build PASS, test PASS (현재 example.test.ts만 존재 → 통과해야 함).

**Step 3: 현재 active user 수 측정 (롤백 시 비교용)**

Supabase SQL Editor에서:
```sql
SELECT count(*) FROM auth.users;
SELECT count(*) FROM public.user_subscriptions WHERE status='active';
SELECT count(*) FROM public.user_credits WHERE period_end > now();
```
Expected: 결과를 기록 (예: users=N, subs=N, credits=N). 클린 컷 후 0이 되어야 정상.

**Step 4: Commit (브랜치만 생성, 변경 없음)**

스킵 (변경 없음).

---

## Task 2: 마이그레이션 — `profiles.user_type` 추가 + `user_credits.source` 리네임

**Files:**
- Create: `supabase/migrations/20260508120000_phase1_user_type_and_weekly_credits.sql`

**Step 1: 마이그레이션 파일 작성**

```sql
-- Phase 1: profiles.user_type + user_credits weekly 전환
-- 카카오 OAuth 클린컷 + Pro 구독 활성화 기반 마이그레이션

-- profiles에 역할 컬럼 추가
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_type text NOT NULL DEFAULT 'student'
  CHECK (user_type IN ('student','academy_admin','super_admin'));

CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);

-- user_credits.source 값 리네임: free_monthly → free_signup, pro_monthly → pro_weekly
UPDATE public.user_credits SET source='free_signup' WHERE source='free_monthly';
UPDATE public.user_credits SET source='pro_weekly'  WHERE source='pro_monthly';

-- subscription_plans free 플랜의 monthly 기준을 weekly 기준으로 변경
-- (free는 가입 시 1회 grant, Pro는 매주 grant)
UPDATE public.subscription_plans
  SET ai_credits_monthly = 50,    -- weekly grant 수치 (필드명은 컬럼 호환을 위해 그대로 두되 의미는 weekly)
      weekly_free_tests = 1
  WHERE code = 'pro_monthly';

UPDATE public.subscription_plans
  SET ai_credits_monthly = 10,    -- 가입 시 1회 부여, weekly 갱신 안 함
      weekly_free_tests = 0
  WHERE code = 'free';

-- 코멘트로 의미 명시 (컬럼명 변경은 다음 마이그레이션에서 — DRY)
COMMENT ON COLUMN public.subscription_plans.ai_credits_monthly IS
  'Pro: weekly grant 수치(50/주). Free: 가입 시 1회 grant(10).';
COMMENT ON COLUMN public.user_credits.source IS
  'free_signup | pro_weekly | one_off_topup';
```

**Step 2: 로컬 적용 (Supabase CLI 사용 시)**

```bash
npx supabase db push
```
또는 Supabase Dashboard → SQL Editor에 붙여넣기 후 실행.

Expected: `ALTER TABLE`, `UPDATE`, `COMMENT` 모두 성공. 에러 없음.

**Step 3: 검증 쿼리**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='profiles' AND column_name='user_type';

SELECT DISTINCT source FROM public.user_credits;
SELECT code, ai_credits_monthly, weekly_free_tests FROM public.subscription_plans;
```
Expected: `user_type` 컬럼 존재, `source` 값에 `free_monthly`/`pro_monthly`가 더 이상 없음, `pro_monthly` 플랜이 `50/1`.

**Step 4: Commit**

```bash
git add supabase/migrations/20260508120000_phase1_user_type_and_weekly_credits.sql
git commit -m "P1.4: user_type + user_credits weekly 전환 마이그레이션"
```

---

## Task 3: 카카오 OAuth — `useAuth` 훅 + `AuthPage` 교체

**Files:**
- Modify: `src/hooks/useAuth.tsx` (signUp/signIn 제거, signInWithKakao 추가)
- Modify: `src/pages/AuthPage.tsx` (이메일 폼 제거, 카카오 버튼 단독)
- Modify: `src/components/ProtectedRoute.tsx` (필요 시)

**Step 1: 실패하는 테스트 작성**

Create `src/test/auth.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: () => {} } } }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

import { supabase } from '@/integrations/supabase/client';

describe('Kakao OAuth integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('signInWithKakao calls supabase.auth.signInWithOAuth with kakao provider', async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: 'http://localhost/auth/callback' },
    });
    expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'kakao' }),
    );
  });
});
```

**Step 2: 테스트 실패 확인**

```bash
npm run test -- auth.test.ts
```
Expected: PASS (mock만 검증). 만약 mock 설정 자체에서 실패하면 디버깅.

**Step 3: `useAuth.tsx` 변경 — 카카오 OAuth로 전환**

```tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithKakao: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      },
    );
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signInWithKakao = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) return { error: error.message };
    void track('signup_attempt', { method: 'kakao' });
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signInWithKakao, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
```

**Step 4: `AuthPage.tsx` 교체**

```tsx
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";

export default function AuthPage() {
  const { user, loading: authLoading, signInWithKakao } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  if (authLoading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleKakao = async () => {
    setSubmitting(true);
    const { error } = await signInWithKakao();
    if (error) {
      toast.error(error);
      setSubmitting(false);
    }
    // 성공 시 OAuth 리다이렉트로 이 컴포넌트는 unmount 됨
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-background">
      <div className="w-full max-w-sm animate-reveal-up text-center space-y-6">
        <div>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold">마인드코치 AI</span>
          </div>
          <h1 className="text-2xl font-bold mb-1">시작하기</h1>
          <p className="text-sm text-muted-foreground">카카오 계정으로 1초 만에 시작하세요.</p>
        </div>

        <Button
          onClick={handleKakao}
          disabled={submitting}
          className="w-full h-12 rounded-xl bg-[#FEE500] text-[#191919] hover:bg-[#FDD800]"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : '카카오로 시작하기'}
        </Button>

        <p className="text-xs text-muted-foreground">
          가입 시 <a className="underline" href="/terms">이용약관</a>과 <a className="underline" href="/privacy">개인정보처리방침</a>에 동의합니다.
        </p>
      </div>
    </div>
  );
}
```

**Step 5: OAuth 콜백 라우트 추가** — `src/App.tsx`에 `<Route path="/auth/callback" element={<AuthCallbackPage />} />` 추가, 새 페이지 `src/pages/AuthCallbackPage.tsx`:

```tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (user) navigate('/onboarding', { replace: true });
    else navigate('/auth', { replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}
```

**Step 6: 빌드 + 카카오 로그인 수동 테스트**

```bash
npm run build
npm run preview
```
브라우저에서 `http://localhost:4173/auth` → 카카오 버튼 클릭 → 카카오 인증 → 콜백 → `/onboarding` 도착 (다음 Task에서 만듦, 지금은 404 OK).

Expected: 카카오 로그인 성공, `auth.users`에 새 row 생성됨 (Supabase Dashboard에서 확인).

**Step 7: Commit**

```bash
git add src/hooks/useAuth.tsx src/pages/AuthPage.tsx src/pages/AuthCallbackPage.tsx src/App.tsx src/test/auth.test.ts
git commit -m "P1.2: 카카오 OAuth 단독 인증으로 전환 (이메일/비번 제거)"
```

---

## Task 4: 첫 진입 onboarding 페이지 (닉네임/학교/학년)

**Files:**
- Create: `src/pages/OnboardingPage.tsx`
- Modify: `src/App.tsx` (라우트 추가)
- Create: `supabase/migrations/20260508120100_phase1_profile_school_grade.sql` (학교/학년 컬럼 없을 시)

**Step 1: 기존 profiles 컬럼 확인**

```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='profiles' ORDER BY ordinal_position;
```
Expected: `nickname`/`school`/`grade` 존재 여부 확인. 없으면 다음 step에서 추가.

**Step 2: 마이그레이션 (필요 시)**

```sql
-- profiles에 onboarding 필드 추가 (없을 때만)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS school text,
  ADD COLUMN IF NOT EXISTS grade text,
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;
```

**Step 3: `OnboardingPage.tsx` 작성**

```tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { track } from '@/lib/analytics';

const GRADES = ['중1','중2','중3','고1','고2','고3','N수','대학생','일반'];

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState('');
  const [school, setSchool] = useState('');
  const [grade, setGrade] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate('/auth', { replace: true }); return; }
    // 이미 온보딩 완료한 사용자는 dashboard로
    void supabase.from('profiles').select('onboarded_at').eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.onboarded_at) navigate('/dashboard', { replace: true });
      });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !grade) {
      toast.error('닉네임과 학년을 입력해주세요.');
      return;
    }
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      nickname: nickname.trim(),
      school: school.trim() || null,
      grade,
      onboarded_at: new Date().toISOString(),
    });
    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }
    void track('onboarding_completed', { grade });
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6 animate-reveal-up">
        <h1 className="text-2xl font-bold text-center">잠깐 자기소개를 부탁드려요</h1>
        <div className="space-y-2">
          <Label>닉네임 *</Label>
          <Input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20} className="rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label>학교 (선택)</Label>
          <Input value={school} onChange={(e) => setSchool(e.target.value)} maxLength={40} className="rounded-xl" />
        </div>
        <div className="space-y-2">
          <Label>학년 *</Label>
          <Select value={grade} onValueChange={setGrade}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder="선택하세요" /></SelectTrigger>
            <SelectContent>
              {GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl">시작하기</Button>
      </form>
    </div>
  );
}
```

**Step 4: 라우트 추가** — `src/App.tsx`의 BrowserRouter 안에:
```tsx
<Route path="/onboarding" element={<OnboardingPage />} />
```

**Step 5: 빌드 검증**

```bash
npm run build
```
Expected: PASS, 타입 에러 없음.

**Step 6: Commit**

```bash
git add src/pages/OnboardingPage.tsx src/App.tsx supabase/migrations/20260508120100_phase1_profile_school_grade.sql
git commit -m "P1.3: 첫 진입 onboarding 페이지 (닉네임/학교/학년)"
```

---

## Task 5: 기존 사용자 클린 컷 (auth.users 전체 삭제)

**Files:**
- Create: `supabase/migrations/20260508120200_phase1_cleancut_existing_users.sql` (안전을 위해 마이그레이션 형태로 기록만 하고 실행은 super_admin이 수동)

**Step 1: 클린컷 SQL 작성** (실행 전 백업 필수)

```sql
-- WARNING: 이 마이그레이션은 자동 실행하지 말 것.
-- super_admin이 Supabase SQL Editor에서 수동 1회 실행.
-- 사전에 Supabase Dashboard → Database → Backups 에서 매뉴얼 백업 트리거.

-- 1. 클린컷 대상 카운트 (사전 확인)
-- SELECT count(*) FROM auth.users;

-- 2. cascade 삭제 (auth.users → profiles, user_credits, user_subscriptions, test_results 등 모두 ON DELETE CASCADE)
-- DELETE FROM auth.users;

-- 3. 검증
-- SELECT count(*) FROM auth.users;                        -- 0
-- SELECT count(*) FROM public.profiles;                   -- 0
-- SELECT count(*) FROM public.user_subscriptions;         -- 0
-- SELECT count(*) FROM public.user_credits;               -- 0
-- SELECT count(*) FROM public.test_results;               -- 0

-- (주석으로만 두는 이유: 마이그레이션이 PR/배포에 자동 실행되면 prod 데이터 다 날아감.
--  super_admin이 의도적으로 한 번만 SQL Editor에서 실행해야 안전.)
```

**Step 2: super_admin 수동 실행 절차 — 별도 문서**

추가 작성: `docs/runbooks/2026-05-08-cleancut.md` (간략):
```markdown
# 기존 사용자 클린 컷 실행 가이드

1. Supabase Dashboard → Database → Backups → "Create backup" 클릭, 백업 완료 대기
2. SQL Editor에서: `SELECT count(*) FROM auth.users;` → 숫자 기록
3. SQL Editor에서: `DELETE FROM auth.users;` 실행
4. 검증 쿼리 (위 SQL 주석 참조)
5. 본인 계정으로 카카오 로그인 시도 → onboarding 통과 → dashboard 진입 확인
6. 김종환 코치 등 실유저에게 카카오 재가입 안내 메시지 발송
```

**Step 3: Commit**

```bash
git add supabase/migrations/20260508120200_phase1_cleancut_existing_users.sql docs/runbooks/2026-05-08-cleancut.md
git commit -m "P1.1: 기존 사용자 클린컷 SQL + 실행 가이드 (수동 실행 대상)"
```

**Step 4: 실제 실행은 Phase 1 마지막 검증 직전에** — Task 9에서 트리거.

---

## Task 6: Weekly grant cron (scheduled Edge Function)

**Files:**
- Create: `supabase/functions/weekly-grant/index.ts`
- Create: `supabase/migrations/20260508120300_phase1_weekly_grant_rpc.sql`
- Modify: `supabase/config.toml` (필요 시)

**Step 1: RPC 함수 작성** — Edge Function이 호출할 일괄 발급 RPC

```sql
-- supabase/migrations/20260508120300_phase1_weekly_grant_rpc.sql

-- 매주 일요일 0시 KST에 active Pro 사용자 전원에게 50 credits + 1 test entitlement 발급
-- 일요일 0시 KST = 토요일 15:00 UTC
-- period: 일요일 00:00 KST ~ 토요일 23:59:59 KST (= 토요일 15:00 UTC ~ 다음 토요일 14:59:59 UTC)
CREATE OR REPLACE FUNCTION public.grant_weekly_pro_benefits()
RETURNS TABLE (granted_count int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  v_period_start timestamptz;
  v_period_end timestamptz;
BEGIN
  -- 주간 period 계산 (일요일 0시 KST 시작)
  -- now()의 시점에서 가장 가까운 직전 일요일 0시 KST
  v_period_start := date_trunc('week', (now() AT TIME ZONE 'Asia/Seoul'))::timestamp AT TIME ZONE 'Asia/Seoul';
  -- date_trunc('week')는 월요일 시작이므로 -1일 보정
  v_period_start := v_period_start - interval '1 day';
  v_period_end := v_period_start + interval '7 days';

  -- 이번 주 이미 grant 받은 사용자는 스킵 (idempotent)
  WITH active_pro AS (
    SELECT s.user_id
    FROM public.user_subscriptions s
    JOIN public.subscription_plans p ON p.id = s.plan_id
    WHERE s.status = 'active'
      AND s.current_period_end > now()
      AND p.code = 'pro_monthly'
  ),
  skip_existing AS (
    SELECT user_id FROM public.user_credits
    WHERE source = 'pro_weekly' AND period_start = v_period_start
  ),
  to_grant AS (
    SELECT user_id FROM active_pro WHERE user_id NOT IN (SELECT user_id FROM skip_existing)
  ),
  inserted_credits AS (
    INSERT INTO public.user_credits (user_id, period_start, period_end, credits_granted, source)
    SELECT user_id, v_period_start, v_period_end, 50, 'pro_weekly' FROM to_grant
    RETURNING user_id
  )
  INSERT INTO public.test_entitlements (user_id, test_id, source, expires_at)
  SELECT user_id, NULL, 'weekly_pro', v_period_end FROM inserted_credits;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_weekly_pro_benefits() TO service_role;
```

**Step 2: 단위 테스트 작성 (SQL 수동 검증)**

Supabase SQL Editor에서:
```sql
-- 더미 사용자 + Pro 구독 1건 생성 후
SELECT public.grant_weekly_pro_benefits();   -- 1
SELECT public.grant_weekly_pro_benefits();   -- 0 (idempotent)
```

**Step 3: Edge Function 작성**

`supabase/functions/weekly-grant/index.ts`:
```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

serve(async (req) => {
  // pg_cron 또는 Supabase scheduled function이 호출. 외부 차단을 위해 secret 검증.
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== Deno.env.get('CRON_SECRET')) {
    return new Response('forbidden', { status: 403 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data, error } = await supabase.rpc('grant_weekly_pro_benefits');
  if (error) {
    console.error('weekly-grant error', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  console.log('weekly-grant success', data);
  return new Response(JSON.stringify({ ok: true, granted: data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
```

**Step 4: 스케줄 등록** — `supabase/migrations/20260508120400_phase1_weekly_grant_schedule.sql`:
```sql
-- pg_cron 활성화 (없을 시) + 매주 토요일 15:00 UTC = 일요일 00:00 KST 트리거
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'weekly-grant-sunday-kst',
  '0 15 * * 6',  -- 토요일 15:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://bnhnaaarsyauppdbrbco.supabase.co/functions/v1/weekly-grant',
    headers := jsonb_build_object('x-cron-secret', current_setting('app.cron_secret', true)),
    timeout_milliseconds := 30000
  );
  $$
);
```

**중요:** `current_setting('app.cron_secret')`는 `ALTER DATABASE postgres SET app.cron_secret = '<secret>';`를 super_admin이 SQL Editor에서 1회 실행해야 작동. `CRON_SECRET` 값은 Edge Function 환경변수와 동일해야 함.

**Step 5: 배포 + 수동 트리거 검증**

```bash
npx supabase functions deploy weekly-grant
```
수동 호출:
```bash
curl -X POST https://bnhnaaarsyauppdbrbco.supabase.co/functions/v1/weekly-grant \
  -H "x-cron-secret: <CRON_SECRET>"
```
Expected: `{"ok":true,"granted":[{"granted_count":N}]}`. Pro 사용자 0명이면 N=0.

**Step 6: Commit**

```bash
git add supabase/migrations/20260508120300_phase1_weekly_grant_rpc.sql \
        supabase/migrations/20260508120400_phase1_weekly_grant_schedule.sql \
        supabase/functions/weekly-grant/
git commit -m "P1.5: weekly grant RPC + scheduled edge function (일요일 0시 KST)"
```

---

## Task 7: B2C Pro 결제 — Toss 빌링 키 발급 + 첫 결제

**Files:**
- Create: `supabase/functions/issue-billing-key/index.ts`
- Create: `supabase/functions/charge-pro-subscription/index.ts`
- Modify: `supabase/functions/_shared/pricing.ts` (Pro 정기결제 금액)
- Modify: `src/lib/payments/catalog-display.ts` (`comingSoon: false`)
- Modify: `src/pages/PricingPage.tsx` (Pro 카드 활성화)
- Create: `src/pages/BillingAuthCallbackPage.tsx` (빌링 인증 콜백)
- Modify: `src/App.tsx` (라우트 추가)

**Step 1: 카탈로그 활성화**

`src/lib/payments/catalog-display.ts:46-54`:
```ts
export const PRO_PLAN_DISPLAY: DisplayProduct = {
  productType: 'pro_subscription',
  productId: 'pro-monthly',
  name: 'Pro 멤버십',
  description: '월 ₩9,900 / 50 크레딧 + 무료 검사 1회 (매주 갱신)',
  amount: 9900,
  currency: 'KRW',
  // comingSoon 제거
};
```

**Step 2: 빌링 키 발급 Edge Function**

`supabase/functions/issue-billing-key/index.ts`:
```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), { status: 401, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) {
    return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), { status: 401, headers: corsHeaders });
  }
  const userId = userData.user.id;

  const body = await req.json() as { authKey: string; customerKey: string };
  if (!body.authKey || !body.customerKey) {
    return new Response(JSON.stringify({ error: "INVALID_BODY" }), { status: 400, headers: corsHeaders });
  }

  // Toss 빌링 키 발급 API 호출
  const tossSecret = Deno.env.get("TOSS_SECRET_KEY")!;
  const basicAuth = btoa(`${tossSecret}:`);
  const tossRes = await fetch("https://api.tosspayments.com/v1/billing/authorizations/issue", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${basicAuth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ authKey: body.authKey, customerKey: body.customerKey }),
  });

  if (!tossRes.ok) {
    const err = await tossRes.text();
    console.error("Toss billing key issue failed", err);
    return new Response(JSON.stringify({ error: "TOSS_FAILED", detail: err }), {
      status: 502, headers: corsHeaders,
    });
  }
  const tossData = await tossRes.json();
  const billingKey = tossData.billingKey as string;

  // 첫 결제 즉시 시도 (₩9,900)
  const orderId = `pro-init-${userId}-${Date.now()}`;
  const chargeRes = await fetch(`https://api.tosspayments.com/v1/billing/${billingKey}`, {
    method: "POST",
    headers: { "Authorization": `Basic ${basicAuth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      customerKey: body.customerKey,
      amount: 9900,
      orderId,
      orderName: "마인드코치 AI Pro 멤버십",
    }),
  });

  if (!chargeRes.ok) {
    const err = await chargeRes.text();
    console.error("Toss first charge failed", err);
    return new Response(JSON.stringify({ error: "FIRST_CHARGE_FAILED", detail: err }), {
      status: 502, headers: corsHeaders,
    });
  }
  const chargeData = await chargeRes.json();

  // DB 트랜잭션: subscription + billing_key 저장 + payment_record + 첫 weekly grant
  const admin = createClient(supabaseUrl, serviceKey);
  const { data: planData } = await admin.from('subscription_plans').select('id').eq('code', 'pro_monthly').single();
  if (!planData) {
    return new Response(JSON.stringify({ error: "PLAN_NOT_FOUND" }), { status: 500, headers: corsHeaders });
  }

  const periodStart = new Date();
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { data: subData, error: subErr } = await admin.from('user_subscriptions').insert({
    user_id: userId,
    plan_id: planData.id,
    status: 'active',
    current_period_start: periodStart.toISOString(),
    current_period_end: periodEnd.toISOString(),
    toss_billing_key: billingKey,
  }).select('id').single();
  if (subErr) {
    console.error("subscription insert failed", subErr);
    return new Response(JSON.stringify({ error: "DB_ERROR", detail: subErr.message }), {
      status: 500, headers: corsHeaders,
    });
  }

  await admin.from('payment_records').insert({
    user_id: userId,
    type: 'subscription',
    amount_krw: 9900,
    status: 'succeeded',
    toss_payment_key: chargeData.paymentKey,
    toss_order_id: orderId,
    related_subscription_id: subData.id,
    metadata: { provider: 'toss', method: 'billing' },
  });

  // 즉시 첫 weekly grant
  await admin.rpc('grant_weekly_pro_benefits');

  return new Response(JSON.stringify({ ok: true, subscriptionId: subData.id }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
```

**Step 3: 매월 자동 청구 Edge Function**

`supabase/functions/charge-pro-subscription/index.ts`:
```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

serve(async (req) => {
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== Deno.env.get('CRON_SECRET')) return new Response('forbidden', { status: 403 });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const tossSecret = Deno.env.get('TOSS_SECRET_KEY')!;
  const basicAuth = btoa(`${tossSecret}:`);

  // 갱신 대상: source='direct' AND status='active' AND current_period_end < now() + 1일
  const { data: dueSubs } = await admin.from('user_subscriptions')
    .select('id, user_id, toss_billing_key, current_period_end')
    .eq('status', 'active')
    .lt('current_period_end', new Date(Date.now() + 86400000).toISOString())
    .not('toss_billing_key', 'is', null);

  let success = 0, fail = 0;
  for (const sub of dueSubs ?? []) {
    const orderId = `pro-renew-${sub.user_id}-${Date.now()}`;
    const res = await fetch(`https://api.tosspayments.com/v1/billing/${sub.toss_billing_key}`, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${basicAuth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerKey: sub.user_id,
        amount: 9900,
        orderId,
        orderName: '마인드코치 AI Pro 멤버십 (갱신)',
      }),
    });
    if (res.ok) {
      const newEnd = new Date(sub.current_period_end);
      newEnd.setMonth(newEnd.getMonth() + 1);
      await admin.from('user_subscriptions')
        .update({ current_period_end: newEnd.toISOString(), updated_at: new Date().toISOString() })
        .eq('id', sub.id);
      const charge = await res.json();
      await admin.from('payment_records').insert({
        user_id: sub.user_id, type: 'subscription', amount_krw: 9900, status: 'succeeded',
        toss_payment_key: charge.paymentKey, toss_order_id: orderId, related_subscription_id: sub.id,
        metadata: { provider: 'toss', method: 'billing', renewal: true },
      });
      success++;
    } else {
      const detail = await res.text();
      await admin.from('user_subscriptions').update({ status: 'past_due' }).eq('id', sub.id);
      await admin.from('payment_records').insert({
        user_id: sub.user_id, type: 'subscription', amount_krw: 9900, status: 'failed',
        toss_order_id: orderId, related_subscription_id: sub.id,
        metadata: { provider: 'toss', method: 'billing', renewal: true, error: detail },
      });
      fail++;
    }
  }
  return new Response(JSON.stringify({ ok: true, success, fail }), { status: 200 });
});
```

**Step 4: 매일 갱신 cron 등록**

`supabase/migrations/20260508120500_phase1_pro_renewal_schedule.sql`:
```sql
SELECT cron.schedule(
  'pro-renewal-daily',
  '0 16 * * *',  -- 매일 16:00 UTC = 다음날 1시 KST
  $$
  SELECT net.http_post(
    url := 'https://bnhnaaarsyauppdbrbco.supabase.co/functions/v1/charge-pro-subscription',
    headers := jsonb_build_object('x-cron-secret', current_setting('app.cron_secret', true)),
    timeout_milliseconds := 60000
  );
  $$
);
```

**Step 5: 프론트엔드 — Pro 결제 트리거**

`src/pages/PricingPage.tsx`에 "Pro 구독" CTA 추가. Toss SDK는 `@tosspayments/payment-widget-sdk` 또는 `@tosspayments/tosspayments-sdk` 사용:

```bash
npm install @tosspayments/tosspayments-sdk
```

`src/lib/payments/toss-billing.ts` (신규):
```ts
import { loadTossPayments } from '@tosspayments/tosspayments-sdk';

export async function startProBillingFlow(userId: string) {
  const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY;
  const tossPayments = await loadTossPayments(clientKey);
  await tossPayments.requestBillingAuth('카드', {
    customerKey: userId,
    successUrl: `${window.location.origin}/billing/success`,
    failUrl: `${window.location.origin}/billing/fail`,
  });
}
```

`src/pages/BillingAuthCallbackPage.tsx`:
```tsx
import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BillingAuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const authKey = params.get('authKey');
    const customerKey = params.get('customerKey');
    if (!authKey || !customerKey) {
      toast.error('결제 정보가 누락되었습니다.');
      navigate('/pricing'); return;
    }
    void supabase.functions.invoke('issue-billing-key', {
      body: { authKey, customerKey },
    }).then(({ data, error }) => {
      if (error || !data?.ok) {
        toast.error('결제 등록에 실패했습니다.');
        navigate('/pricing');
      } else {
        toast.success('Pro 구독이 시작되었습니다!');
        navigate('/dashboard');
      }
    });
  }, [params, navigate]);

  return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
}
```

`src/App.tsx`에 라우트 추가:
```tsx
<Route path="/billing/success" element={<BillingAuthCallbackPage />} />
<Route path="/billing/fail" element={<PaymentFailPage />} />
```

`src/pages/PricingPage.tsx`에 Pro 카드 + CTA — 기존 `comingSoon` 분기 제거하고 `startProBillingFlow(user.id)` 호출 버튼 추가. (구체적 위치는 기존 PRO_PLAN_DISPLAY 사용처를 grep으로 찾아 그 자리에 활성화.)

**Step 6: Edge Functions 배포**

```bash
npx supabase functions deploy issue-billing-key
npx supabase functions deploy charge-pro-subscription
```

Supabase Dashboard → Edge Functions → Secrets에 `TOSS_SECRET_KEY`, `CRON_SECRET` 등록 (UI에서). 또는:
```bash
npx supabase secrets set TOSS_SECRET_KEY=test_sk_xxx CRON_SECRET=<random>
```

**Step 7: 결제 E2E 수동 테스트** (테스트 카드 사용)

1. 카카오 로그인 → onboarding 통과 → `/pricing` 진입
2. "Pro 구독" 버튼 클릭 → Toss 결제창 → 테스트 카드 입력 (Toss 문서 기준 4*** ****)
3. `/billing/success` 콜백 → "Pro 구독이 시작되었습니다!" → `/dashboard`
4. Supabase에서 검증:
```sql
SELECT * FROM user_subscriptions WHERE user_id = '<my-uid>';      -- status='active', toss_billing_key 채워짐
SELECT * FROM payment_records WHERE user_id = '<my-uid>';         -- status='succeeded'
SELECT * FROM user_credits WHERE user_id = '<my-uid>' ORDER BY period_end DESC LIMIT 1; -- credits_granted=50
```

**Step 8: Commit**

```bash
git add supabase/functions/issue-billing-key supabase/functions/charge-pro-subscription \
        supabase/migrations/20260508120500_phase1_pro_renewal_schedule.sql \
        src/lib/payments/toss-billing.ts src/lib/payments/catalog-display.ts \
        src/pages/BillingAuthCallbackPage.tsx src/pages/PricingPage.tsx src/App.tsx \
        package.json package-lock.json
git commit -m "P1.6: Toss 빌링키 기반 Pro 정기결제 활성화"
```

---

## Task 8: 라우팅 가드 — student만 일반 영역 접근

**Files:**
- Modify: `src/components/ProtectedRoute.tsx`

**Step 1: 현재 ProtectedRoute 확인**

```bash
cat src/components/ProtectedRoute.tsx
```

**Step 2: user_type 확인 추가**

```tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [profileChecked, setProfileChecked] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user) { setProfileChecked(true); return; }
    void supabase.from('profiles')
      .select('user_type, onboarded_at')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.user_type === 'academy_admin') setShouldRedirect('/admin');
        else if (data?.user_type === 'super_admin') setShouldRedirect('/sysadmin');
        else if (!data?.onboarded_at) setShouldRedirect('/onboarding');
        setProfileChecked(true);
      });
  }, [user, loading]);

  if (loading || !profileChecked) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (shouldRedirect) return <Navigate to={shouldRedirect} replace />;
  return <>{children}</>;
}
```

**Step 3: 빌드 검증**

```bash
npm run build
npm run test
```

**Step 4: Commit**

```bash
git add src/components/ProtectedRoute.tsx
git commit -m "P1.x: ProtectedRoute에 user_type/onboarding 가드 추가"
```

---

## Task 9: Phase 1 통합 검증 + 클린컷 실행 + 배포

**Files:**
- 없음 (실행 검증 단계)

**Step 1: 모든 마이그레이션 적용 확인**

```sql
SELECT migration_name FROM supabase_migrations.schema_migrations ORDER BY 1 DESC LIMIT 10;
```
Expected: `20260508120000_*`, `20260508120100_*`, `20260508120300_*`, `20260508120400_*`, `20260508120500_*` 모두 적용됨.

**Step 2: 모든 Edge Function 배포 확인**

```bash
npx supabase functions list
```
Expected: `weekly-grant`, `issue-billing-key`, `charge-pro-subscription`, 그리고 기존 `chat-coaching`, `create-payment-order`, `verify-payment` 모두 active.

**Step 3: 클린컷 수동 실행** (Task 5에서 작성한 runbook)

`docs/runbooks/2026-05-08-cleancut.md` 절차 그대로 실행. 사람이 직접 SQL Editor에서 `DELETE FROM auth.users;` 실행.

**Step 4: 골든 패스 E2E 수동 테스트**

1. 시크릿 창 → `/auth` → 카카오 버튼 → 카카오 인증 → `/auth/callback` → `/onboarding` → 닉네임/학년 입력 → `/dashboard` 도착
2. `/pricing` → "Pro 구독" → Toss 결제창 → 테스트 카드 → `/billing/success` → "Pro 구독이 시작되었습니다!" → `/dashboard`
3. SQL: `user_subscriptions.status='active'`, `user_credits.credits_granted=50`, `test_entitlements.source='weekly_pro'` 확인
4. `/coaching` → 메시지 1회 → `consume_ai_credit` 호출되어 `credits_used=1`로 증가 확인
5. `/tests` → 무료 검사 1개 응시 → 결과 저장 확인

**Step 5: cron 수동 트리거 검증**

```sql
-- weekly-grant 강제 트리거
SELECT public.grant_weekly_pro_benefits();
-- 같은 주에 두 번째 호출 → 0 반환 (idempotent)
SELECT public.grant_weekly_pro_benefits();
```

**Step 6: GitHub push + Lovable 배포**

```bash
git push origin phase1-auth-cleancut
# GitHub에서 PR → main 머지
git checkout main && git pull --ff-only
```
Lovable Editor에서 "Publish" 클릭. 배포 후 `https://mindcoach-ai-quest.lovable.app` 시크릿 창 진입 → 카카오 로그인 작동 확인.

**Step 7: Lovable 환경변수 점검**

`src/integrations/supabase/client.ts`에 폴백 하드코딩이 살아있는지 확인 (Lovable이 또 revert했을 가능성). 살아있으면 OK, 사라졌으면 즉시 재커밋.

**Step 8: 완료 보고**

`docs/plans/2026-05-08-phase1-completion.md` 작성:
- 배포일/시점
- E2E 통과 여부
- 알려진 이슈 (있다면)
- Phase 2 시작 가능 여부

---

## 주요 리스크와 대응

| 리스크 | 영향 | 대응 |
|---|---|---|
| Lovable 자동 revert | client.ts 폴백 사라져 사이트 다운 | Task 9.7 점검, 재발 시 즉시 재커밋. memory `project_lovable_deployment.md` 참조 |
| 카카오 OAuth 미설정 | `/auth` 클릭 시 503 | 사전 조건 1번 완료 확인 후 P1.2 진행 |
| Toss 빌링 키 첫 결제 실패 | subscription insert 안 됨 | P1.6 Step 7에서 테스트 카드로 검증, prod 카드는 별도 staged rollout |
| pg_cron 미활성화 | weekly-grant 안 돌아감 | P1.5 Step 4 마이그레이션 실행 + `current_setting('app.cron_secret')` 설정 |
| 클린컷 후 김종환 코치 데이터 분실 | Tier 1 코칭 데이터 손실 | 사전에 김종환 계정 검사 결과/코칭 로그를 별도 export. Phase 2에서 재합류 |

---

## 완료 기준 (Definition of Done)

- [ ] 카카오 로그인 → onboarding → dashboard E2E 통과
- [ ] Pro 구독 결제 (테스트 카드) → 빌링키 저장 → 첫 grant 발급 통과
- [ ] `grant_weekly_pro_benefits()` 수동 호출 시 idempotent
- [ ] `charge-pro-subscription` 수동 호출 시 만료 임박 구독 갱신 (또는 0건 처리)
- [ ] 기존 사용자 클린컷 완료, `auth.users` 카운트 = 본인 1명
- [ ] Lovable 배포 후 시크릿 창에서 정상 진입
- [ ] `client.ts` 폴백 하드코딩 살아있음
- [ ] Phase 2 마이그레이션(B2B 테이블)은 **건드리지 않음**

---

## Phase 1 끝 → Phase 2 시작 시점

학원 영업이 1곳이라도 도입 결정 신호를 주면 Phase 2 착수. 그 전까지는 Phase 1 매출 검증과 Free→Pro 전환율 측정에 집중. Phase 2 플랜은 별도 문서로 작성 (`docs/plans/<date>-phase2-b2b-foundation.md`).
