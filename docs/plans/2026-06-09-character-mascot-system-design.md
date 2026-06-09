# 캐릭터 마스코트 시스템 — 디자인 문서

**작성일**: 2026-06-09
**상태**: 디자인 승인 완료, 구현 계획 대기
**관련 빌드플랜**: Step 7 (명상의 소리/캐릭터 자산) 확장
**선행 회의**: 백마로 3자 미팅 2026-05-08 (캐릭터 시스템 컨셉 도출)

---

## 0. 요약 (TL;DR)

수험생 페르소나 4유형에 매칭되는 강아지·고양이 캐릭터 4종을 홈 화면 마스코트로 도입.

- **트리거 방식**: 하이브리드 — 표정(오늘 감정) × 포즈/배경(7일 트렌드)
- **종 라인업**: 1차 4종 (시바이누·푸들·코리안숏헤어·러시안블루) → 2차 +4종 (페이즈드 출시)
- **선택 방식**: 통합검사 결과 기반 추천 + 사용자 자유 선택 (마이페이지에서 변경 가능)
- **매칭 매트릭스**: 수험생 4유형 (의욕폭주·완벽주의·마이페이스·번아웃취약)
- **포즈 4단계**: 7일 트렌드 방향성 (rising / stable / declining / crashing)
- **자산 총량**: 96장 (4종 × 6표정 × 4포즈) + 대표 카드 4장 = **100장**
- **이미지 생성**: Gemini Nano Banana (Gemini 2.5 Flash Image), 예상 비용 약 ₩15,000
- **구현 시점**: Step 7 진입, Step 6(Pro 구독)과 병렬, **총 ~9일 작업** (자산 검수 포함)

---

## 1. 4종 캐릭터 페르소나

수험생 4유형과 32가지 증후군 가이드 기반 매핑.

| 캐릭터 | 페르소나 | 핵심 특성 | 통합검사 매칭 신호 | 주 위험 증후군 |
|---|---|---|---|---|
| **시바이누** | **의욕폭주형** | 목표 달성 욕구↑, 행동력↑, 정서 불안정성↑ | 학업동기·자기효능감 高 + 정서조절·스트레스내성 低 | 번아웃, 강박, 분노 누적 |
| **푸들** | **완벽주의형** | 디테일 집착, 평가 민감, 사회적 비교↑ | 완벽주의·평가민감성 高 + 시험불안 高 | 시험불안, SNS 비교, 회피 |
| **코리안숏헤어** | **마이페이스형** | 독립성↑, 외부 자극 둔감, 동기 변동성 | 자기주도성 中~高 + 외부동기·사회성 低 | 미루기, 무동기, 고립 |
| **러시안블루** | **번아웃취약형** | 감수성↑, 에너지 변동 큼, 회복 느림 | 신체피로·정서소진 高 + 회복탄력성 低 | 우울, 만성 피로, 무력감 |

### 페르소나 카피 (앱 내 노출용)

- 시바: "끝까지 달려가는 너 — 가끔은 숨도 골라야 해"
- 푸들: "완벽한 너를 추구하는 너 — 어제보다 한 발이면 충분해"
- 코숏: "내 길은 내가 가는 너 — 곁에서 조용히 응원할게"
- 러시안블루: "깊게 느끼는 너 — 잠시 멈춰도 괜찮아"

### 자유 선택 시 충돌 처리

추천과 다른 캐릭터를 선택해도 그대로 존중. DB에 `recommended_breed`와 `selected_breed` 둘 다 저장(추후 분석용).

---

## 2. 표정 × 포즈 매트릭스

### 축 정의

- **표정 (오늘 감정)**: `happy / calm / neutral / sad / angry / anxious` — `src/lib/emotion-agent-types.ts`의 `PrimaryEmotion`과 일치
- **포즈/배경 (7일 트렌드)**: 최근 3일 평균 vs 이전 3일 평균 비교
  - `rising` — +0.7 이상
  - `stable` — ±0.7 이내
  - `declining` — -0.7 이하
  - `crashing` — -1.5 이하

### 포즈/배경 컨벤션 (4종 공통)

| 트렌드 | 포즈 키워드 | 배경 키워드 | 소품 |
|---|---|---|---|
| `rising` | 점프/달리기/팔 벌림 | 새벽빛, 떠오르는 해, 가벼운 바람 | 종이비행기, 풍선 |
| `stable` | 앉아 있음/누워 있음/책 읽기 | 따뜻한 햇살, 잔잔한 실내 | 책, 머그컵 |
| `declining` | 어깨 처짐/턱 괴기 | 흐린 하늘, 늦은 오후 | 담요, 식어가는 차 |
| `crashing` | 웅크림/이불 속 | 밤, 비 오는 창 | 베개, 어두운 조명 |

### 표정 컨벤션 (포즈 위에 얹는 얼굴 디테일)

| Emotion | 눈 | 입 | 귀(강아지)/수염(고양이) |
|---|---|---|---|
| `happy` | 반달 눈, 빛남 | 활짝 웃음, 혀 살짝 | 쫑긋 / 쭉 뻗음 |
| `calm` | 부드럽게 감김 | 살짝 미소 | 자연스럽게 늘어짐 |
| `neutral` | 동그란 평상시 | 일자 | 평이 |
| `sad` | 처진 눈꼬리, 물기 | 입꼬리 내림 | 축 처짐 |
| `angry` | 찡그림, 눈썹 V자 | 굳게 다묾, 송곳니 살짝 | 뒤로 젖힘 |
| `anxious` | 동공 작아짐, 두리번 | 살짝 벌림, 침 삼킴 | 떨림, 옆으로 눕힘 |

### 자산 총량 (1차 출시)

- 4종 × 6표정 × 4트렌드 = **96장**
- 신규/트래킹 7일 미만/캐릭터 미선택 fallback: `neutral × stable` 1장
- 마이페이지 선택 카드용 대표 포즈 (`calm × stable`) 종당 1장 × 4종 = 4장
- **총 100장**

---

## 3. 통합검사 → 캐릭터 추천 알고리즘

### 10영역 (`src/data/integrated-test.ts` 기준)

`emotional_instability, test_stage_anxiety, learning_obsession, routine_time_control, cognitive_focus, learning_avoidance, somatic_pain, energy_burnout, self_relationships, sleep_routine` — 각 0~25점

### 4종 친화 점수 계산

```
시바 친화도        = learning_obsession × 0.4 + emotional_instability × 0.3 + energy_burnout × 0.3
푸들 친화도        = learning_obsession × 0.4 + test_stage_anxiety × 0.4 + self_relationships × 0.2
코숏 친화도        = learning_avoidance × 0.4 + routine_time_control × 0.3 + cognitive_focus × 0.3
러시안블루 친화도  = energy_burnout × 0.35 + somatic_pain × 0.25 + sleep_routine × 0.2 + cognitive_focus × 0.2
```

각 캐릭터별 친화 점수 0~25점 정규화.

### 추천 결정 로직

1. 4종 친화 점수 계산 → 내림차순 정렬
2. 1위 점수 < 8점 → "데이터 부족" 분기, 자유 선택만 제공
3. 1위 - 2위 < 2점 → 동률 처리, 1위·2위 둘 다 추천 카드로 노출
4. 그 외 → 1위 단일 추천 + 나머지 3종은 "다른 캐릭터도 보기"로 펼침

### Supabase 스키마 확장

```sql
-- profiles 테이블 컬럼 추가
ALTER TABLE profiles
  ADD COLUMN recommended_breed text,        -- 통합검사 직후 알고리즘 결과
  ADD COLUMN selected_breed text,            -- 사용자 최종 선택
  ADD COLUMN character_chosen_at timestamptz,
  ADD COLUMN character_changed_count int DEFAULT 0;

-- 허용 값 체크 제약 (1차 4종 + 2차 확장 대비)
ALTER TABLE profiles
  ADD CONSTRAINT breed_recommended_check
  CHECK (recommended_breed IS NULL OR recommended_breed IN ('shiba', 'poodle', 'korat', 'russian_blue'));

ALTER TABLE profiles
  ADD CONSTRAINT breed_selected_check
  CHECK (selected_breed IS NULL OR selected_breed IN ('shiba', 'poodle', 'korat', 'russian_blue'));
```

### 변경 정책

- **쿨다운 없음**. 변경 횟수만 `character_changed_count`로 로그 (분석용)
- 자기 탐색 과정으로 보고 패널티 없음

### 미응시자 처리

통합검사 미응시 → 4종 카드 자유 선택만 노출. "통합검사를 받으면 더 잘 맞는 캐릭터를 추천드려요" 배너로 통합검사 유도.

---

## 4. UI 배치

### 4-1. 홈 (DashboardPage) — 캐릭터 Hero 카드

현재 최상단 "오늘 감정 선택" 위치를 **캐릭터 Hero**로 교체:

```
┌─────────────────────────────────────┐
│   [캐릭터 이미지 300×300]              │
│                                      │
│   "오늘은 어떤 하루였어?"              │
│   {닉네임}님, {페르소나 한 줄 카피}    │
│                                      │
│   [😊][😐][😢][😤][😰]   ← 감정 선택 │
│                                      │
│   📈 이번 주 트렌드: 회복 중 🌱       │
└─────────────────────────────────────┘
```

- 캐릭터 이미지: 당일 emotion + 7일 트렌드 조합. 감정 선택 시 즉시 표정 변화 (낙관적 UX)
- 트렌드 한 줄 카피:
  - `rising` = "회복 중 🌱"
  - `stable` = "안정 ☀️"
  - `declining` = "좀 지치고 있어 🌫️"
  - `crashing` = "많이 힘들어 보여 🌧️"
- 캐릭터 미선택 사용자 → "마스코트를 만나보세요" CTA 카드로 대체

### 4-2. 마이페이지 (ProfilePage) — 캐릭터 변경

```
[현재 마스코트: 푸들 — 완벽주의형]
[변경하기] 버튼

→ 모달:
   [4종 카드 그리드]
   - 추천 캐릭터에 "✨ 당신과 잘 맞아요" 배지
   - 각 카드: 대표 포즈 이미지 + 페르소나 한 줄
   - 선택 시 확인 다이얼로그 (변경 N회째)
```

### 4-3. 통합검사 결과 (ResultsPage) — 추천 노출

기존 전문검사 추천 카드 **위에** 캐릭터 추천 섹션 신규 추가:

```
┌────────────────────────────────────┐
│  💫 당신과 가장 잘 맞는 마스코트     │
│                                     │
│  [푸들 대표 포즈 이미지]              │
│  "완벽주의형"                         │
│  완벽한 너를 추구하는 너 —            │
│  어제보다 한 발이면 충분해             │
│                                     │
│  [이 캐릭터로 선택]  [다른 캐릭터 보기]│
└────────────────────────────────────┘
```

- 친화 점수 1-2위 동률이면 카드 2개 가로 스크롤
- 데이터 부족(<8점)이면 섹션 자체 미노출

### 4-4. 온보딩 — 추가 단계 없음

회원가입 직후 별도 캐릭터 선택 단계 추가하지 않음. 신규 유저는 홈에서 "마스코트를 만나보세요" CTA → 통합검사 유도. (회원가입 플로우 가벼움 유지)

### 4-5. 재사용 컴포넌트 — CharacterAvatar

```tsx
<CharacterAvatar
  breed="poodle"
  emotion="anxious"
  trend="declining"
  size="hero" | "card" | "mini"
/>
// 내부: /character-assets/{breed}/{emotion}_{trend}.webp 로드
// fallback: neutral_stable.webp
```

---

## 5. Gemini Nano Banana 프롬프트 템플릿

### 5-1. 일관성 전략

Nano Banana(Gemini 2.5 Flash Image)는 reference image + 동일 seed로 같은 캐릭터 유지가 가장 강점. 워크플로는 **종별 키 이미지 1장 먼저 확정 → 그걸 reference로 표정·포즈 23장 생성**.

### 5-2. 공통 베이스 프롬프트 (4종 모두 동일)

```
A cute, kawaii-style 2D illustration of a {breed} character,
single character only, full body or upper body,
soft pastel color palette (mint, peach, cream, lavender),
flat shading with subtle gradient, gentle outline,
warm and supportive atmosphere,
designed for a mental health app for Korean students,
centered composition on white or very light background,
high quality, consistent character design,
art style: blend of Sanrio cuteness + modern Korean illustration (e.g. Esther Bunny vibe)
```

**Negative prompt (공통)**:

```
realistic, photographic, scary, dark, gore, weapons, multiple characters,
text, watermark, signature, low quality, blurry, distorted anatomy,
extra limbs, anime-NSFW, hyperrealistic, threatening expression
```

### 5-3. 종별 베이스 프롬프트

**시바이누 (의욕폭주형)**:

```
{공통 베이스} +
A small shiba inu with classic orange-red fur and cream chest,
pointy upright ears, curly tail, alert and energetic eyes,
sturdy and athletic body, slight smile showing tiny pink tongue
```

**푸들 (완벽주의형)**:

```
{공통 베이스} +
A toy poodle with soft cream-white curly fur,
fluffy rounded head, gentle drooping ears with curls,
big shiny round eyes with long eyelashes, neat groomed appearance,
tiny black nose, elegant posture
```

**코리안숏헤어 (마이페이스형)**:

```
{공통 베이스} +
A korean shorthair cat with brown tabby pattern (classic M mark on forehead),
medium-sized triangular ears, slender body,
calm half-closed almond eyes, long whiskers,
relaxed and independent posture
```

**러시안블루 (번아웃취약형)**:

```
{공통 베이스} +
A russian blue cat with soft bluish-grey short fur,
large pointed ears, slender graceful body,
gentle emerald-green eyes with melancholic depth,
quiet and sensitive expression, delicate paws
```

### 5-4. 표정 모디파이어 (베이스에 append)

| Emotion | Modifier |
|---|---|
| `happy` | `bright sparkly eyes (crescent shape), wide joyful smile with tongue slightly out, ears perked up / whiskers spread wide, glowing aura` |
| `calm` | `softly closed eyes, gentle small smile, peaceful relaxed face, ears naturally down / whiskers relaxed` |
| `neutral` | `round normal eyes, straight neutral mouth, plain expression, ears in resting position` |
| `sad` | `downturned droopy eyes with single tear drop, frowning mouth corners, ears flattened down / whiskers drooping` |
| `angry` | `furrowed brow with V-shaped eyebrows, tight closed mouth showing tiny fang, ears pulled back, slight puff cheeks` |
| `anxious` | `wide nervous eyes with small pupils looking sideways, slightly open mouth, ears trembling / whiskers twitching, subtle sweat drop` |

### 5-5. 트렌드(포즈+배경) 모디파이어

| Trend | Modifier |
|---|---|
| `rising` | `pose: jumping or running with arms/paws raised in joy, background: dawn light with rising sun, gentle breeze, paper airplane or balloon floating nearby` |
| `stable` | `pose: sitting cozily or lying down reading a small book, background: warm afternoon sunlight through window, cozy indoor scene, mug of tea nearby` |
| `declining` | `pose: shoulders slumped, chin resting on paws, looking thoughtful, background: cloudy late afternoon sky, soft melancholy tone, cooling tea cup` |
| `crashing` | `pose: curled up small under a soft blanket or pillow fort, background: nighttime with rain on window, dim warm lamp light, comforting darkness (NOT scary)` |

### 5-6. 최종 조립 프롬프트 예시 (푸들 × anxious × declining)

```
A cute, kawaii-style 2D illustration of a toy poodle character with
soft cream-white curly fur, fluffy rounded head, gentle drooping ears with curls,
big shiny round eyes with long eyelashes, neat groomed appearance, tiny black nose.
Expression: wide nervous eyes with small pupils looking sideways,
slightly open mouth, ears trembling, subtle sweat drop.
Pose: shoulders slumped, chin resting on paws, looking thoughtful.
Background: cloudy late afternoon sky, soft melancholy tone, cooling tea cup nearby.
Soft pastel color palette (mint, peach, cream, lavender),
flat shading with subtle gradient, gentle outline, warm supportive atmosphere,
centered composition on light background.
Style: blend of Sanrio cuteness + modern Korean illustration.

Negative: realistic, photographic, scary, dark, gore, weapons, multiple characters,
text, watermark, low quality, threatening expression.
```

### 5-7. 생성 워크플로 (96장)

1. **종별 키 이미지 1장씩 (4장)** — `calm × stable` 조합으로 4종 키 이미지 확정. 마음에 들 때까지 시드 변경 + 미세 프롬프트 튜닝.
2. **표정 변형 5장씩 (20장)** — 키 이미지를 reference로 업로드, 표정 모디파이어만 교체. seed 고정.
3. **트렌드 변형 18장씩 × 4종 (72장)** — 종별로 stable 키 이미지 reference + (표정 × 트렌드) 매트릭스 채우기.
4. **검수** — 각 단계 후 일관성(얼굴 비율·털색·체형) 확인. 안 맞으면 재생성.
5. **최적화** — 1024×1024 PNG → 512×512 WebP 변환, Supabase Storage `character-assets/` 버킷 업로드.

**예상 비용**: 종당 24장 × 4종 = 96장. 1장당 평균 3회 재생성 가정 시 ~288 API 호출. Nano Banana 단가 약 $0.039/image → **총 ~$11 (₩15,000)**.

---

## 6. 빌드플랜 통합

### 6-1. 현재 상황과 위치

- ✅ Step 1-5 완료 (결제까지 완료)
- 🟡 Step 6 Pro 구독 — **외부 의존 대기** (도메인 + 사업자등록 + Toss 라이브 키)
- ⏳ Step 7 명상의 소리/캐릭터 자산 — **외부 의존 없음, 즉시 착수 가능**

**전략**: Step 6은 외부 의존으로 멈춰 있으니, Step 7 캐릭터 시스템을 **Step 6과 병렬로 진행**. 도메인 발급 기다리는 한 달 동안 캐릭터를 완성하면 출시 임팩트가 합쳐짐.

### 6-2. Step 7 서브 스텝 분할

| Sub-step | 작업 | 의존 | 예상 기간 |
|---|---|---|---|
| **7-1. 자산 R&D (선행)** | 4종 × `calm × stable` 키 이미지 4장 확정 (Nano Banana, 스타일 튜닝) | 없음 | 1~2일 |
| **7-2. DB + 컴포넌트** | `profiles` 컬럼 추가 + `CharacterAvatar` 컴포넌트 + Supabase Storage 버킷 + asset loader | 7-1 키 이미지만 있으면 시작 | 1일 |
| **7-3. 마이페이지 베타 (wedge)** | 4장 대표 이미지로 마이페이지 캐릭터 카드 + 변경 모달만 먼저 출시 | 7-1, 7-2 | 0.5일 |
| **7-4. 자산 풀 생성** | 나머지 92장 (표정 × 트렌드 매트릭스) Nano Banana 생성·검수·업로드 | 7-1 키 이미지 확정 후 | 3~5일 |
| **7-5. 추천 알고리즘 + 검사 결과 페이지 통합** | `recommendCharacter()` 함수 + `IntegratedScoringResult`에 통합 + ResultsPage 추천 섹션 | 7-2 | 1일 |
| **7-6. 홈 Hero 교체** | DashboardPage 상단 캐릭터 Hero 카드 + 트렌드 계산 + 분석 이벤트 와이어링 | 7-4 자산 완성 | 1.5일 |

**전체 ~9일 작업** (자산 검수 포함).

### 6-3. Wedge 전략 (리스크 최소화)

자산 96장 한꺼번에 만들면 일관성 실패 시 손실 큼. **7-3 시점에 4장만으로 베타 출시**:

- 사용자가 마이페이지에서 캐릭터를 선택할 수 있음 (대표 포즈 1장만)
- 홈 화면 캐릭터 Hero는 아직 없음 (7-6에서 교체)
- 1~2주 운영하며 **사용자 선호 분포** 측정 (`analytics_events` 트래킹)
- 인기 1-2종에 자산 생성 우선순위 부여 → 나머지는 후순위

### 6-4. 분석 이벤트 (`analytics_events`)

기존 8개 이벤트에 4개 추가:

- `character_recommended` (props: `recommended_breed`, `affinity_score`, `top2_gap`)
- `character_selected` (props: `breed`, `source` = `recommended` | `free` | `changed`)
- `character_changed` (props: `from_breed`, `to_breed`, `change_count`)
- `character_viewed_home` (props: `breed`, `emotion`, `trend`) — 일일 1회만 fire

### 6-5. 검증되지 않은 가정 (출시 후 측정)

- 캐릭터가 실제로 "심리적 도움"이 되는가 → 출시 후 emotion score 7일 트렌드와 캐릭터 사용 빈도 상관관계 분석
- 4종 페르소나 매핑 가중치가 적절한가 → 사용자가 추천 캐릭터를 실제로 선택하는 비율 (높을수록 매핑 좋음)
- 표정·포즈 변화를 사용자가 인지하는가 → 정성 피드백 + `character_viewed_home` 빈도

### 6-6. 의존성 충돌 점검

- Step 6 (Pro 구독) — **충돌 없음**. 코드 경로 분리 (`/pricing` vs `/dashboard`, `/profile`)
- Step 5 (결제) — **충돌 없음**. 캐릭터는 무료 기능
- 추후 Pro 멤버십 차별화 시: 캐릭터 자체는 무료 유지, **시즌 의상/배경 변형** 같은 코스메틱이 Pro 혜택으로 합리적 (이번 디자인에서는 미설계)

---

## 7. 미결 사항 / 후속 결정 필요

- **시드 일관성 확보 실패 시 백업 플랜** — Nano Banana로 일관성 안 나오면 Midjourney v6 / Stable Diffusion + LoRA 학습 / 외주 일러스트레이터 등 선택지 필요
- **2차 확장 4종 선정** — 1차 출시 후 사용자 데이터 보고 결정 (페이즈드 전략 핵심)
- **시즌/이벤트 변형** — 추석·수능 D-Day 등 이벤트 시 한정 의상·배경 추가 (Pro 차별화 가능성)
- **B2B 학원 관리자 페이지에서의 노출** — 학원 관리자 대시보드에 학생 캐릭터 표시할지 (프라이버시 vs 친근감 트레이드오프)

---

## 부록 — Breed 키 매핑

| 캐릭터 한글명 | 코드 key (DB·파일 경로) |
|---|---|
| 시바이누 | `shiba` |
| 푸들 | `poodle` |
| 코리안숏헤어 | `korat` |
| 러시안블루 | `russian_blue` |
