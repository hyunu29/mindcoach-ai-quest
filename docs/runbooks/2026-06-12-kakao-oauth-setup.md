# 카카오 OAuth 외부 설정 가이드 (2026-06-12)

**대상 작업:** P2-1 카카오 로그인 활성화 — 코드는 이미 구현됨, **Kakao Developers 콘솔 + Supabase Auth 콘솔 설정만 남음**.

**소요 시간:** ~30분
**책임 주체:** 사용자 (외부 콘솔)
**선행:** 없음 (도메인/사업자등록 불필요, 기본 Lovable 도메인으로 동작 가능)

---

## 0. 현재 코드 상태 (확인용)

- `src/hooks/useAuth.tsx` — `signInWithKakao()` 함수, `redirectTo: ${origin}/auth/callback`
- `src/pages/AuthPage.tsx` — 카카오 노란색 버튼 (`bg-[#FEE500]`)
- `src/pages/AuthCallbackPage.tsx` — 콜백 후 `/onboarding` 리다이렉트
- analytics `signup_attempt` 이벤트 자동 발화

→ 콘솔 설정만 마치면 즉시 동작.

---

## 1. Kakao Developers 앱 등록

### 1-1. 가입 + 앱 생성

1. https://developers.kakao.com 접속 → 카카오 계정 로그인
2. **내 애플리케이션** → **애플리케이션 추가하기**
3. 입력:
   - 앱 이름: `마이치`
   - 회사명: (사업자등록 전이면 본인 이름 또는 "마이치"로)
   - 카테고리: 교육 또는 라이프스타일
4. 저장 → 앱 진입

### 1-2. REST API 키 + Client Secret

1. **앱 키** 메뉴 → **REST API 키** 복사 (메모장 보관 — Supabase에 입력)
2. **보안** 메뉴 → **Client Secret** → **코드 생성** → 코드 복사 → 상태 **사용함**으로 변경

### 1-3. 카카오 로그인 활성화

1. **카카오 로그인** 메뉴 → **활성화 설정 ON**
2. **Redirect URI** 등록 (정확히 입력):
   ```
   https://bnhnaaarsyauppdbrbco.supabase.co/auth/v1/callback
   ```
   ⚠️ 이건 **Supabase**의 콜백 URL입니다. 우리 앱이 아니라 Supabase가 카카오 토큰을 받는 곳.

### 1-4. 동의항목 설정

**카카오 로그인 → 동의항목** 메뉴:
- ✅ 닉네임 — **필수 동의**
- ✅ 카카오계정(이메일) — **선택 동의** (가능하면 필수 동의로)
- 프로필 사진 — 선택 동의 (옵션)

### 1-5. 플랫폼 등록

**앱 설정 → 플랫폼** 메뉴 → **Web 플랫폼 등록** → 사이트 도메인 입력:
```
https://mindcoach-ai-quest.lovable.app
http://localhost:8080
```
(나중에 정식 도메인 받으면 추가)

---

## 2. Supabase Auth 콘솔 설정

### 2-1. Supabase Dashboard 로그인

- 계정: `ricky012941@gmail.com` (Supabase 계정. ⚠️ Lovable 계정과 다름)
- 또는 `ricky7@yonsei.ac.kr`로 연동 시도 중이면 그쪽 계정
- 프로젝트: `bnhnaaarsyauppdbrbco`

### 2-2. Site URL 등록

**Authentication → URL Configuration**:
- **Site URL**: `https://mindcoach-ai-quest.lovable.app`
- **Redirect URLs** 추가:
  ```
  https://mindcoach-ai-quest.lovable.app/auth/callback
  http://localhost:8080/auth/callback
  ```
  (정식 도메인 받으면 추가)

### 2-3. Kakao Provider 활성화

**Authentication → Providers → Kakao**:
1. **Enable Sign in with Kakao** 토글 ON
2. **Kakao Client ID**: 위 1-2의 **REST API 키** 붙여넣기
3. **Kakao Client Secret**: 위 1-2의 **Client Secret 코드** 붙여넣기
4. **Save**

---

## 3. 동작 검증

### 3-1. 라이브 사이트에서

1. https://mindcoach-ai-quest.lovable.app/auth 접속
2. "카카오로 시작하기" 클릭
3. 카카오 로그인 화면 → 본인 카카오 계정 로그인 + 동의항목 동의
4. 자동 리다이렉트: `/auth/callback` → `/onboarding`
5. Supabase Dashboard → **Authentication → Users**에서 새 사용자 행 확인
6. `profiles` 테이블에 같은 user_id 행 자동 생성됐는지 확인

### 3-2. 분석 이벤트 확인

`analytics_events` 테이블에서 `event_name = 'signup_attempt'` + `properties->>'method' = 'kakao'` 행 발화 확인.

---

## 4. 흔한 오류 + 대응

| 증상 | 원인 | 해결 |
|---|---|---|
| "Invalid redirect URI" 카카오 에러 | Kakao Developers의 Redirect URI 미등록 | 1-3 다시 확인 — Supabase callback URL 정확히 입력 |
| 카카오 로그인 후 빈 화면 | Supabase URL Configuration의 Redirect URLs에 없음 | 2-2 다시 확인 |
| 사용자 행은 생기는데 `profiles` 비어있음 | `handle_new_user()` 트리거 미설치 | Phase 1 마이그레이션 적용 여부 확인 |
| 인증 후 무한 로딩 | `/auth/callback` 라우터 등록 안 됨 | `src/App.tsx`의 라우트에 `<Route path="/auth/callback" element={<AuthCallbackPage />} />` 확인 |
| 동의 화면 안 뜨고 바로 로그인 | 정상 (이미 동의한 사용자) | 카카오 → 연결된 서비스 관리에서 마이치 연결 해제 후 재시도 |

---

## 5. 운영 체크리스트

설정 완료 후 다음 모두 ✅ 되어야 운영 가능:

- [ ] Kakao Developers 앱 생성 + REST API 키/Client Secret 발급
- [ ] 카카오 로그인 활성화 + Redirect URI 등록
- [ ] 동의항목 (닉네임 필수, 이메일 선택)
- [ ] Web 플랫폼 도메인 등록
- [ ] Supabase Site URL + Redirect URLs 등록
- [ ] Supabase Kakao Provider 활성화 + 키 입력
- [ ] 라이브 사이트에서 카카오 로그인 → /onboarding 도달
- [ ] `auth.users` + `profiles` 행 자동 생성 확인
- [ ] `analytics_events`에 `signup_attempt` 발화 확인

---

## 6. 다음 단계 (선택 폴리시)

코드 동작 후 추가로 카카오 디자인 가이드 준수 폴리시:
- 카카오 공식 심볼 SVG 추가 (현재 텍스트만)
- 가이드: https://developers.kakao.com/docs/latest/ko/getting-started/design-guide

Lovable에 위임 가능 — 별도 프롬프트 작성 필요 시 요청.
