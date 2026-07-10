# `/tests` 통합 페이지 디자인 (심리검사 + 가격 일원화)

**날짜**: 2026-07-10
**작업 브랜치**: `vercel-migration`
**스코프**: `/tests`와 `/pricing` 통합 + 반응형 폴리시 (해당 페이지만)

## 배경

- 현재 `/tests`(검사 목록)와 `/pricing`(가격) 두 페이지가 별도로 존재
- 통합검사 배너·카테고리 필터·무료 뱃지 로직이 두 페이지에 중복
- 무료 검사 4종(INT, E-3, A-2, D-1)이 `PricingPage`에 하드코딩, 데이터 소스가 갈라짐
- 모바일/PC UI에서 텍스트 배열/뱃지 겹침 이슈

## 목표

1. `/tests` 단일 페이지로 통합 (`/pricing`은 리다이렉트)
2. 무료 검사를 시각적으로 명확하게 분류 (섹션 분리 + 필터 탭 "무료" + 카드 뱃지)
3. 모바일/PC 반응형 카드 그리드 개선, 뱃지 겹침 해결
4. 데이터 소스 단일화 (DB `tests` 테이블 기준)

## 페이지 구조

```
┌ 헤더 ────────────────────────────────────
│ h1: 심리검사
│ p: 무료 통합검사부터 시작해서 나에게 필요한 검사를 찾아보세요
│
├ 🎁 지금 무료로 시작해보세요 ──────────────
│ [통합검사 배너 — 전폭 primary 그라디언트 카드]
│ [무료 3종 카드 그리드]
│
├ 전체 검사 둘러보기 ────────────────────
│ [전체][🎁 무료][A][B][C][D][E]  ← 필터 탭
│ [반응형 그리드: 무료+유료 혼합]
│
├ 멤버십 ──────────────────────────────
│ [Pro 카드 — "곧 출시"]
└──────────────────────────────────────
```

## 카드 상태별 CTA

| 상태 | 우측 상단 뱃지 | 하단 CTA |
|---|---|---|
| 무료 · 미응시 | 🎁 무료 (초록 계열) | `무료로 응시하기 →` |
| 유료 · 미구매 | ₩2,900 (회색) | `구매하기` |
| 유료 · 구매완료 | ✓ D-{N} (primary) | `검사 시작` |
| 준비중 | 준비중 (outline) | 비활성 |
| 통합검사 (무료) | 🎁 무료 · 먼저 시작 (배너 전체) | `무료로 응시하기 →` |

### 카드 내부 레이아웃

```
┌─────────────────────────┐
│ [A]           [상태 뱃지] │
│ 🎯                       │
│ 시험불안 증후군 검사      │
│ E: 시험·집중력            │
│ ⋯ 설명 2줄 clamp ⋯       │
│ 📋 20문항 · ⏱ 8분        │
│ [CTA 버튼 — full width]  │
└─────────────────────────┘
```

- 우측 상단 뱃지 **하나만** (상태 뱃지가 카테고리·가격·무료·구매 상태 모두 포함)
- 좌측 상단 카테고리(A~E)는 얇은 outline 뱃지
- `flex-col` + CTA `mt-auto`로 CTA 하단 정렬
- min-height 통일해서 그리드 흔들림 방지

## 반응형 그리드

| Breakpoint | 카드 컬럼 |
|---|---|
| < 640px (mobile) | 1 column |
| 640~1024px (tablet) | 2 columns |
| ≥ 1024px (desktop) | 3 columns |

통합검사 배너는 항상 `col-span-full` 전폭.

## 데이터 소스

- **진짜 소스**: DB `tests` 테이블
  - 필드 사용: `is_free`, `is_integrated`, `is_coming_soon`, `is_recommended`
- **유료 가격 lookup**: `SINGLE_TEST_DISPLAY` (catalog-display.ts) — productId로 amount 조회
- **owned 상태**: `useUserTestAccess()` hook
- 무료 3종 하드코딩 **제거** (DB `is_free = true`로 자동 표시)

### DB 사전 조건

`tests` 테이블에 무료 검사가 `is_free = true`로 저장돼 있어야 함.
구현 시 확인 후 필요하면 SQL 마이그레이션 추가.

## 라우팅 정리

| 파일 | 변경 |
|---|---|
| `src/App.tsx` | `/pricing` route → `<Navigate to="/tests" replace />` |
| `src/pages/PricingPage.tsx` | **삭제** |
| `src/pages/TestsPage.tsx` | 통합 페이지로 확장 |
| `src/components/navigation/DesktopSidebar.tsx` | "가격" 메뉴 항목 제거 |
| `src/components/payment/TestPaywall.tsx` | `navigate('/pricing')` → `navigate('/tests')` |

## 스코프 밖 (별도 세션)

- Dashboard/Coaching/Emotion/History/Profile 반응형 QA
- Results/Onboarding/Auth 반응형 QA
- Pro 멤버십 실제 결제/구독 로직 (현재 "곧 출시" 유지)
