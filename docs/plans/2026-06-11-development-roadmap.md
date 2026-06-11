# 마이치 개발 로드맵 (2026-06-11 기준, 2026-06-12 P1↔P2 스왑)

**작성 목적:** 마이치 정식 출범 이후 남은 미해결 작업을 우선순위·책임 주체·병행 가능성으로 정리.

**핵심 원칙:**
- **Claude 코드**: 로컬에서 코드 수정 → GitHub push → Lovable sync. revert 사고 방지를 위해 Lovable이 같은 파일을 동시에 수정하지 않도록 작업 분리.
- **Lovable 프롬프트**: 시각 폴리시, 자산 생성(favicon/OG/캐릭터 카드), 통합 QA에 한정.
- **사용자 수동**: 외부 서비스 가입/설정(도메인, Toss, 카카오 Developers, Supabase Dashboard) + 김민수 발주.

**P1↔P2 스왑 사유 (2026-06-12):** 캐릭터 자산은 김민수 발주 + 96장 생성 + 업로드까지 며칠~1주 외부 대기. 카카오/Toss/도메인/사업자등록도 외부 대기 작업이지만 사용자가 신청 절차만 시작하면 그 사이 시간이 비기 때문에, **캐릭터를 먼저 풀어 retention 코어 기능을 시장에 노출**하고 결제/카카오는 외부 대기 흐름으로 병행 진행.

---

## 0. 현황 스냅샷

### 완료
- ✅ Phase 1~5 (인증, 통합검사, 결과, AI 챗, Mock 결제)
- ✅ Phase 7-1~7-7 (캐릭터 시스템 코드 + 트렌드 + 분석 SQL)
- ✅ 리브랜드 (마인드코치 → 마이치) + 로고 3번 시안 (커밋 `e9c2f33`, push 완료)
- ✅ 분석 인프라 (9개 이벤트 와이어링)

### 진행 중
- 🟡 Lovable sync 트리거 + 01 프롬프트 실행 (사용자)
- 🟡 캐릭터 자산 96장 + 4 카드 (김민수, Gemini Pro)

### 보류 / 외부 의존
- ⏸ 도메인 발급 (mych.ai / mych.co.kr 후보 검토 중)
- ⏸ 사업자등록 (Toss 가입 선행 조건)
- ⏸ Toss Payments 라이브 키
- ⏸ 카카오 Developers 앱 등록

---

## 1. 우선순위 매트릭스 (2026-06-12 스왑 반영)

| Pri | 작업 | 책임 주체 | 선행 조건 | 비고 |
|-----|------|-----------|-----------|------|
| **P0-1** | Lovable sync + 01 프롬프트 | 사용자 (Lovable AI) | GitHub `e9c2f33` push 완료 ✅ | favicon/OG 포함 |
| **P0-2** | QA 가이드 체크리스트 통과 | 사용자 | P0-1 완료 | docs/qa-guide-rebrand.md |
| **P1-1** | 캐릭터 자산 96장 + 4 카드 | 사용자 (김민수 발주) | — | Gemini Pro, ~$11 |
| **P1-2** | Supabase Storage 업로드 | 사용자 (또는 Claude 스크립트) | P1-1 완료 | `character-assets` 버킷 |
| **P1-3** | 캐릭터 마이그레이션 push | Claude | — | 2026060912* 2종 |
| **P1-4** | Lovable 02 프롬프트 (통합 QA) | 사용자 (Lovable AI) | P1-1, P1-2, P1-3 | 자산 + 흐름 + 회귀 |
| **P1-5** | Phase 7-8 이벤트 실측 검증 | Claude SQL 분석 | analytics 7일 수집 | character_* 5종 |
| **P2-1** | 카카오 OAuth (web) | Claude 코드 + 사용자 콘솔 | Kakao Developers 앱 등록 | Supabase Auth provider |
| **P2-2** | 도메인 발급 + DNS | 사용자 | 도메인명 확정 | mych.ai? mych.co.kr? |
| **P2-3** | 사업자등록 | 사용자 | — | Toss 가입의 선행 |
| **P2-4** | Toss Payments 가입 + 라이브 키 | 사용자 | P2-2, P2-3 | 도메인 검증 필요 |
| **P2-5** | Toss 결제 연동 (Mock → 실제) | Claude 코드 | P2-4 | 환경분기 + verify-payment |
| **P2-6** | 무료 4종 funnel 검증 | Claude SQL 분석 | analytics 1주 수집 | INT+E-3+A-2+D-1 |
| **P3-1** | Lovable 독립 (Vercel 이전) | Claude + 사용자 | P0~P2 안정화 | 모바일 앱의 전제 |
| **P3-2** | Capacitor Android 앱 | Claude + 사용자 | P3-1 완료 | iOS는 v1.1+ |
| **P3-3** | B2B 학원 대시보드 wedge | Claude + 김종환쌤 | analytics 데이터 + 영업 | 학원 납품 wedge |
| **P3-4** | 추천 알고리즘 가중치 튜닝 | Claude | P1-5 데이터 | 10영역 가중치 |

---

## 2. P0 — 이번 주 마무리 (마이치 정식 출범)

### P0-1. Lovable sync + 리브랜드 QA + favicon/OG

**책임:** 사용자 (Lovable workspace에서 직접 실행)

**스텝:**
1. Lovable workspace 로그인 (`ricky7@yonsei.ac.kr` — 연세대 메일)
2. mindcoach-ai-quest 프로젝트 → GitHub Integration → **Pull from GitHub**
3. 빌드 로그에서 `e9c2f33` 커밋 확인
4. `docs/lovable-prompts/01-rebrand-qa-and-polish.md` 전체 복사
5. Lovable AI 채팅창에 붙여넣기
6. 결과 보고 받고 favicon/OG 생성 확인

**산출물:** 라이브 사이트에 마이치 + 새 로고 + favicon + OG 반영.

### P0-2. QA 가이드 체크리스트

**책임:** 사용자 (실사용 검증)

**산출물:** `docs/qa-guide-rebrand.md` 13개 텍스트 + 5개 시각 + 3개 보존 + 5개 회귀 = 26항목 통과.

---

## 3. P1 — 캐릭터 마스코트 출시 (retention 코어)

캐릭터를 먼저 풀어 retention 코어 기능을 시장에 노출. P1-1~P1-2가 외부 대기 동안 P2 트랙(카카오/Toss/도메인) 외부 신청을 병행.

### P1-1. 자산 96장 + 4 카드 생성

**책임:** 사용자 (김민수 발주)

**스펙:**
- 4 breed × 6 emotion × 4 trend = 96장 (.webp, 정사각, 투명 배경)
- 4 카드 (선택 모달용)
- Gemini Pro (Gemini 2.5 Flash Image) 활용
- 프롬프트 가이드: `docs/character-assets-prompts.md`

**예상 비용:** ~$11

**소유권 주의:** 캐릭터 IP는 신현우 단독 재산. 발주 계약서에 work-for-hire 명시.

### P1-2. Supabase Storage 업로드

**책임:** 사용자 (또는 Claude 업로드 스크립트)

**경로 규칙:** `character-assets/{breed}/{emotion}_{trend}.webp`, 카드는 `character-assets/{breed}/card.webp`.

**선행:** P1-1 + P1-3 (버킷 생성 마이그레이션).

### P1-3. 캐릭터 마이그레이션 push

**Claude 작업:**
- `supabase/migrations/20260609120000_add_character_columns_to_profiles.sql` push
- `supabase/migrations/20260609120100_create_character_assets_bucket.sql` push
- 실행: Supabase MCP `apply_migration` 또는 Supabase CLI

**검증:** profiles 테이블에 `recommended_breed`, `selected_breed`, `character_chosen_at`, `character_changed_count` 컬럼 존재.

**진행 가능 시점:** P1-1 자산과 무관하게 즉시 push 가능 (자산은 컬럼/버킷이 미리 있어야 업로드되니까 오히려 선행).

### P1-4. Lovable 02 프롬프트 (통합 QA)

**책임:** 사용자 (Lovable workspace에서 실행)

**선행:** P1-1, P1-2, P1-3 모두 완료.

**프롬프트:** `docs/lovable-prompts/02-character-system-prep.md` 사용.

### P1-5. Phase 7-8 이벤트 실측 검증

**Claude 작업:**
- `docs/analytics-queries.md`의 character funnel SQL 5종 실행
- character_viewed_home 일일 dedup 정상 동작 확인
- character_recommended → character_recommendation_clicked → character_selected 전환율 측정

**선행:** P1-4 완료 후 1주 데이터.

---

## 4. P2 — 출시 차단 (가입/결제 흐름)

P1과 병행 진행 가능. 외부 신청 절차(P2-2, P2-3, P2-4)는 결과 받기까지 며칠~수주 대기되므로 P1 진행 중에 미리 신청 시작.

### P2-1. 카카오 OAuth (web 회원가입/로그인)

**Claude 코드 작업:**
- `src/pages/AuthPage.tsx`: "카카오로 시작하기" 버튼 + Supabase `signInWithOAuth({ provider: 'kakao' })` 호출
- 콜백 페이지: `src/pages/AuthCallbackPage.tsx` (이미 있으면 확장)
- 디자인: 카카오 노란색(`#FEE500`) + 카카오 심볼 (kakao 브랜드 가이드 준수)

**사용자 수동:**
1. [Kakao Developers](https://developers.kakao.com) 가입 → 애플리케이션 생성 ("마이치")
2. 플랫폼 → Web 도메인 등록: `mindcoach-ai-quest.lovable.app` + (도메인 확정 후) 정식 도메인
3. 카카오 로그인 활성화 → Redirect URI: `https://bnhnaaarsyauppdbrbco.supabase.co/auth/v1/callback`
4. 동의항목: 닉네임(필수), 카카오계정(이메일) (선택)
5. REST API 키 + Client Secret 발급
6. Supabase Dashboard (gmail 계정 `ricky012941@gmail.com`로 로그인) → Authentication → Providers → Kakao 활성화 → 키 입력

**검증:** 회원가입 → 카카오 로그인 → 프로필 자동 생성 → 통합검사 진입.

### P2-2. 도메인 발급

**책임:** 사용자

**스텝:**
1. 후보 검토: `mych.ai` / `mych.co.kr` / `mych.app` / `mind-coach.ai` 등
2. 도메인 등록 (Cloudflare Registrar 또는 Gabia 추천)
3. DNS 설정 보류 (호스팅 결정 후: Lovable 유지 시 Lovable 가이드 따름, Vercel 이전 시 P3-1과 동시)

**산출물:** 정식 도메인 소유.

### P2-3. 사업자등록

**책임:** 사용자

**스텝:** 홈택스 → 개인사업자 등록 (업종: 정보통신업 / 소프트웨어 개발 및 공급업).

**Why:** Toss Payments는 사업자등록증 없이 가입 불가.

### P2-4. Toss Payments 가입 + 라이브 키

**책임:** 사용자

**선행 조건:** P2-2 (도메인 — 검증용), P2-3 (사업자등록).

**스텝:**
1. [Toss Payments](https://toss.im/payments) 가입
2. 사업자 인증 + 정산 계좌 등록
3. 도메인 검증 (정식 도메인 또는 lovable.app)
4. 라이브 클라이언트 키 + 시크릿 키 발급
5. Supabase Edge Function 환경변수에 시크릿 키 저장 (`TOSS_SECRET_KEY`)

### P2-5. Toss 결제 연동 (Mock → 실제)

**Claude 코드 작업:**
- `src/lib/payments/index.ts`: `getPaymentProvider()` 환경분기 추가 (`VITE_PAYMENT_PROVIDER=toss` vs `mock`)
- `src/lib/payments/toss.ts` 신규: Toss Payments JS SDK 통합 (`@tosspayments/payment-sdk`)
- `supabase/functions/verify-payment/index.ts`: Mock stub을 Toss `/v1/payments/confirm` API로 교체 + 멱등성 키
- `supabase/functions/_shared/pricing.ts`: 그대로 유지
- 빌링 키 발급/저장 (정기결제 Pro 구독용)

**검증:** 단품 ₩2,900 결제 → Toss 결제창 → 카드 인증 → DB `payments` 테이블 confirmed.

### P2-6. 무료 4종 funnel 검증

**Claude 작업:**
- `docs/analytics-queries.md`의 funnel SQL 실행
- 가입 → INT → 무료 3종(E-3, A-2, D-1) → 단품 구매 전환율 측정
- 1주 데이터 수집 후 분석

**산출물:** 전환율 보고 + 다음 가설(가격 조정? 무료 검사 변경?).

---

## 5. P3 — 성장 준비

### P3-1. Lovable 독립 (Vercel 이전)

**Why:** Lovable auto-revert 사고 재발 방지 + 모바일 앱의 전제 (Capacitor 빌드 안정성).

**Claude 작업:**
- `vercel.json` 작성 (Vite SPA 라우팅 fallback)
- 환경변수 정리 (Supabase URL, Toss 키, 카카오 키)
- 빌드 명령: `npm run build` / 출력: `dist/`

**사용자 수동:**
1. Vercel 가입 (GitHub 계정 연동)
2. mindcoach-ai-quest import
3. 환경변수 등록
4. P2-2 도메인 연결

**선행:** P0~P2 안정화 후 (출시 차단 작업이 끝나야 안전하게 이전 가능).

### P3-2. Capacitor Android 앱

**Claude 작업:**
- Capacitor 설치 + 설정 (`capacitor.config.ts`)
- Android 빌드 스크립트
- Browser 플러그인으로 카카오 OAuth 처리 (Supabase Auth Kakao 그대로 재사용)

**사용자 수동:**
- Play Console 개발자 계정 ($25 일회성)
- 앱 등재 + 심사

**선행:** P3-1 완료. iOS는 6개월 후(Toss 정기결제 vs IAP 30% 수수료 이슈).

### P3-3. B2B 학원 대시보드 wedge

**Claude 작업:**
- 학원 관리자 대시보드 (`/admin` 또는 `/academy`)
- 학생 명단 + 검사 결과 집계 + 리포트 생성
- 학원 계정 = `profile.role = 'academy_admin'` 분기

**김종환쌤 + 사용자:**
- 영업 진행 (메가스터디 채널 + 김종환쌤 네트워크)
- 학원별 커스터마이징 협의

**선행:** B2C 안정화 + 첫 학원 LOI.

### P3-4. 추천 알고리즘 튜닝

**Claude 작업:**
- P1-5 데이터 기반 가중치 조정
- A/B 테스트 인프라

---

## 6. 책임 분담 한눈에 보기

### Claude (코드)
- P1-3 마이그레이션 push
- P1-5 이벤트 검증 SQL
- P2-1 카카오 OAuth UI/콜백
- P2-5 Toss 결제 연동
- P2-6 SQL 분석
- P3-1 Vercel 설정
- P3-2 Capacitor 설정
- P3-3 학원 대시보드
- P3-4 알고리즘 튜닝

### Lovable 프롬프트
- P0-1 01 리브랜드 QA + favicon/OG
- P1-4 02 캐릭터 통합 QA

### 사용자 수동 (외부 서비스)
- P0-1 Lovable sync 트리거
- P1-1 김민수 자산 발주
- P1-2 Storage 업로드
- P2-1 Kakao Developers 등록 + Supabase Auth 설정
- P2-2 도메인 구매
- P2-3 사업자등록
- P2-4 Toss 가입 + 키 발급
- P3-1 Vercel 가입 + 도메인 연결
- P3-2 Play Console 등재

### 외부 / 협업 의존
- 김민수: P1-1 캐릭터 자산
- 김종환쌤: P3-3 B2B 영업

---

## 7. 병행 가능 vs 순차

```
P0-1 (Lovable sync) ─┬─ P0-2 (QA pass)
                     │
                     │  ┌─ P1-3 (마이그레이션 push, 즉시 가능)
                     │  │
                     ├──┼─ P1-1 (자산 발주) ─ P1-2 (Storage 업로드) ─ P1-4 (Lovable 02 QA) ─ P1-5 (검증)
                     │  │
                     │  └─ (P1 트랙)
                     │
                     │  ┌─ P2-1 (카카오) ──────────────────────────┐
                     │  │                                            │
                     ├──┼─ P2-2 (도메인) ─┐                          │
                     │  │                 ├─ P2-4 (Toss) ─ P2-5 ─ P2-6
                     │  └─ P2-3 (사업자) ─┘                          │
                     │                                                │
                     │     (P2 트랙)                                  │
                     │                                                ▼
                     │                                        P3-1 (Vercel) ─ P3-2 (모바일)
                     │                                                │
                     │                                                ├─ P3-3 (학원)
                     │                                                └─ P3-4 (튜닝)
```

**핵심 병행 그룹:**
- P0 완료 즉시 **P1 트랙 + P2 트랙** 동시 시작 가능
- P1-3 마이그레이션 push는 자산 도착 전이라도 즉시 가능 (P1-1과 독립)
- P2 외부 신청(도메인/사업자/Toss/카카오)은 결과 대기 며칠~수주 — P1 진행 중 미리 시작
- Claude 작업과 Lovable 작업은 같은 시점 다른 파일이면 OK, 같은 파일이면 순차 (revert 사고 방지)

---

## 8. 다음 액션 (지금 바로)

1. **사용자**: P0-1 Lovable sync 트리거 + 01 프롬프트 실행
2. **사용자**: 김민수에게 P1-1 자산 발주 (`docs/character-assets-prompts.md` 전달)
3. **사용자 (병행)**: P2-2 도메인 후보 결정 + 등록, P2-3 사업자등록 시작
4. **사용자 (병행)**: P2-1 Kakao Developers 앱 등록 시작
5. **Claude (대기)**: P0-1 통과 보고 후 → P1-3 마이그레이션 push + P2-1 카카오 UI 코드 시작

---

## 9. 관련 문서

- `docs/qa-guide-rebrand.md` — 리브랜드 QA 체크리스트
- `docs/lovable-prompts/01-rebrand-qa-and-polish.md` — Lovable 01 프롬프트
- `docs/lovable-prompts/02-character-system-prep.md` — Lovable 02 프롬프트
- `docs/plans/2026-06-09-character-mascot-system-design.md` — 캐릭터 디자인
- `docs/plans/2026-06-09-character-mascot-system-implementation.md` — 캐릭터 구현 계획
- `docs/plans/2026-05-08-phase1-auth-cleancut-and-pro-activation.md` — 기존 Phase 1 계획
- `docs/analytics-queries.md` — 분석 SQL 모음
- `docs/character-assets-prompts.md` — 캐릭터 자산 생성 프롬프트 (김민수용)
