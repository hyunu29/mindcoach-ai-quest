# Lovable 프롬프트 01 — 리브랜드 QA + UI 폴리시

**용도:** GitHub push로 반영된 리브랜드(마이치) + 새 로고를 Lovable이 시각 QA하고 잔여 UI 폴리시(favicon, OG 이미지, 시각 미세조정)를 마무리.

**선행 조건:**
- GitHub main 또는 phase1-auth-cleancut에 커밋 `e9c2f33` 이상이 sync 되어 있어야 함
- `public/logo.png` 가 3번 시안으로 교체된 상태

---

## Lovable에 붙여넣을 프롬프트

```
지금 main(또는 phase1-auth-cleancut) 브랜치의 최신 코드를 기준으로 다음 작업을 순차적으로 수행해줘.

## 1. 리브랜드 QA (변경 금지, 확인만)

다음 13개 위치에서 "마인드코치 AI" 또는 "마인드 코치 AI"가 남아있는지 검색해줘.
하나라도 발견되면 "마이치"로 교체. 단 아래 3곳은 절대 건드리지 마:

[보존]
- src/components/landing/ExpertSection.tsx — "마인드코치 | 메가스터디 학습심리 강사" (종환쌤 직함)
- src/data/seed-data.ts 라인 3 — "// © 마인드코치 김종환. All rights reserved." (저작권)
- supabase/functions/chat-coaching/index.ts — "마인드코치 김종환"의 20년 임상 경험 (시스템 프롬프트 안)

[확인 위치]
- index.html (title, meta description, og:*, twitter:*)
- src/pages/AuthPage.tsx
- src/pages/DashboardPage.tsx
- src/pages/CoachingPage.tsx
- src/pages/PricingPage.tsx
- src/components/landing/LandingNav.tsx
- src/components/landing/HeroSection.tsx
- src/components/landing/ProblemSection.tsx
- src/components/landing/LandingFooter.tsx
- src/components/navigation/DesktopSidebar.tsx
- src/components/emotion/EmotionAgentChat.tsx

## 2. favicon 교체

public/logo.png를 favicon으로 변환해서 적용해줘:
- public/favicon.ico (32x32, 16x16 multi-size)
- public/apple-touch-icon.png (180x180)
- index.html의 <link rel="icon"> 갱신
원본 로고 비율을 유지하면서 정사각 캔버스에 중앙 배치, 배경 투명.

## 3. OG 이미지 생성

소셜 공유용 OG 이미지를 만들어줘:
- public/og-image.png (1200x630)
- 좌측: 새 로고 (public/logo.png)
- 우측: "마이치 — 수험생을 위한 AI 심리 코칭" (한국어, 명조 또는 깔끔한 산세리프)
- 배경: 브랜드 그라데이션 (existing tailwind theme의 primary 컬러 활용)
- index.html의 og:image, twitter:image를 새 이미지 경로로 갱신

## 4. 로고 시각 미세조정 (선택)

랜딩 네비/사이드바에서 새 로고가:
- 모바일 해상도(<640px)에서 잘리거나 흐릿하면 sizing 조정
- 스크롤 시 LandingNav 배경 전환(transparent → bg-background/80)에서 가시성 문제 있으면 dark/light variant 처리

문제 없으면 건너뛰어도 됨.

## 5. 결과 보고

작업 끝나면 다음 형식으로 보고:
- [QA] 발견한 잔여 "마인드코치" 인스턴스 갯수 + 교체한 파일 목록
- [favicon] 생성 완료 여부
- [OG] 생성 완료 여부
- [폴리시] 조정한 부분 (있으면)
- [회귀] 빌드/타입체크 통과 여부

❌ 절대 하지 말 것:
- 캐릭터 마스코트 시스템 (src/lib/character/*, useCharacter 등) 건드리기 금지
- ExpertSection.tsx의 종환쌤 직함 변경 금지
- 새 기능 추가 금지 (이번 작업은 리브랜드 정리만)
```

---

## QA 통과 후 다음 단계

1. Lovable이 보고한 결과를 `docs/qa-guide-rebrand.md` 체크리스트에 매핑
2. favicon/OG가 생성됐다면 별도 커밋으로 push
3. phase1-auth-cleancut → main 머지 검토
