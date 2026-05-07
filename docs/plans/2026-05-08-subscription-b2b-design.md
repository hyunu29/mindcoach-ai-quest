# 구독 요금제 활성화 + B2B(학원) 도입 설계

작성일: 2026-05-08
대상 리포: `mindcoach-ai-quest`

---

## 1. 배경 / 목표

현재 마인드코치 AI는 B2C 단일 사용자 구조다. Free 4종 검사 + 단품 ₩2,900/검사 결제 + Pro 월간 ₩9,900/월(스키마만 존재, 비활성)로 구성. B2B 학원 판매 흐름은 코드/스키마 모두 0건.

이 설계는 두 가지를 한 번에 정의한다:

1. **B2C Pro 구독 활성화** — 매출 발생 가능 상태로 끌어올린다.
2. **B2B 학원 도입 트랙** — 학원이 1년 계약 + 시트 패키지로 결제하면, 학생들이 학원 코드로 Pro에 합류하고 학원이 대시보드로 학생 검사 결과를 관리하는 구조.

---

## 2. 확정 결정 사항 (요약)

| # | 결정 |
|---|---|
| 1 | 학원 학생 entitlement = 일반 Pro와 **완전 동일** (단일 entitlement 모델). 학원 결제는 "학생 대신 Pro 비용 대납" 패키지. |
| 2 | 학원 ↔ 학생 매핑은 **시트 패키지 모델** — 학원이 N석 구매, 학생 코드 입력 시 시트 1개 차감, admin 제거 시 시트 즉시 반환. |
| 3 | 학원 admin 계정 / 학원 코드 / 시트 수는 **우리가 수동 발급**. 학원이 셀프 가입 안 함. 정찰제 비공개 + 1년 계약 + 도입 문의 흐름. |
| 4 | Pro 권한 종료 트리거: **(A) 학원 계약 만료일에 즉시 종료, (B) admin 학생 제거 시 즉시 종료 + 시트 즉시 회수**. 검사 결과 등 학생 본인 데이터는 강등 후에도 보존. |
| 5 | 학원 admin이 보는 데이터: **검사 응시 여부 / 결과 점수 / 응시 시점 + 학생 식별자만**. AI 코칭 대화 내용은 비공개. |
| 6 | Weekly grant 수치: **50 AI 크레딧/주 + 1 무료 검사/주** (월 환산 200 + 4회). 매주 일요일 0시 KST 자동 보충, **이월 없음(매주 리셋)**. |
| 7 | 학생 일반 사용자 인증: **카카오 OAuth 단독**. |
| 8 | 학원 admin 인증: **이메일 + 비번**, 별도 페이지 `/admin/login`. 첫 로그인 비번 재설정 강제. |
| 9 | super_admin 인증: **이메일 + 비번 + TOTP 2FA**, 별도 페이지 `/sysadmin/*` (비공개 URL). |
| 10 | 기존 이메일/비번 사용자: **클린 컷** — 모두 삭제 후 카카오로 새로 가입. |

---

## 3. 시스템 모델

### 사용자 역할 (3종)

`profiles.user_type` ENUM 컬럼으로 구분. `auth.users`는 단일 테이블 공유.

| user_type | 설명 | 인증 | 발급 |
|---|---|---|---|
| `student` | 일반 가입자. Free 또는 Pro. 학원 코드로 학원 소속 가능. | 카카오 OAuth | 셀프 가입 |
| `academy_admin` | 학원 관리자. 본인 학원 학생 데이터만 조회/관리. | 이메일+비번 | 우리 수동 발급 |
| `super_admin` | 운영자(우리). 시스템 전체 권한. | 이메일+비번+TOTP 2FA | SQL/스크립트로 직접 |

### Entitlement 단일 모델

Pro 활성화 출처(`user_subscriptions.source`)만 다르고 혜택은 동일.

```
누구든 Pro 활성이면 동일하게:
  - 50 AI 크레딧 / 주 (월 환산 200)
  - 1 무료 검사 / 주 (월 환산 4)
  - 매주 일요일 0시 KST 자동 보충, 이월 없음

source:
  - 'direct'   — 본인이 ₩9,900/월 결제 (개인 Pro)
  - 'academy'  — 학원 코드로 합류 (학원이 시트로 일괄 결제)
```

---

## 4. 데이터 모델

### 4.1 기존 테이블 변경

```sql
-- profiles에 역할 컬럼 추가
ALTER TABLE profiles
  ADD COLUMN user_type text NOT NULL DEFAULT 'student'
  CHECK (user_type IN ('student','academy_admin','super_admin'));

-- user_credits의 period 의미를 weekly로 전환
-- (period_start/end 컬럼 그대로, source 값만 정리)
-- source: 'free_signup' | 'pro_weekly'   ← 기존 'free_monthly'/'pro_monthly' 리네임
-- 매주 일요일 0시(KST) cron이 활성 Pro 사용자 전원에게 새 row insert
-- 미사용분은 자동 만료 (period_end 지나면 무효, 누적 안 됨)

-- user_subscriptions에 출처 표시
ALTER TABLE user_subscriptions
  ADD COLUMN source text NOT NULL DEFAULT 'direct'
  CHECK (source IN ('direct','academy')),
  ADD COLUMN academy_membership_id uuid REFERENCES academy_memberships(id);
```

### 4.2 B2B 신규 테이블 (4종)

```sql
-- 학원 마스터
CREATE TABLE academies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_email text,
  contact_phone text,
  contract_start_date date NOT NULL,
  contract_end_date date NOT NULL,           -- 만료일 = 일괄 강등 트리거
  total_seats int NOT NULL CHECK (total_seats > 0),
  invite_code text UNIQUE NOT NULL,           -- 학원 코드 (8자리 영문+숫자)
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','suspended','expired')),
  notes text,                                  -- super_admin 메모
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 학원 admin 매핑 (학원당 admin N명 가능)
CREATE TABLE academy_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id uuid NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'admin',         -- 향후 'viewer' 등 확장
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(academy_id, user_id)
);

-- 학원 ↔ 학생 매핑 = 시트 점유
CREATE TABLE academy_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id uuid NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  consent_given_at timestamptz NOT NULL,      -- 데이터 조회 동의 시점
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','removed','consent_withdrawn','expired')),
  removed_at timestamptz,
  UNIQUE(academy_id, user_id)
);

-- 도입 문의 (B2B 영업 깔때기)
CREATE TABLE inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_name text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  expected_seats int,
  message text,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','contacted','converted','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### 4.3 파생 뷰 — 학원별 시트 카운트

```sql
CREATE VIEW academy_seat_usage AS
SELECT a.id, a.name, a.total_seats,
       COUNT(m.id) FILTER (WHERE m.status='active') AS used_seats,
       a.total_seats - COUNT(m.id) FILTER (WHERE m.status='active') AS available_seats
FROM academies a
LEFT JOIN academy_memberships m ON m.academy_id = a.id
GROUP BY a.id;
```

### 4.4 RLS 정책 핵심

| 테이블 | 학생 | academy_admin | super_admin |
|---|---|---|---|
| `profiles` | 본인 row만 | 본인 학원 학생들의 row만 SELECT | 풀 권한 |
| `test_results` | 본인 row만 | 본인 학원 학생들의 row만 SELECT | 풀 권한 |
| `coaching_sessions` | 본인 row만 | **차단** (AI 코칭 대화 비공개) | 풀 권한 |
| `user_credits` | 본인 row만 | **차단** (학생 사용량은 학원이 알 필요 없음) | 풀 권한 |
| `academies` | 본인 소속 학원만 SELECT | 본인 학원만 SELECT | 풀 권한 |
| `academy_memberships` | 본인 row만 | 본인 학원 row만 | 풀 권한 |
| `inquiries` | 본인이 만든 row만 (선택) | 차단 | 풀 권한 |

학원 admin 정책 예시:
```sql
CREATE POLICY academy_admin_sees_own_students ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM academy_memberships m
      JOIN academy_admins a ON a.academy_id = m.academy_id
      WHERE m.user_id = profiles.id
        AND a.user_id = auth.uid()
        AND m.status = 'active'
    )
  );
```

---

## 5. 가입/로그인 흐름

### 5.1 학생 (일반 사용자)

```
/login 또는 /signup → "카카오로 시작하기" 버튼만
→ Supabase Auth (kakao provider) OAuth 흐름
→ 첫 진입이면 onboarding (닉네임/학교/학년 1회 입력)
→ profiles(user_type='student') insert
→ 기존 grant_free_plan_on_signup 트리거 작동 → free 권한 부여
→ 메인 진입
```

### 5.2 학원 admin

```
/admin/login (학생용 /login과 완전 분리)
→ 이메일 + 비번 폼만 (소셜 옵션 없음)
→ 첫 로그인 시 강제 비번 재설정 (Supabase password recovery 활용)
→ /admin 대시보드 진입

가입 행위 자체는 admin 본인이 안 함:
- super_admin 백오피스가 auth.users에 임시 비번으로 계정 생성
- profiles(user_type='academy_admin') + academy_admins(academy_id, user_id)
- 발급된 이메일/임시비번을 우리가 학원에 안내
```

### 5.3 super_admin

```
/sysadmin/login (URL 자체 비공개)
→ 이메일 + 비번 + TOTP 2FA (Authenticator 6자리 코드)
→ /sysadmin/* 백오피스 진입

계정 발급은 SQL/스크립트로 직접 1-2개만 생성.
TOTP secret은 첫 로그인 시 QR 코드 스캔으로 등록.
```

### 5.4 라우팅 가드

```
- user_type='student'        → /admin/* 또는 /sysadmin/* 접근 시 / 로 redirect
- user_type='academy_admin'  → /admin/* 만 사용 가능, 다른 영역 차단
- user_type='super_admin'    → 모든 영역 접근 가능
```

### 5.5 기존 사용자 클린 컷

- 기존 이메일/비번 가입자 모두 `auth.users` + 종속 데이터 삭제
- 실유저 거의 없는 시점이라 가능 (테스트 계정 위주)
- 김종환 코치 등 실계정은 카카오로 재가입 안내

---

## 6. 핵심 사용자 흐름

### 6.1 개인 Pro 구독 (B2C 직결제)
```
가격 페이지 → "Pro 구독" 클릭 → Toss 정기결제 인증
→ payments(provider='toss', product_type='pro_subscription') +
  user_subscriptions(source='direct', plan='pro_monthly', period 1개월)
→ 즉시 첫 weekly grant 발급
→ 매월 자동 갱신 (Toss billing key 사용)
```

### 6.2 학원 도입 (B2B onboarding, 수동)
```
학원이 /b2b 페이지에서 "도입 문의" 폼 작성 (학원명/담당자/예상 원생 수/메시지)
→ inquiries 테이블 insert + 우리 이메일로 알림
→ 우리가 통화/미팅 → 1년 계약 체결 → 입금 확인
→ super_admin 백오피스 "신규 학원 발급" 폼 한 번 제출:
   1. auth.users admin 계정 생성 (임시 비번 자동 생성)
   2. profiles(user_type='academy_admin')
   3. academies row 생성 + invite_code 자동 생성 (8자리)
   4. academy_admins 매핑
   5. 임시 비번을 화면에 1회 표시 + 학원 이메일로 발송
→ 학원 admin 첫 로그인 → 비번 재설정 → 대시보드에서 invite_code 확인 → 학원 학생들에게 안내
```

### 6.3 학생이 학원 코드로 합류
```
학생 마이페이지 → "학원 코드 입력" → 코드 검증
  ✗ 시트 풀     → "학원 정원 마감, 학원에 문의" 메시지
  ✗ 학원 만료   → "계약 종료된 학원" 메시지
  ✓ 통과       → 동의 화면:
                "${학원명}이 검사 응시 여부/결과를 조회/관리합니다.
                 AI 코칭 대화는 비공개입니다.
                 동의하시겠습니까?"
  → 동의 시:
    - academy_memberships(status='active', consent_given_at=now()) insert
    - user_subscriptions(source='academy', academy_membership_id, period=학원 계약 종료일까지) insert
    - 즉시 첫 weekly grant 발급
    - 학원 admin에게 인앱 알림 (선택, Phase 4)
```

### 6.4 학원 계약 만료 (자동, cron)
```
매일 0시 KST cron 실행:
  - contract_end_date < today인 academies → status='expired'
  - 그 학원의 active memberships → status='expired'
  - 그 학생의 user_subscriptions(source='academy') → status='cancelled', period_end=오늘
  - 학생에게 "학원 계약 만료로 Free 전환" 인앱+이메일 알림
  - 만료 30일 전 / 7일 전 cron: admin에게 "재계약 안 하면 N명 학생 강등됩니다" 이메일
```

### 6.5 admin이 학생 제거
```
대시보드 학생 목록 → "학원에서 제거" 클릭 → 확인 모달 → 실행:
  - membership status='removed', removed_at=now()
  - user_subscription(source='academy') → cancelled
  - weekly grant 즉시 중단 (이번 주 잔여분도 무효)
  - 학생에게 "학원에서 제거되었습니다" 이메일
  - 시트 즉시 반환 (academy_seat_usage 자동 반영)
```

### 6.6 학생 동의 철회
```
마이페이지 → "학원 데이터 공유 철회" → 확인 → 실행:
  - membership status='consent_withdrawn'
  - user_subscription(source='academy') → cancelled (Free로 강등)
  - 시트 즉시 반환
  - admin에게 "학생 N명이 동의 철회로 탈퇴" 알림 (Phase 4)
  검사 결과 등 학생 본인 데이터는 그대로 보존, 학원만 더 이상 못 봄
```

### 6.7 Weekly grant (매주 일요일 0시 KST cron)
```
모든 active Pro 사용자 (source 무관) 대상:
  - user_credits insert(period: 일~토, credits_granted=50, source='pro_weekly')
  - test_entitlements insert(test_id=NULL=풀에서 1회, source='weekly_pro', expires_at=주말)
  - 누적 안 됨 (period 지나면 자동 무효)
```

### 6.8 강등 시 데이터 보존
- 검사 결과(`test_results`), AI 코칭 대화(`coaching_sessions`)는 모두 보존
- 학생 본인 마이페이지에서 영구 조회 가능
- 단 새 검사/코칭은 Free 권한 (무료 4종 + 신규 가입 free credits만)

---

## 7. 학원 admin 대시보드 UI

### 페이지 구조 (`/admin/*`)

```
/admin                 → 대시보드 홈
/admin/students        → 학생 목록
/admin/students/:id    → 학생 상세
/admin/analytics       → 학원 전체 집계 분석
/admin/settings        → 학원 정보 / 비번 변경
```

### 7.1 대시보드 홈
- 학원명, 계약 만료일까지 D-day
- 시트 사용 현황: `42 / 60 사용 중` 진행 바
- 학원 코드: 8자리 + "복사" + "학생 안내문 템플릿 복사"
- 최근 7일 활동: 신규 합류 N명, 검사 응시 N회, 동의 철회 N명
- 알림 배너: 만료 30일 전 / 시트 90% 이상 사용 시

### 7.2 학생 목록
| 컬럼 | 내용 |
|---|---|
| 이름 | 학생 닉네임 또는 실명 |
| 학교/학년 | 프로필 정보 |
| 합류일 | `academy_memberships.joined_at` |
| 응시 검사 수 | "8/30종" |
| 마지막 응시 | "3일 전" |
| 위험도 | 🟢 양호 / 🟡 주의 / 🔴 위험 |
| 액션 | "상세" / "제거" |

검색/정렬: 이름·학교·위험도·응시일. 필터: status. 페이지네이션 50명/page.

### 7.3 학생 상세
- 학생 기본 정보 (이름/학교/학년/합류일)
- 검사 응시 이력: 검사명 / 응시 시점 / 결과 점수 / 도메인별 세부
- 결과 시각화: 도메인별 라이다 차트, 위험 구간 표시
- AI 코칭 사용 여부만 표시 ("최근 7일 12회 사용") — 대화 내용은 RLS로 차단
- "학원에서 제거" 버튼 (확인 모달)

### 7.4 학원 전체 분석
- 도메인별 평균/분포 그래프
- "주의 이상" 학생 수 추이 (월별)
- 검사별 응시율
- 집계만 — 개별 학생 식별 정보 없이도 학원 단위 인사이트

### 7.5 설정
- 학원 정보: 학원명/대표 연락처 (수정 가능)
- 시트 수/계약 기간은 super_admin만 수정
- 비번 변경
- 학원 admin 추가/제거 (Phase 4 검토)

---

## 8. super_admin 백오피스 UI

### 페이지 구조 (`/sysadmin/*`)

```
/sysadmin                  → 시스템 개요 (전체 학원/사용자/매출 카운트)
/sysadmin/academies        → 학원 CRUD
/sysadmin/academies/new    → 신규 학원 발급 폼 (학원 + admin 계정 동시 생성)
/sysadmin/inquiries        → 도입 문의 관리
/sysadmin/users            → 사용자 검색/제재
/sysadmin/payments         → 결제 내역
```

신규 학원 발급 폼이 한 번 제출하면:
1. `auth.users` admin 계정 생성 (임시 비번 자동 생성, Supabase Admin API)
2. `profiles(user_type='academy_admin')`
3. `academies` row + `invite_code` 자동 생성 (8자리 영문+숫자, 중복 체크)
4. `academy_admins` 매핑
5. 임시 비번을 화면에 1회 표시 + 학원 이메일로 자동 발송

---

## 9. 알림 정책 (이메일 우선)

| 트리거 | 수신자 | 내용 |
|---|---|---|
| 학원 합류 | 학생 | "환영합니다, ${학원명}에 등록되었습니다" |
| 학원 합류 | admin (인앱) | "신규 학생 N명 합류" |
| 동의 철회 | admin | "학생 N명 동의 철회" |
| admin 학생 제거 | 학생 | "${학원명}에서 제거되었습니다" |
| 학원 만료 30일 전 | admin | "재계약 안 하면 N명 학생 강등 예정" |
| 학원 만료 7일 전 | admin | (위와 같음, 톤 강화) |
| 학원 만료 당일 | 학생 전원 | "학원 계약 만료로 Free 전환" |
| 신규 도입 문의 | super_admin | "신규 학원 문의" |

발송 인프라: Supabase Edge Function + 외부 이메일 서비스 (Resend / Postmark). 별도 알림 테이블 신설 안 함 (over-engineering 회피).

---

## 10. 구현 Phase 분리

### Phase 1 — 인증 클린 컷 + B2C Pro 활성화 (혼자 쓸 수 있는 상태)

```
P1.1  기존 이메일/비번 사용자 모두 삭제 (auth.users + 종속 테이블)
P1.2  카카오 OAuth provider 활성화 + /login 페이지 카카오 단독 버튼
P1.3  첫 진입 onboarding (닉네임/학교/학년)
P1.4  user_credits weekly 전환 (monthly→weekly 마이그레이션, source 리네임)
P1.5  weekly grant cron (Supabase scheduled edge function, 일요일 0시 KST)
P1.6  B2C Pro 결제 활성화 (Toss 정기결제, "준비 중" 카탈로그 → 실결제)
P1.7  Pro 사용자 경험 검증 (가입 → 결제 → 첫 grant → 검사/코칭)
```
**결과:** 개인 사용자 누구나 카카오 가입 + Pro 구독 가능. **매출 발생 가능 상태.**

### Phase 2 — B2B 기반 인프라 (학원 받을 준비)

```
P2.1  B2B 마이그레이션 (academies, academy_admins, academy_memberships, inquiries)
P2.2  profiles에 user_type 컬럼 추가, 라우팅 가드 적용
P2.3  /admin/login 페이지 + 학원 admin 인증 (이메일+비번, 첫 로그인 비번 재설정 강제)
P2.4  /sysadmin/* 페이지 + super_admin 인증 (이메일+비번+TOTP 2FA)
P2.5  super_admin 백오피스: 학원 발급 폼 (계정+코드+시트 동시 생성)
P2.6  /b2b 도입 문의 페이지 (폼 → inquiries insert + 우리 이메일 알림)
P2.7  super_admin 백오피스: 문의 관리 페이지
```
**결과:** 학원 영업 가능. 문의 받고 1년 계약하면 admin/코드 발급 즉시 가능.

### Phase 3 — 학원 학생 합류 + 학원 대시보드

```
P3.1  마이페이지에 "학원 코드 입력" 진입점
P3.2  코드 검증 + 동의 화면 (PIPA 명시 동의)
P3.3  합류 시 user_subscriptions(source='academy') 생성 + Pro 즉시 활성화
P3.4  RLS 정책 작성 (학원 admin이 본인 학원 학생만, AI 코칭 차단)
P3.5  학원 admin 대시보드 — 홈 (학원 정보, 시트 진행 바, 코드 표시)
P3.6  학원 admin 대시보드 — 학생 목록 (검색/정렬/위험도)
P3.7  학원 admin 대시보드 — 학생 상세 (검사 결과, AI 코칭은 사용 여부만)
P3.8  학원 admin "학생 제거" 액션 + 즉시 시트 회수
P3.9  학생 마이페이지 "동의 철회" 흐름
```
**결과:** 학원 1개 도입 → 학생들 코드로 합류 → admin 대시보드로 관리. End-to-end 완성.

### Phase 4 — 라이프사이클 자동화 + 알림 + 분석

```
P4.1  학원 계약 만료 cron (매일 0시 KST, 만료 학원의 학생 일괄 강등)
P4.2  알림 인프라 (Edge Function + 이메일 발송 — Resend 등)
P4.3  알림 트리거: 만료 30일/7일 전 admin 알림, 학생 강등 시 학생 알림
P4.4  학원 admin 대시보드 — 분석 페이지 (집계 그래프)
P4.5  학원 admin 대시보드 — 설정 페이지 (학원 정보 수정/비번 변경)
P4.6  운영자 도구: 시트 부족 경고 배너, 동의 철회 학생 통계
```
**결과:** 운영 자동화. 우리 수동 개입 최소화.

### 우선순위 정책

- **Phase 1 즉시 시작** — 인증 클린 컷이라 기존 코드 영향 크고, Pro 결제 활성화는 매출 시점.
- **Phase 2/3은 학원 1곳 도입 결정 시 박력 있게** — 박힌 마감 없으니 영업 진행 속도에 맞춤.
- **Phase 4는 학원 2-3곳 이상부터** — 1곳일 땐 cron 없이 수동 SQL로 충분.

---

## 11. 향후 검토 항목 (이 설계에서 결정 보류)

- 학원 admin 다중 인원 운영 (학원당 admin N명) UI — Phase 4
- 학원 학생들 간 그룹 분반 기능 — 데이터 모델 확장 필요 시점에 별도 설계
- 검사 결과 PDF 리포트 export — 학원 측 요청 들어오면 추가
- 결제 환불 흐름 — 단품 환불 + Pro 구독 중도 취소 (Phase 1 이후 별도 설계)
- 학원 학생 재합류 — 이전에 제거된 학생이 같은 코드 재입력 시 정책
