# 베타 폴리시 + 마이그레이션 중간 점검 (2026-06-23 ~ 06-27)

> **컨텍스트**: Lovable Cloud → 외부 Supabase(bpkz) + Vercel 마이그레이션 진행 중. 4종 캐릭터 자산은 보류, **시바 단일종**으로 베타 출범. 로고/색상/네비/자산 표시까지 일괄 폴리시.

**작업 브랜치**: `vercel-migration` (origin 대비 5 커밋 앞섬, push 보류)

---

## 1. 마이그레이션 상태 검토 (P0)

Path Y 마이그레이션 결과물 정상 작동 확인:

| 항목 | 상태 |
|------|------|
| `.env` (bpkz Supabase 키) | ✅ 정상 |
| `vercel.json` (SPA fallback rewrites) | ✅ 정상 |
| Supabase 마이그레이션 SQL 25개 | ✅ 파일 존재 (적용 여부는 별도 확인 필요) |
| `src/lib/character/asset-url.ts` STORAGE_BASE | ✅ bpkz 지칭 |
| Lovable 영향 격리 | ✅ Lovable 직접 수정 없는 파일만 작업 |

**보류**: 캐릭터 마이그레이션 2종(`20260609120000_add_character_columns_to_profiles.sql`, `20260609120100_create_character_assets_bucket.sql`)이 bpkz에 적용됐는지 SQL Editor에서 검증 필요.

---

## 2. 브랜딩 — 보라색 통일

### 2-1. 메인 로고 교체 (`66f808c`)
- **원인**: `public/logo.png`가 거의 흰색 → 흰 배경 페이지에서 안 보임
- **조치**: `C:\Users\ricky\Desktop\마인드코치 AI\마이치 로고1.png` (보라색 발바닥) 복사 덮어쓰기
- **자동 반영**: `LandingNav`, `DesktopSidebar` 둘 다 `public/logo.png` import 사용
- **용어 메모**: 흰색 로고 = **화이트 변형 / 네거티브 / 리버스 / 녹아웃** 로고

### 2-2. 파비콘 풀세트 (`986616b`)
보라색 `logo.png`에서 sharp로 일괄 리사이즈:
- `favicon.ico` (16+32 멀티해상도, `png-to-ico`)
- `favicon-16x16.png`, `favicon-32x32.png`
- `apple-touch-icon.png` (180×180)
- `android-chrome-192x192.png`, `512x512.png`
- `index.html`에 PNG link 추가 (모던 브라우저 PNG 우선, 구형 .ico fallback)
- 재생성 스크립트: `scripts/generate-favicons.mjs`

---

## 3. 시바견 이미지 표시 (`66f808c`)

### 문제
- DashboardPage Hero에서 `시바이누 - neutral` alt 텍스트와 깨진 이미지 아이콘 노출
- 원인: Supabase Storage `character-assets` 버킷이 비어 있음. 자산 96장 + 카드 4장 업로드 안 됨

### 해결책 — 베타 토글
시바 단일종 베타 전략에 맞춰 로컬 정적 자산으로 임시 라우팅:

**환경변수 토글** (`src/lib/character/asset-url.ts`):
```ts
const USE_LOCAL = import.meta.env.VITE_USE_LOCAL_CHARACTER_ASSETS === 'true';
const BASE = USE_LOCAL ? '/character-assets-local' : REMOTE_BASE;
```
- `.env`, `.env.example` 둘 다 `VITE_USE_LOCAL_CHARACTER_ASSETS="true"` 추가
- 추후 Supabase Storage 업로드 + 4종 확장 시 토글만 끄면 원격 전환

### 자산 처리
1. **WebP 변환** (`scripts/convert-character-assets-to-webp.mjs` — sharp 기반)
   - 시바 24장 + 다른 3종 calm_stable 1장씩 = 27장 PNG → WebP
   - **135.49MB → 1.57MB (98.8% 압축)**
2. **gitignore 조정**: `public/character-assets-local/**/*.png`만 제외, WebP는 git 포함
3. **파일명 정정**: `russian_bluecalm_stable.png` 등 prefix 오타 → `calm_stable.png`

### 테스트
- `src/test/character-asset-url.test.ts` 3 cases pass

---

## 4. UI 폴리시 — 랜딩 + 캐릭터

### 4-1. CharacterAvatar 둥근 모서리 (`706b518`)
- `<img>` 자체에 `rounded-3xl` 추가 → 시바견 카드의 각진 박스 톤 완화

### 4-2. LandingNav (`706b518` + `71e347a`)
- **상시 반투명 흰색**: 기존 scroll 분기 제거, `bg-white/70 backdrop-blur-md` 상시 적용
- **상시 그림자**: `shadow-sm` 디폴트, 스크롤 시 `shadow-md`로 강조 (히어로 위 분리감)
- **링크 색**: `text-white/90` → `text-foreground/80` (흰 배경 가독성)
- **링크 hover/active**: `<button>` → `<Button variant="ghost" size="sm">` 교체 → 로그인 버튼과 동일한 ghost 채움 패턴

### 4-3. ExpertSection 간략화 (`71e347a`)
- **사유**: 김종환 선생님이 전면 노출 원치 않으심
- **변경**: 인물 사진(`kim-jonghwan.png`) + 이름 + 2단락 bio → **"수험생 심리 전문가 자문 기반"** 한 문단으로 축약
- 책 제목(『공부에 지친 학생들을 위한 심리 수업』)만 강조 텍스트로 남김
- 객관 stats 3개(32가지/26종/9.6점) 유지
- `kim-jonghwan.png` 파일은 보존 (추후 사용 가능성)

---

## 5. 캐릭터 자산 톤 가이드 재작성 (`66f808c`)

`docs/character-assets-prompts.md` 풀세트 재작성:
- **방향 F 확정**: 시나모롤·몰랑(Molang) 풍 일본 카와이 마스코트
- 디자인 톤 7원칙 (2.5등신, 점 두 개 눈, 분홍 볼터치 등)
- 절대 금지 키워드 (사진풍/수채화/펠트/AI 평균치)
- 4종 베이스 디자인 (`shiba`, `poodle`, `korat`, `russian_blue`)
- 6 표정 × 4 트렌드 = 24장 매트릭스
- Day 1~6 일정 + 풀 프롬프트 4종 (calm_stable 키 이미지)
- WebP 변환 + Supabase 업로드 명령

> **현재 상태**: 베타 보류. 시바 단일종으로 시장 검증 후 4종 확장 시 본 가이드 활용.

---

## 6. 운영 — reddragon012@naver.com 무한 크레딧

`docs/runbooks/unlimited-credits-reddragon012.sql` 작성 (`986616b`):
- BEFORE 확인 → INSERT (1,000,000,000 credits, period_end=2099) → AFTER 검증
- `source='admin_unlimited'`로 식별, 롤백 SQL 포함
- **실행 위치**: Supabase Dashboard → SQL Editor (bpkz)
- **실행 미완**: MCP는 다른 프로젝트(cjnflxelatrsoriwifom) 연결, psql 미설치 → 사용자가 Dashboard에서 직접 실행 필요

---

## 7. 커밋 히스토리

| Hash | 메시지 |
|------|--------|
| `986616b` | ui(branding): 보라색 파비콘 세트 + 무한 크레딧 SQL runbook |
| `71e347a` | ui(landing): 상시 그림자 + nav hover 채움 + 전문가 섹션 간략화 |
| `706b518` | ui(beta): 캐릭터 아바타 둥근 모서리 + 랜딩 nav 상시 반투명 흰배경 |
| `66f808c` | feat(beta): 보라 로고 + 시바 베타 자산 표시 + 마이그레이션 최종 점검 |
| `37fa679` | (이전) seed: add 32 non-INT tests |
| `b72a431` | (이전) fix(character): point STORAGE_BASE to new Supabase project (bpkz) |

---

## 8. 보류 / 후속 액션

### 즉시 (사용자 액션 필요)
1. **GitHub push** — `gh auth login`으로 `hyunu29` 계정 전환 후 `git push origin vercel-migration`
   - 현재 gh CLI는 `hhuuu29`로 로그인 (repo collaborator 아님 → 403)
2. **무한 크레딧 SQL 실행** — Supabase Dashboard SQL Editor에서 `docs/runbooks/unlimited-credits-reddragon012.sql` 실행

### 다음 (Claude 작업 가능)
3. 캐릭터 마이그레이션 적용 여부 검증 (P1-3)
4. P2-1 카카오 OAuth 코드 작업
5. Lovable → Vercel 이전 최종 점검 (P3-1)

### 추후 (자산 확정 후)
6. Supabase Storage `character-assets` 버킷에 96장 + 4 카드 업로드
7. `.env`의 `VITE_USE_LOCAL_CHARACTER_ASSETS` 토글 OFF로 전환
8. `.gitignore`의 캐릭터 자산 폴더 다시 ignore 처리
