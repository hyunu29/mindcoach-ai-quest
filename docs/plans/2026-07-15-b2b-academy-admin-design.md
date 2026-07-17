# 학원 관리자 대시보드 + 원생 신호 시스템 디자인 (B2B POC)

**날짜**: 2026-07-15
**작업 브랜치**: `vercel-migration`
**스코프**: B2B POC 초경량 MVP

## 배경

- 회의(2026-07-10)에서 결정: 학원 대상 관리자 프로그램을 6개월간 무료로 공급하며 가설 검증. 핵심 가치는 "학원이 원생 심리 신호(그린/옐로/레드)를 보고 개입할 수 있는 채널".
- 현재 앱은 B2C(카카오 로그인 원생 대상). `profiles.user_type`에 `academy_admin` 값이 이미 정의됨. 학원-원생 관계 테이블은 없음.
- 실제 데이터가 없으므로 POC로 무료 공급하며 검증하는 단계.

## 목표

1. **학원 관리자**가 자기 학원 원생들의 심리 신호(3색)를 대시보드에서 확인
2. **원생**이 학원 코드로 자기 계정을 학원에 연결 (프라이버시 고지 후)
3. **관리자 열람 범위**: 신호 + 검사 정량 결과 + 감정 점수 평균 (감정 메모/AI 대화 원문은 비공개)
4. **최단 시간 POC 출시** → 학원 사용성 피드백 확보 → v2 확장

## 확정 결정

| # | 결정 |
|---|---|
| 1 | MVP 스코프: 관리자 대시보드 + 원생 상세 + 학원 코드 연결 |
| 2 | 원생 연결: 학원 코드 즉시 연결 (관리자 승인 X) |
| 3 | 신호 계산: 규칙 기반 + 검사 결과 + 감정 평균 (AI 대화는 v2) |
| 4 | 미활동 조건 제외 |
| 5 | 관리자 열람 범위: 신호 + 정량 데이터. 감정 메모/AI 대화 원문 비공개 |
| 6 | 관리자 인증: 슈퍼 어드민이 이메일+임시 비밀번호 수동 프로비저닝 |
| 7 | 원생-학원 관계: 원생당 학원 1개 (`profiles.academy_id`) |

## 시스템 구조

### URL 라우팅

```
/admin                 → 학원 대시보드 (원생 목록 + 신호 요약)
/admin/students/:id    → 원생 상세 (검사 결과 + 감정 트렌드)
/admin/settings        → 학원 정보 / 코드 조회
/auth                  → 기존 로그인 (학원장은 이메일+비밀번호)
/profile               → 원생용 (학원 코드 입력 필드 추가)
/onboarding            → 학원 코드 선택 필드 추가
```

- `ProtectedRoute` 확장: `user_type === 'academy_admin'`이면 `/admin` 접근 가능
- 학원장 로그인 시 자동 `/admin` 이동, 원생은 `/dashboard`

### DB 스키마

```sql
create table public.academies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  admin_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create index idx_academies_code_lower on public.academies (lower(code));

alter table public.profiles
  add column academy_id uuid references public.academies(id) on delete set null,
  add column academy_joined_at timestamptz;

create index idx_profiles_academy_id on public.profiles (academy_id);
```

### RLS 정책

- `academies`: `academy_admin`은 자기 학원만 select
- `profiles`: `academy_admin`은 `academy_id`가 자기 학원인 원생 select 가능
- `test_results`, `emotion_records`: 관리자는 자기 학원 원생의 정량 데이터만 select
- `coaching_sessions`, `emotions`(메모): 관리자 select 정책 추가 안 함 (원생 본인만)

## 신호 계산 로직

### 데이터 소스 (최근 30일)

- `test_results`
  - 통합검사(INT) 10영역 subdomain 점수
  - 개별 단품 검사의 위험 등급
- `emotion_records.emotion_score` (1~5점)

### 규칙

| 신호 | 조건 |
|---|---|
| 🟢 그린 | 위험 영역 0개 AND 감정 평균 ≥ 3.5 |
| 🟡 옐로 | 위험 영역 1~2개 OR 감정 평균 2.5~3.5 |
| 🔴 레드 | 위험 영역 3개 이상 OR 감정 평균 < 2.5 |
| ⚪ 미평가 | 30일 내 검사/감정 기록 전무 |

- "위험 영역": INT 검사 subdomain 점수가 임계값(초기 25점 만점 기준 12점 미만) 이하 + 개별 단품 검사에서 "위험" 등급
- 임계값은 튜닝 여지 남김 (초기값 후 학원 피드백으로 조정)

### 갱신 방식

- MVP: 대시보드 로드 시 Postgres RPC(`calculate_academy_signals(academy_id)`)로 실시간 계산
- 학원 원생 100명 규모까지 부담 없음. 이후 cron 갱신으로 이동 (v2)

## UI 초안

### 학원 대시보드 (`/admin`)

- 헤더: 학원명, 원생 수, 학원 코드 (복사 버튼)
- 신호 요약 카드 4개 (그린/옐로/레드/미평가 카운트)
- 필터 탭 + 정렬(위험순/이름순)
- 원생 카드 리스트: 신호 뱃지, 이름/학년, 위험 영역 수, 감정 평균, 최근 활동, [상세] 버튼

### 원생 상세 (`/admin/students/:id`)

- 신호 카드 (색 + 신호 뱃지 + 이유 설명)
- 통합검사 결과 카드 (영역별 위험/보통/안전)
- 감정 트렌드 라인 차트 (30일)
- 개별 단품 검사 이력 리스트
- 프라이버시 안내 배너 (하단)

### 원생 온보딩/프로필 (학원 코드 입력)

- 온보딩 페이지에 학원 코드 필드 (선택 입력)
- 프로필 페이지에 "학원 연결" 카드
- 최초 연결 시 프라이버시 모달 (학원 열람 범위 명시)

## 파일 변경 목록

| 파일 | 변경 |
|---|---|
| `supabase/migrations/YYYYMMDD_academies_and_admin_dashboard.sql` | 신규 |
| `supabase/migrations/YYYYMMDD_calculate_signal_rpc.sql` | 신규 |
| `src/pages/admin/AdminDashboardPage.tsx` | 신규 |
| `src/pages/admin/AdminStudentDetailPage.tsx` | 신규 |
| `src/pages/admin/AdminSettingsPage.tsx` | 신규 |
| `src/layouts/AdminLayout.tsx` | 신규 |
| `src/App.tsx` | `/admin/*` 라우트 추가 |
| `src/components/ProtectedRoute.tsx` | academy_admin 가드 로직 |
| `src/pages/OnboardingPage.tsx` | 학원 코드 필드 |
| `src/pages/ProfilePage.tsx` | 학원 연결 카드 |
| `src/hooks/useAcademyStudents.ts` | 신규 |
| `src/hooks/useStudentSignal.ts` | 신규 |
| `src/lib/academy/signal-calc.ts` | 신규 (RPC wrapper) |
| `src/components/academy/AcademyCodeInput.tsx` | 신규 |
| `src/components/academy/PrivacyDisclosureModal.tsx` | 신규 |
| `docs/runbooks/YYYYMMDD-academy-provisioning.md` | 신규 (오퍼레이션 매뉴얼) |

## 스코프 밖 (v2 이후)

- AI 코칭 대화 스캔 (신호 로직 편입)
- 학원 자체 회원가입/결제 흐름
- 알림/이메일 발송 (레드 신호 알림 등)
- CSV export / 리포트 다운로드
- 관리자가 여러 스태프 초대
- 학원 광고 배너/포스터 관리
- 캐릭터/브랜딩 관련 회의 아이템 (별도 트랙)

## 검증 가설 (POC 성과 지표)

1. 학원 관리자가 대시보드를 정기적으로 접속하는가 (주 1회 이상)
2. 원생이 학원 코드로 자발적으로 연결하는가 (전달된 코드 대비 연결율)
3. 레드/옐로 원생 대상 학원의 실제 개입(상담/연락)이 일어나는가 (학원 정성 인터뷰)
4. 원생 이탈률 감소로 이어지는가 (3개월 후 학원 리포트)
