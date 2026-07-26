# 학원 코드 베네핏 + 관리자 체험 디자인 (Wave 1 of v2)

**날짜**: 2026-07-27
**작업 브랜치**: `vercel-migration`
**스코프**: Wave 1 = A(학원 코드 베네핏 자동 지급) + B'(관리자 체험 배너)
**Wave 2 이후**: D(월구독), C(담임/실장 개인 코드), E(시즌 프로모션) — 회의 미결 항목 결정 대기

## 배경

- v1(2026-07-15 배포)으로 학원 관리자 대시보드 + 원생 학원 연결 완료
- 회의(07-15)에서 **B2B 인센티브 쉐어** 모델 확정: 학원 코드가 학부모 결제 유인 역할 → 원생이 코드 입력하고 싶어지는 즉시 체감 베네핏 필요
- 관리자 대시보드는 원생 카드 리스트만 있고 관리자 자신이 검사/코칭 체험할 수단 없음 → 학원 영업 시 신뢰도 저하

## 목표

1. **A**: 원생이 학원 코드로 연결하면 유료 검사 이용권 + AI 코칭 크레딧 자동 지급 (환영 팩 + 주간 반복)
2. **B'**: 학원 관리자가 원생 페이지(`/tests`, `/coaching`)에 자유롭게 접근해 검사·코칭 체험 가능. 원생 페이지 상단에 조건부 배너로 관리자 컨텍스트 유지

## 확정 결정

| # | 결정 |
|---|---|
| 1 | 베네핏 유형: 유료 검사 이용권 + AI 코칭 크레딧 둘 다 |
| 2 | 지급 시점: 최초 연결 시 환영 팩 + 매주 일요일 반복 grant |
| 3 | 환영 팩: 유료 검사 3개 이용권(각 30일) + 크레딧 20개 |
| 4 | 주간 grant: 유료 검사 1개 이용권 + 크레딧 5개 |
| 5 | 학원 연결 해제 시: 기존 지급분 유지, 다음 주 grant부터 중단 |
| 6 | 관리자 체험: `/admin/experience/*` 별도 라우트 만들지 않고 원생 URL 재사용 + `ProtectedRoute allowAdmin` 옵션 + 관리자 배너 |

## A. 학원 코드 베네핏

### DB 스키마

```sql
alter table public.user_test_access
  add column source text not null default 'purchase'
  check (source in ('purchase', 'welcome', 'weekly'));

create index idx_user_test_access_source on public.user_test_access (user_id, source);
```

`user_test_access.test_id`가 `null`이면 "어느 유료 검사든 1개 응시 가능"으로 해석. 원생이 유료 검사 응시 시 가장 오래된 `expires_at`의 null test_id row에 `test_id`를 채우고 `used_at`을 세팅.

또는 더 심플: 원생이 유료 검사 응시 시 자동으로 `test_id`를 채워 넣어 30일간 그 검사만 응시 가능. 이 방식이 UX 명확.

### RPC 함수

```sql
-- 환영 팩 지급 (학원 연결 즉시 1회)
create or replace function public.grant_academy_welcome_pack(p_user_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  -- 유료 검사 3개 이용권 (null test_id = 자유 선택)
  insert into public.user_test_access(user_id, test_id, source, expires_at)
  select p_user_id, null, 'welcome', now() + interval '30 days'
  from generate_series(1, 3);

  -- AI 코칭 크레딧 20개
  update public.user_credits
     set credits = credits + 20
   where user_id = p_user_id;
end;
$$;
```

### 클라이언트 흐름

- `useConnectAcademy.connect()`가 profile 업데이트 후 `grant_academy_welcome_pack` RPC 호출
- PrivacyDisclosureModal에 하단 문구 추가:
  ```
  🎁 학원 연결 시 무료 검사 3개 이용권 + AI 코칭 크레딧 20개를 드려요
  ```
- ProfilePage "학원 연결" 카드에 지급 이력/현황 표시:
  ```
  이용 가능한 무료 검사 이용권: 4개
  다음 주간 그랜트: 7월 28일 (일)
  ```

### Weekly grant 확장

기존 `supabase/functions/weekly-grant` edge function 확장:
- profile.academy_id가 null이 아닌 원생에게 매주 grant 시 유료 검사 1개 이용권 + 크레딧 5개 추가

## B'. 관리자 체험

### ProtectedRoute 확장

```tsx
interface Props {
  children: React.ReactNode;
  requiredUserType?: 'student' | 'academy_admin' | 'super_admin';
  allowAdmin?: boolean;  // 추가
}
```

`allowAdmin`이 true면 학원 관리자도 이 페이지에 접근 가능 (강제 리다이렉트 하지 않음).

### 원생 페이지 라우트에 allowAdmin 추가

App.tsx의 `/tests`, `/tests/:id`, `/results/:id`, `/coaching`, `/emotion`, `/results/*` 등 원생용 라우트에 `<ProtectedRoute allowAdmin>` 부여.

### 관리자 컨텍스트 배너

`src/components/academy/AdminExperienceBanner.tsx` 신규:

```tsx
export default function AdminExperienceBanner() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    // profile.user_type 조회
  }, [user]);

  if (!isAdmin) return null;

  return (
    <div className="sticky top-0 z-40 bg-primary/10 border-b border-primary/30 px-4 py-2 flex items-center justify-between gap-2">
      <span className="text-xs">🎓 관리자 체험 중 · 원생이 보는 화면입니다</span>
      <button onClick={() => navigate('/admin')} className="text-xs font-medium underline">
        ← 관리자 대시보드로
      </button>
    </div>
  );
}
```

`AppLayout` 최상단에 `<AdminExperienceBanner />` 마운트.

### AdminLayout 사이드바 확장

`대시보드 / 학원 정보` 아래에 구분선 + 신규 그룹:

```
심리검사 체험 → /tests
AI 코칭 체험 → /coaching
```

관리자가 이 링크 클릭 시 원생 페이지로 이동, 배너로 컨텍스트 유지, 언제든 "← 관리자 대시보드로" 클릭해 복귀.

## 파일 변경 목록

| 파일 | 변경 |
|---|---|
| `supabase/migrations/YYYYMMDD_academy_benefits_source.sql` | 신규 (user_test_access.source 컬럼) |
| `supabase/migrations/YYYYMMDD_grant_academy_welcome_pack.sql` | 신규 (RPC 함수) |
| `supabase/functions/weekly-grant/index.ts` | 수정 (academy 원생 추가 grant) |
| `src/hooks/useConnectAcademy.ts` | 수정 (환영 팩 RPC 호출) |
| `src/components/academy/PrivacyDisclosureModal.tsx` | 수정 (베네핏 안내 추가) |
| `src/pages/ProfilePage.tsx` | 수정 (지급 현황 표시) |
| `src/components/ProtectedRoute.tsx` | 수정 (allowAdmin prop) |
| `src/App.tsx` | 수정 (원생 라우트에 allowAdmin) |
| `src/components/academy/AdminExperienceBanner.tsx` | 신규 |
| `src/layouts/AppLayout.tsx` | 수정 (배너 마운트) |
| `src/layouts/AdminLayout.tsx` | 수정 (체험 링크 추가) |

## 스코프 밖 (다음 웨이브)

- 월구독 (D) — 회의에서 월 요금 확정 후
- 담임/실장 개인 코드 (C) — 회의 미결 항목
- 시즌 프로모션 (E) — 별도 캠페인 트래킹 스키마
- 학원별 커스텀 지급량 — MVP 이후

## 검증 가설

1. 학원 코드 연결 즉시 원생이 받은 베네핏을 실제로 사용하는가 (환영 팩 3개 이용권 소진율)
2. 주간 grant를 통해 재방문율이 학원 미가입 대비 상승하는가
3. 관리자가 심리검사 체험 이후 학원 영업 성공률이 개선되는가 (질적 인터뷰)
