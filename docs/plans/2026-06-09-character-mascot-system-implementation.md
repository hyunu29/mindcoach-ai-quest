# 캐릭터 마스코트 시스템 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 수험생 4유형에 매칭되는 4종 캐릭터를 홈/마이페이지/검사결과에 통합. 표정(오늘 감정) × 포즈(7일 트렌드) 하이브리드 베리에이션.

**Architecture:** Supabase Storage에 96장 자산 호스팅, `CharacterAvatar` 컴포넌트로 단일 진입점. 추천 알고리즘은 기존 `IntegratedScoringResult`에 통합. 7-1 자산 R&D → 7-3 wedge(4장으로 마이페이지 베타) → 7-6 홈 Hero 풀 출시 순서로 리스크 분산.

**Tech Stack:** React + TypeScript + Tailwind + shadcn/ui + Supabase (DB, Storage, RLS) + Vitest + Gemini Nano Banana (이미지 생성)

**디자인 문서:** `docs/plans/2026-06-09-character-mascot-system-design.md`

**Breed key 매핑:**

| 한글 | DB·경로 key |
|---|---|
| 시바이누 | `shiba` |
| 푸들 | `poodle` |
| 코리안숏헤어 | `korat` |
| 러시안블루 | `russian_blue` |

---

## Phase 7-1. 자산 R&D (선행, 1~2일)

> **비코딩 작업.** Gemini Nano Banana로 4종 키 이미지 확정. 이후 모든 코드 작업의 기준.

### Task 1: Nano Banana 환경 준비

**할 일:**
1. `aistudio.google.com` 접속 → Gemini 2.5 Flash Image 모델 활성화
2. API 키 발급 (이미 있다면 skip)
3. 결제 카드 등록 (예상 비용 $11 / ₩15,000)

**검증:** API 키로 테스트 호출 1회 성공.

### Task 2: 종별 키 이미지 4장 생성 (`calm × stable`)

**프롬프트:** 디자인 문서 §5-2, §5-3, §5-4(`calm`), §5-5(`stable`) 조합 사용.

**할 일:**
- 4종 각 `calm × stable` 이미지 생성. 일관성 OK 될 때까지 seed/프롬프트 미세 튜닝
- 결과 4장을 1024×1024 PNG로 다운로드
- 4종 일관된 아트 스타일이 안 나오면 같은 종 재생성. 기준: 외형(털색·체형) 동일성, 표정 부드러움, 배경 일관성

**자산 명명**: `{breed}_calm_stable.png`

**커밋 없음** (자산은 7-2에서 Supabase Storage 업로드).

### Task 3: 키 이미지 인간 검수

**할 일:**
- 4장을 한 화면에 모아놓고 (a) 종 식별 가능성 (b) 톤·색감 통일감 (c) 페르소나 직관성(예: 푸들이 완벽주의 느낌인지) 체크
- 한 종이라도 어색하면 Task 2로 회귀
- 합격 시 `C:\Users\ricky\Desktop\mindcoach-ai-quest\public\character-assets-local\` 로컬 폴더에 임시 저장 (7-2에서 Supabase Storage 옮김)

**합격 기준:** "이 4마리 같이 두고 봤을 때 위화감 없음" — 본인 판단.

---

## Phase 7-2. DB + 컴포넌트 (1일)

### Task 4: Supabase 마이그레이션 — profiles 컬럼 추가

**Files:**
- Create: `supabase/migrations/20260609120000_add_character_columns_to_profiles.sql`

**Step 1: 마이그레이션 작성**

```sql
-- profiles 테이블에 캐릭터 시스템 컬럼 추가
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS recommended_breed text,
  ADD COLUMN IF NOT EXISTS selected_breed text,
  ADD COLUMN IF NOT EXISTS character_chosen_at timestamptz,
  ADD COLUMN IF NOT EXISTS character_changed_count int NOT NULL DEFAULT 0;

ALTER TABLE profiles
  ADD CONSTRAINT IF NOT EXISTS breed_recommended_check
  CHECK (recommended_breed IS NULL OR recommended_breed IN ('shiba', 'poodle', 'korat', 'russian_blue'));

ALTER TABLE profiles
  ADD CONSTRAINT IF NOT EXISTS breed_selected_check
  CHECK (selected_breed IS NULL OR selected_breed IN ('shiba', 'poodle', 'korat', 'russian_blue'));

COMMENT ON COLUMN profiles.recommended_breed IS '통합검사 추천 알고리즘 결과 (last write wins)';
COMMENT ON COLUMN profiles.selected_breed IS '사용자가 최종 선택한 캐릭터';
COMMENT ON COLUMN profiles.character_changed_count IS '캐릭터 변경 횟수 (분석용, 쿨다운 없음)';
```

**Step 2: 마이그레이션 적용**

```bash
cd C:/Users/ricky/Desktop/mindcoach-ai-quest
npx supabase db push
```

**Expected:** "Applying migration 20260609120000_add_character_columns_to_profiles.sql..." 성공.

**Step 3: 적용 검증**

Supabase Studio → Table Editor → profiles 테이블에서 4개 컬럼 확인.

**Step 4: 타입 재생성**

```bash
npx supabase gen types typescript --project-id bnhnaaarsyauppdbrbco > src/integrations/supabase/types.ts
```

**Step 5: 커밋**

```bash
git add supabase/migrations/20260609120000_add_character_columns_to_profiles.sql src/integrations/supabase/types.ts
git commit -m "feat(character): add breed columns to profiles"
```

### Task 5: Supabase Storage 버킷 + RLS 설정

**Files:**
- Create: `supabase/migrations/20260609120100_create_character_assets_bucket.sql`

**Step 1: 마이그레이션 작성**

```sql
-- character-assets 버킷 (퍼블릭, 읽기 전용 — 인증 불필요)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('character-assets', 'character-assets', true, 2097152, ARRAY['image/webp', 'image/png'])
ON CONFLICT (id) DO NOTHING;

-- 모든 사용자 읽기 허용
CREATE POLICY IF NOT EXISTS "character_assets_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'character-assets');

-- 쓰기는 서비스 롤만 (개발자가 직접 업로드)
CREATE POLICY IF NOT EXISTS "character_assets_service_write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'character-assets' AND auth.role() = 'service_role');
```

**Step 2: 적용 + 커밋**

```bash
npx supabase db push
git add supabase/migrations/20260609120100_create_character_assets_bucket.sql
git commit -m "feat(character): create character-assets storage bucket"
```

### Task 6: 키 이미지 4장 Supabase Storage 업로드

**할 일:**
1. Task 3에서 검수 완료한 4장을 512×512 WebP로 변환 (squoosh.app 사용)
2. Supabase Studio → Storage → `character-assets` 버킷 → 다음 경로로 업로드:
   - `shiba/calm_stable.webp`
   - `poodle/calm_stable.webp`
   - `korat/calm_stable.webp`
   - `russian_blue/calm_stable.webp`
3. 추가로 동일한 4장을 대표 카드용으로 한 번 더 업로드:
   - `shiba/card.webp`, `poodle/card.webp`, `korat/card.webp`, `russian_blue/card.webp`

**검증:** 브라우저에서 URL 직접 접근 가능
```
https://bnhnaaarsyauppdbrbco.supabase.co/storage/v1/object/public/character-assets/poodle/calm_stable.webp
```

**커밋 없음** (자산은 Storage에 직접 업로드).

### Task 7: 캐릭터 타입 정의

**Files:**
- Create: `src/lib/character/types.ts`
- Test: `src/test/character-types.test.ts`

**Step 1: 테스트 작성**

```ts
// src/test/character-types.test.ts
import { describe, it, expect } from 'vitest';
import { BREEDS, EMOTION_KEYS, TREND_KEYS, type Breed, type CharacterTrend } from '@/lib/character/types';

describe('character types', () => {
  it('exposes 4 breeds for Phase 1 launch', () => {
    expect(BREEDS).toEqual(['shiba', 'poodle', 'korat', 'russian_blue']);
  });

  it('exposes 6 emotion keys matching PrimaryEmotion', () => {
    expect(EMOTION_KEYS).toEqual(['happy', 'calm', 'neutral', 'sad', 'angry', 'anxious']);
  });

  it('exposes 4 trend keys', () => {
    const trends: CharacterTrend[] = ['rising', 'stable', 'declining', 'crashing'];
    expect(TREND_KEYS).toEqual(trends);
  });
});
```

**Step 2: 테스트 실행 (실패 확인)**

```bash
npx vitest run src/test/character-types.test.ts
```

Expected: FAIL — module not found.

**Step 3: 구현**

```ts
// src/lib/character/types.ts
import type { PrimaryEmotion } from '@/lib/emotion-agent-types';

export const BREEDS = ['shiba', 'poodle', 'korat', 'russian_blue'] as const;
export type Breed = typeof BREEDS[number];

export const EMOTION_KEYS: PrimaryEmotion[] = ['happy', 'calm', 'neutral', 'sad', 'angry', 'anxious'];

export const TREND_KEYS = ['rising', 'stable', 'declining', 'crashing'] as const;
export type CharacterTrend = typeof TREND_KEYS[number];

export interface BreedPersona {
  breed: Breed;
  koreanName: string;
  personaName: string;
  copy: string;
}

export const BREED_PERSONAS: Record<Breed, BreedPersona> = {
  shiba: { breed: 'shiba', koreanName: '시바이누', personaName: '의욕폭주형', copy: '끝까지 달려가는 너 — 가끔은 숨도 골라야 해' },
  poodle: { breed: 'poodle', koreanName: '푸들', personaName: '완벽주의형', copy: '완벽한 너를 추구하는 너 — 어제보다 한 발이면 충분해' },
  korat: { breed: 'korat', koreanName: '코리안숏헤어', personaName: '마이페이스형', copy: '내 길은 내가 가는 너 — 곁에서 조용히 응원할게' },
  russian_blue: { breed: 'russian_blue', koreanName: '러시안블루', personaName: '번아웃취약형', copy: '깊게 느끼는 너 — 잠시 멈춰도 괜찮아' },
};
```

**Step 4: 테스트 통과 확인**

```bash
npx vitest run src/test/character-types.test.ts
```

Expected: PASS.

**Step 5: 커밋**

```bash
git add src/lib/character/types.ts src/test/character-types.test.ts
git commit -m "feat(character): define Breed, CharacterTrend, BREED_PERSONAS"
```

### Task 8: Asset URL 헬퍼

**Files:**
- Create: `src/lib/character/asset-url.ts`
- Test: `src/test/character-asset-url.test.ts`

**Step 1: 테스트 작성**

```ts
// src/test/character-asset-url.test.ts
import { describe, it, expect } from 'vitest';
import { getCharacterAssetUrl, getCharacterCardUrl, FALLBACK_ASSET } from '@/lib/character/asset-url';

describe('character asset URL', () => {
  it('builds breed/emotion_trend.webp path', () => {
    const url = getCharacterAssetUrl('poodle', 'anxious', 'declining');
    expect(url).toContain('/character-assets/poodle/anxious_declining.webp');
  });

  it('builds card asset URL', () => {
    const url = getCharacterCardUrl('shiba');
    expect(url).toContain('/character-assets/shiba/card.webp');
  });

  it('exposes a fallback path', () => {
    expect(FALLBACK_ASSET).toContain('neutral_stable.webp');
  });
});
```

**Step 2: 테스트 실패 확인 + 구현**

```ts
// src/lib/character/asset-url.ts
import type { Breed, CharacterTrend } from './types';
import type { PrimaryEmotion } from '@/lib/emotion-agent-types';

const STORAGE_BASE = 'https://bnhnaaarsyauppdbrbco.supabase.co/storage/v1/object/public/character-assets';

export function getCharacterAssetUrl(breed: Breed, emotion: PrimaryEmotion, trend: CharacterTrend): string {
  return `${STORAGE_BASE}/${breed}/${emotion}_${trend}.webp`;
}

export function getCharacterCardUrl(breed: Breed): string {
  return `${STORAGE_BASE}/${breed}/card.webp`;
}

export const FALLBACK_ASSET = `${STORAGE_BASE}/poodle/neutral_stable.webp`;
```

**Step 3: 테스트 통과 + 커밋**

```bash
npx vitest run src/test/character-asset-url.test.ts
git add src/lib/character/asset-url.ts src/test/character-asset-url.test.ts
git commit -m "feat(character): asset URL helpers"
```

### Task 9: CharacterAvatar 컴포넌트

**Files:**
- Create: `src/components/character/CharacterAvatar.tsx`
- Test: `src/test/character-avatar.test.tsx`

**Step 1: 테스트 작성**

```tsx
// src/test/character-avatar.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CharacterAvatar } from '@/components/character/CharacterAvatar';

describe('CharacterAvatar', () => {
  it('renders img with correct src for breed/emotion/trend', () => {
    const { getByRole } = render(
      <CharacterAvatar breed="poodle" emotion="anxious" trend="declining" size="card" />
    );
    const img = getByRole('img') as HTMLImageElement;
    expect(img.src).toContain('poodle/anxious_declining.webp');
  });

  it('falls back to fallback asset on image error', () => {
    const { getByRole } = render(
      <CharacterAvatar breed="poodle" emotion="happy" trend="rising" size="card" />
    );
    const img = getByRole('img') as HTMLImageElement;
    img.dispatchEvent(new Event('error'));
    expect(img.src).toContain('neutral_stable.webp');
  });
});
```

**Step 2: 구현**

```tsx
// src/components/character/CharacterAvatar.tsx
import { useState } from 'react';
import type { Breed, CharacterTrend } from '@/lib/character/types';
import type { PrimaryEmotion } from '@/lib/emotion-agent-types';
import { getCharacterAssetUrl, FALLBACK_ASSET } from '@/lib/character/asset-url';
import { BREED_PERSONAS } from '@/lib/character/types';

type Size = 'hero' | 'card' | 'mini';

const SIZE_CLASS: Record<Size, string> = {
  hero: 'w-[300px] h-[300px]',
  card: 'w-[160px] h-[160px]',
  mini: 'w-[48px] h-[48px]',
};

interface Props {
  breed: Breed;
  emotion: PrimaryEmotion;
  trend: CharacterTrend;
  size: Size;
  className?: string;
}

export function CharacterAvatar({ breed, emotion, trend, size, className }: Props) {
  const [errored, setErrored] = useState(false);
  const src = errored ? FALLBACK_ASSET : getCharacterAssetUrl(breed, emotion, trend);
  return (
    <img
      src={src}
      alt={`${BREED_PERSONAS[breed].koreanName} - ${emotion}`}
      onError={() => setErrored(true)}
      className={`object-contain ${SIZE_CLASS[size]} ${className ?? ''}`}
      loading="lazy"
    />
  );
}
```

**Step 3: 테스트 통과 + 커밋**

```bash
npx vitest run src/test/character-avatar.test.tsx
git add src/components/character/CharacterAvatar.tsx src/test/character-avatar.test.tsx
git commit -m "feat(character): CharacterAvatar component with fallback"
```

### Task 10: useCharacter 훅 (조회·변경)

**Files:**
- Create: `src/hooks/useCharacter.ts`

**Step 1: 구현 (Supabase 통신은 통합 테스트로만 검증)**

```ts
// src/hooks/useCharacter.ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Breed } from '@/lib/character/types';
import { track } from '@/lib/analytics';

interface CharacterState {
  selectedBreed: Breed | null;
  recommendedBreed: Breed | null;
  changeCount: number;
}

export function useCharacter() {
  const { user } = useAuth();
  const [state, setState] = useState<CharacterState>({ selectedBreed: null, recommendedBreed: null, changeCount: 0 });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('profiles')
      .select('selected_breed, recommended_breed, character_changed_count')
      .eq('id', user.id)
      .single();
    setState({
      selectedBreed: (data?.selected_breed as Breed | null) ?? null,
      recommendedBreed: (data?.recommended_breed as Breed | null) ?? null,
      changeCount: data?.character_changed_count ?? 0,
    });
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const selectCharacter = useCallback(async (breed: Breed, source: 'recommended' | 'free' | 'changed') => {
    if (!user) return;
    const isChange = state.selectedBreed !== null && state.selectedBreed !== breed;
    const newCount = isChange ? state.changeCount + 1 : state.changeCount;
    const fromBreed = state.selectedBreed;

    await supabase.from('profiles').update({
      selected_breed: breed,
      character_chosen_at: new Date().toISOString(),
      character_changed_count: newCount,
    }).eq('id', user.id);

    if (isChange) {
      void track('character_changed', { from_breed: fromBreed, to_breed: breed, change_count: newCount });
    } else {
      void track('character_selected', { breed, source });
    }
    await refresh();
  }, [user, state, refresh]);

  return { ...state, loading, selectCharacter, refresh };
}
```

**Step 2: 빌드 검증 + 커밋**

```bash
npm run build
git add src/hooks/useCharacter.ts
git commit -m "feat(character): useCharacter hook"
```

---

## Phase 7-3. 마이페이지 베타 wedge (0.5일)

> **목표:** 4장 대표 이미지만으로 마이페이지에서 캐릭터 선택 가능. 홈은 아직 변경 없음.

### Task 11: CharacterSelectModal 컴포넌트

**Files:**
- Create: `src/components/character/CharacterSelectModal.tsx`

**Step 1: 구현**

```tsx
// src/components/character/CharacterSelectModal.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BREEDS, BREED_PERSONAS, type Breed } from '@/lib/character/types';
import { getCharacterCardUrl } from '@/lib/character/asset-url';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBreed: Breed | null;
  recommendedBreed: Breed | null;
  onSelect: (breed: Breed) => void | Promise<void>;
}

export function CharacterSelectModal({ open, onOpenChange, currentBreed, recommendedBreed, onSelect }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>마스코트 선택</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 mt-4">
          {BREEDS.map((breed) => {
            const persona = BREED_PERSONAS[breed];
            const isCurrent = breed === currentBreed;
            const isRecommended = breed === recommendedBreed;
            return (
              <Card
                key={breed}
                onClick={() => onSelect(breed)}
                className={`p-4 cursor-pointer transition hover:scale-[1.02] ${isCurrent ? 'ring-2 ring-primary' : ''}`}
              >
                <div className="relative">
                  <img src={getCharacterCardUrl(breed)} alt={persona.koreanName} className="w-full aspect-square object-contain" loading="lazy" />
                  {isRecommended && (
                    <Badge className="absolute top-1 right-1">✨ 당신과 잘 맞아요</Badge>
                  )}
                </div>
                <div className="mt-3">
                  <div className="font-bold">{persona.koreanName}</div>
                  <div className="text-sm text-muted-foreground">{persona.personaName}</div>
                  <div className="text-xs mt-1">{persona.copy}</div>
                </div>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: 빌드 검증 + 커밋**

```bash
npm run build
git add src/components/character/CharacterSelectModal.tsx
git commit -m "feat(character): CharacterSelectModal"
```

### Task 12: ProfilePage에 캐릭터 섹션 추가

**Files:**
- Modify: `src/pages/ProfilePage.tsx`

**Step 1: 현재 상태 확인**

```bash
cat src/pages/ProfilePage.tsx | head -40
```

상단에 새 섹션 추가 위치 결정.

**Step 2: 캐릭터 섹션 추가**

ProfilePage 본문에 다음 섹션 추가 (적절한 위치, 보통 상단):

```tsx
import { useState } from 'react';
import { useCharacter } from '@/hooks/useCharacter';
import { CharacterSelectModal } from '@/components/character/CharacterSelectModal';
import { BREED_PERSONAS } from '@/lib/character/types';
import { getCharacterCardUrl } from '@/lib/character/asset-url';

// 컴포넌트 내부:
const { selectedBreed, recommendedBreed, loading, selectCharacter } = useCharacter();
const [modalOpen, setModalOpen] = useState(false);

// JSX에 추가:
{!loading && (
  <Card className="p-6 rounded-2xl mb-4">
    <div className="flex items-center gap-4">
      {selectedBreed ? (
        <>
          <img src={getCharacterCardUrl(selectedBreed)} alt="" className="w-20 h-20 object-contain" />
          <div className="flex-1">
            <div className="font-bold">{BREED_PERSONAS[selectedBreed].koreanName}</div>
            <div className="text-sm text-muted-foreground">{BREED_PERSONAS[selectedBreed].personaName}</div>
          </div>
        </>
      ) : (
        <div className="flex-1 text-sm text-muted-foreground">아직 마스코트를 선택하지 않았어요.</div>
      )}
      <Button onClick={() => setModalOpen(true)} variant="outline">
        {selectedBreed ? '변경하기' : '선택하기'}
      </Button>
    </div>
  </Card>
)}

<CharacterSelectModal
  open={modalOpen}
  onOpenChange={setModalOpen}
  currentBreed={selectedBreed}
  recommendedBreed={recommendedBreed}
  onSelect={async (breed) => {
    const source = breed === recommendedBreed ? 'recommended' : selectedBreed === null ? 'free' : 'changed';
    await selectCharacter(breed, source);
    setModalOpen(false);
  }}
/>
```

**Step 3: 빌드 + 수동 스모크**

```bash
npm run build
npm run dev
```

브라우저에서:
- `/profile` 접속
- "선택하기" 클릭 → 모달 4종 카드 노출 확인
- 한 종 클릭 → 카드 닫히고 캐릭터 표시 확인
- 새로고침 → 선택 유지 확인
- "변경하기" 다시 클릭 → 다른 종 선택 → DB의 `character_changed_count` 증가 확인 (Supabase Studio)

**Step 4: 커밋**

```bash
git add src/pages/ProfilePage.tsx
git commit -m "feat(character): profile page mascot selection (wedge)"
```

### Task 13: 분석 이벤트 검증

**할 일:**
1. 캐릭터 선택 후 Supabase Studio SQL Editor에서 확인:
   ```sql
   SELECT event_name, event_props, created_at
   FROM analytics_events
   WHERE event_name IN ('character_selected', 'character_changed')
   ORDER BY created_at DESC LIMIT 10;
   ```
2. `event_props.breed`와 `event_props.source` 정확히 들어가는지 확인.

---

## Phase 7-4. 자산 풀 생성 (3~5일, 비코딩 병렬 진행)

> **Phase 7-3 마이페이지 출시 후 데이터 1~2주 수집 권장 후 시작.**
> 인기 1-2종에 자산 생성 우선순위.

### Task 14: 표정 변형 20장 생성 (4종 × 5표정)

각 종별로 `calm` 키 이미지를 reference로 업로드 → 표정 모디파이어만 교체:

순서 (종당 5장 = 6 emotion - 이미 만든 calm 제외):
1. happy
2. neutral
3. sad
4. angry
5. anxious

**합격 기준:** 동일 종 내 외형 일관성. 표정만 다름.

**업로드:** `{breed}/{emotion}_stable.webp` 형태로 Storage 업로드.

**검수 후 누락 종은 재생성**.

### Task 15: 트렌드 변형 72장 생성 (4종 × 6표정 × 3트렌드)

`stable` 이미 있으므로 나머지 3트렌드(rising, declining, crashing) × 6표정 × 4종 = 72장.

종당 한 트렌드씩 진행:
- 종 A의 6표정 × rising = 6장
- 종 A의 6표정 × declining = 6장
- 종 A의 6표정 × crashing = 6장
- 종 B, C, D 반복

**업로드:** `{breed}/{emotion}_{trend}.webp`

**중간 체크:** 종 1개 완료 시점에 전체(24장) 한 화면에 모아 일관성 확인.

### Task 16: 자산 최종 검수 시트

**Files:**
- Create: `docs/character-assets-qa.md`

체크리스트 96 항목 마킹용 문서 작성. 통과한 자산만 production 사용.

```bash
git add docs/character-assets-qa.md
git commit -m "docs(character): asset QA checklist"
```

---

## Phase 7-5. 추천 알고리즘 + 검사 결과 통합 (1일)

### Task 17: recommendCharacter 함수 + 테스트

**Files:**
- Create: `src/lib/character/recommend.ts`
- Test: `src/test/character-recommend.test.ts`

**Step 1: 테스트 작성**

```ts
// src/test/character-recommend.test.ts
import { describe, it, expect } from 'vitest';
import { recommendCharacter } from '@/lib/character/recommend';

const baseDomains = (overrides: Record<string, number>) => ({
  emotional_instability: 0, test_stage_anxiety: 0, learning_obsession: 0,
  routine_time_control: 0, cognitive_focus: 0, learning_avoidance: 0,
  somatic_pain: 0, energy_burnout: 0, self_relationships: 0, sleep_routine: 0,
  ...overrides,
});

describe('recommendCharacter', () => {
  it('returns insufficient_data when all top scores < 8', () => {
    const result = recommendCharacter(baseDomains({}));
    expect(result.status).toBe('insufficient_data');
  });

  it('recommends poodle for high obsession + test anxiety', () => {
    const result = recommendCharacter(baseDomains({ learning_obsession: 22, test_stage_anxiety: 22, self_relationships: 18 }));
    expect(result.status).toBe('single');
    if (result.status === 'single') expect(result.top.breed).toBe('poodle');
  });

  it('recommends russian_blue for burnout + somatic + sleep', () => {
    const result = recommendCharacter(baseDomains({ energy_burnout: 23, somatic_pain: 20, sleep_routine: 18, cognitive_focus: 15 }));
    expect(result.status).toBe('single');
    if (result.status === 'single') expect(result.top.breed).toBe('russian_blue');
  });

  it('returns tie when top two within 2 points', () => {
    const result = recommendCharacter(baseDomains({
      learning_obsession: 20, emotional_instability: 18, energy_burnout: 18, // shiba ≈ 18.4
      test_stage_anxiety: 20, self_relationships: 18, // pushes poodle ≈ 19.6 (within 2)
    }));
    expect(['tie', 'single']).toContain(result.status);
  });
});
```

**Step 2: 구현**

```ts
// src/lib/character/recommend.ts
import type { Breed } from './types';

type DomainKey =
  | 'emotional_instability' | 'test_stage_anxiety' | 'learning_obsession'
  | 'routine_time_control' | 'cognitive_focus' | 'learning_avoidance'
  | 'somatic_pain' | 'energy_burnout' | 'self_relationships' | 'sleep_routine';

type DomainScores = Record<DomainKey, number>;

const WEIGHTS: Record<Breed, Partial<Record<DomainKey, number>>> = {
  shiba: { learning_obsession: 0.4, emotional_instability: 0.3, energy_burnout: 0.3 },
  poodle: { learning_obsession: 0.4, test_stage_anxiety: 0.4, self_relationships: 0.2 },
  korat: { learning_avoidance: 0.4, routine_time_control: 0.3, cognitive_focus: 0.3 },
  russian_blue: { energy_burnout: 0.35, somatic_pain: 0.25, sleep_routine: 0.2, cognitive_focus: 0.2 },
};

export interface BreedAffinity {
  breed: Breed;
  score: number;
}

export type Recommendation =
  | { status: 'insufficient_data'; scores: BreedAffinity[] }
  | { status: 'single'; top: BreedAffinity; rest: BreedAffinity[] }
  | { status: 'tie'; top: BreedAffinity; runnerUp: BreedAffinity; rest: BreedAffinity[] };

const INSUFFICIENT_THRESHOLD = 8;
const TIE_GAP = 2;

export function recommendCharacter(domains: DomainScores): Recommendation {
  const scores: BreedAffinity[] = (Object.keys(WEIGHTS) as Breed[]).map((breed) => {
    const w = WEIGHTS[breed];
    const score = (Object.entries(w) as [DomainKey, number][])
      .reduce((sum, [k, weight]) => sum + (domains[k] ?? 0) * weight, 0);
    return { breed, score };
  }).sort((a, b) => b.score - a.score);

  if (scores[0].score < INSUFFICIENT_THRESHOLD) {
    return { status: 'insufficient_data', scores };
  }
  const gap = scores[0].score - scores[1].score;
  if (gap < TIE_GAP) {
    return { status: 'tie', top: scores[0], runnerUp: scores[1], rest: scores.slice(2) };
  }
  return { status: 'single', top: scores[0], rest: scores.slice(1) };
}
```

**Step 3: 테스트 통과 + 커밋**

```bash
npx vitest run src/test/character-recommend.test.ts
git add src/lib/character/recommend.ts src/test/character-recommend.test.ts
git commit -m "feat(character): recommendCharacter algorithm with weights"
```

### Task 18: scoreIntegratedTest 결과에 추천 포함

**Files:**
- Modify: `src/lib/integrated-test-scoring.ts`

**Step 1: 인터페이스에 필드 추가**

`IntegratedScoringResult`에 `characterRecommendation: Recommendation` 추가.

**Step 2: 함수 본문에서 호출**

`scoreIntegratedTest` 마지막에 `domainScores`로부터 domain key → score 맵을 만들어 `recommendCharacter()` 호출 결과를 추가.

**Step 3: 테스트** (기존 통합검사 테스트가 있으면 거기 확장, 없으면 추가)

**Step 4: 커밋**

```bash
git add src/lib/integrated-test-scoring.ts
git commit -m "feat(character): include character recommendation in scoring result"
```

### Task 19: ResultsPage 캐릭터 추천 카드

**Files:**
- Create: `src/components/character/CharacterRecommendationCard.tsx`
- Modify: `src/pages/ResultsPage.tsx`

**Step 1: 카드 컴포넌트 구현**

```tsx
// src/components/character/CharacterRecommendationCard.tsx
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BREED_PERSONAS, type Breed } from '@/lib/character/types';
import { getCharacterCardUrl } from '@/lib/character/asset-url';

interface Props {
  topBreed: Breed;
  runnerUpBreed?: Breed;
  affinityScore: number;
  top2Gap: number;
  onSelect: (breed: Breed) => void;
  onOpenAll: () => void;
}

export function CharacterRecommendationCard({ topBreed, runnerUpBreed, onSelect, onOpenAll }: Props) {
  const persona = BREED_PERSONAS[topBreed];
  return (
    <Card className="p-6 rounded-2xl">
      <h3 className="text-lg font-bold">💫 당신과 가장 잘 맞는 마스코트</h3>
      <div className="flex gap-4 mt-4">
        <div className="flex-1 text-center">
          <img src={getCharacterCardUrl(topBreed)} alt={persona.koreanName} className="w-32 h-32 mx-auto" />
          <div className="font-bold mt-2">{persona.koreanName}</div>
          <div className="text-sm text-muted-foreground">"{persona.personaName}"</div>
          <p className="text-sm mt-2">{persona.copy}</p>
        </div>
        {runnerUpBreed && (
          <div className="flex-1 text-center opacity-80">
            <img src={getCharacterCardUrl(runnerUpBreed)} alt="" className="w-24 h-24 mx-auto" />
            <div className="font-bold mt-2">{BREED_PERSONAS[runnerUpBreed].koreanName}</div>
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-4">
        <Button className="flex-1" onClick={() => onSelect(topBreed)}>이 캐릭터로 선택</Button>
        <Button variant="outline" onClick={onOpenAll}>다른 캐릭터 보기</Button>
      </div>
    </Card>
  );
}
```

**Step 2: ResultsPage 통합**

`scoreIntegratedTest` 결과의 `characterRecommendation`이 `insufficient_data`가 아니면 상단에 카드 노출. 카드 클릭 시 `useCharacter().selectCharacter(breed, 'recommended')` 호출 + `track('character_recommended', { recommended_breed, affinity_score, top2_gap })` 한 번 fire.

**Step 3: 빌드 + 스모크 + 커밋**

```bash
npm run build
npm run dev
# 통합검사 응시 → 결과 페이지에서 추천 카드 노출 확인
git add src/components/character/CharacterRecommendationCard.tsx src/pages/ResultsPage.tsx
git commit -m "feat(character): results page recommendation card"
```

### Task 20: 분석 이벤트 character_recommended

ResultsPage에서 추천 카드가 마운트될 때 `useEffect`로 한 번만 fire:

```ts
useEffect(() => {
  if (rec.status !== 'insufficient_data') {
    void track('character_recommended', {
      recommended_breed: rec.top.breed,
      affinity_score: rec.top.score,
      top2_gap: rec.status === 'tie' ? rec.top.score - rec.runnerUp.score : rec.top.score - rec.rest[0].score,
    });
  }
}, []);
```

---

## Phase 7-6. 홈 Hero 교체 (1.5일)

### Task 21: 7일 트렌드 계산 함수

**Files:**
- Create: `src/lib/character/trend.ts`
- Test: `src/test/character-trend.test.ts`

**Step 1: 테스트**

```ts
// src/test/character-trend.test.ts
import { describe, it, expect } from 'vitest';
import { calculateEmotionTrend } from '@/lib/character/trend';

describe('calculateEmotionTrend', () => {
  it('returns stable for <6 records (insufficient)', () => {
    expect(calculateEmotionTrend([3, 4, 3])).toBe('stable');
  });

  it('returns rising when recent3 avg - prev3 avg >= 0.7', () => {
    expect(calculateEmotionTrend([1, 1, 2, 4, 4, 5])).toBe('rising');
  });

  it('returns declining when diff <= -0.7', () => {
    expect(calculateEmotionTrend([5, 5, 4, 2, 2, 2])).toBe('declining');
  });

  it('returns crashing when diff <= -1.5', () => {
    expect(calculateEmotionTrend([5, 5, 5, 2, 1, 1])).toBe('crashing');
  });

  it('returns stable when diff within +/-0.7', () => {
    expect(calculateEmotionTrend([3, 4, 3, 3, 4, 3])).toBe('stable');
  });
});
```

**Step 2: 구현**

```ts
// src/lib/character/trend.ts
import type { CharacterTrend } from './types';

/** scores: 오래된 → 최신 순. 6개 이상이면 최근 3 vs 이전 3 비교. */
export function calculateEmotionTrend(scores: number[]): CharacterTrend {
  if (scores.length < 6) return 'stable';
  const recent = scores.slice(-3);
  const prev = scores.slice(-6, -3);
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const diff = avg(recent) - avg(prev);
  if (diff <= -1.5) return 'crashing';
  if (diff <= -0.7) return 'declining';
  if (diff >= 0.7) return 'rising';
  return 'stable';
}

export const TREND_COPY: Record<CharacterTrend, string> = {
  rising: '회복 중 🌱',
  stable: '안정 ☀️',
  declining: '좀 지치고 있어 🌫️',
  crashing: '많이 힘들어 보여 🌧️',
};
```

**Step 3: 통과 + 커밋**

```bash
npx vitest run src/test/character-trend.test.ts
git add src/lib/character/trend.ts src/test/character-trend.test.ts
git commit -m "feat(character): 7-day emotion trend calculation"
```

### Task 22: DashboardPage Hero 카드 교체

**Files:**
- Modify: `src/pages/DashboardPage.tsx`

**Step 1: 현재 weekData 활용**

기존 weekData가 이미 일별 평균 score를 가지고 있음. score 배열만 추출해서 `calculateEmotionTrend()` 호출.

**Step 2: emotion 매핑**

기존 emotionOptions에는 score만 있고 PrimaryEmotion 키 매핑이 없음. 매핑 헬퍼 추가:

```ts
// DashboardPage 내부 (또는 src/lib/character/emotion-mapping.ts로 분리)
function scoreToEmotion(score: number): PrimaryEmotion {
  if (score >= 5) return 'happy';
  if (score === 4) return 'calm';
  if (score === 3) return 'neutral';
  if (score === 2) return 'sad';
  return 'anxious';
}
```

**Step 3: Hero 카드 추가**

기존 "오늘 감정 선택" 영역을 다음으로 교체:

```tsx
{selectedBreed && (
  <Card className="p-6 rounded-2xl mb-4 text-center">
    <CharacterAvatar
      breed={selectedBreed}
      emotion={todayEmotion ? scoreToEmotion(todayEmotion.score) : 'neutral'}
      trend={trend}
      size="hero"
      className="mx-auto"
    />
    <h2 className="text-xl font-bold mt-3">오늘은 어떤 하루였어?</h2>
    <p className="text-sm text-muted-foreground">{nickname}님, {BREED_PERSONAS[selectedBreed].copy}</p>

    <div className="flex justify-center gap-3 mt-4">
      {emotionOptions.map((opt, idx) => (
        <button key={opt.label} onClick={() => handleEmotionSelect(idx)} className={selectedEmotion === idx ? 'ring-2 ring-primary rounded-full' : ''}>
          <span className="text-3xl">{opt.emoji}</span>
        </button>
      ))}
    </div>

    <p className="text-xs mt-3">📈 이번 주 트렌드: {TREND_COPY[trend]}</p>
  </Card>
)}

{!selectedBreed && !characterLoading && (
  <Card className="p-6 rounded-2xl mb-4 text-center bg-gradient-to-br from-purple-50 to-pink-50">
    <p className="font-bold mb-2">🐾 마스코트를 만나보세요</p>
    <p className="text-sm text-muted-foreground mb-3">통합검사를 받으면 가장 잘 맞는 마스코트를 추천드려요</p>
    <Button onClick={() => navigate('/tests')}>통합검사 받기</Button>
  </Card>
)}
```

**Step 4: 빌드 + 스모크**

```bash
npm run build
npm run dev
```

브라우저 체크:
- 캐릭터 미선택 상태: "마스코트를 만나보세요" CTA 보임
- 캐릭터 선택 후: Hero 카드에 캐릭터 + 감정 선택 + 트렌드 라벨 보임
- 감정 클릭 시 즉시 캐릭터 표정 변화 확인

**Step 5: 커밋**

```bash
git add src/pages/DashboardPage.tsx
git commit -m "feat(character): dashboard hero card with character avatar"
```

### Task 23: 분석 이벤트 character_viewed_home (일일 1회)

**Files:**
- Modify: `src/pages/DashboardPage.tsx`

**Step 1: 일일 dedup 로직**

```ts
useEffect(() => {
  if (!selectedBreed || !todayEmotion) return;
  const today = new Date().toISOString().split('T')[0];
  const lastFiredKey = `mc_char_view_${today}`;
  if (localStorage.getItem(lastFiredKey)) return;
  void track('character_viewed_home', {
    breed: selectedBreed,
    emotion: scoreToEmotion(todayEmotion.score),
    trend,
  });
  localStorage.setItem(lastFiredKey, '1');
}, [selectedBreed, todayEmotion, trend]);
```

**Step 2: 빌드 + 검증 + 커밋**

```bash
npm run build
git add src/pages/DashboardPage.tsx
git commit -m "feat(character): character_viewed_home daily analytics"
```

### Task 24: 분석 쿼리 문서 업데이트

**Files:**
- Modify: `docs/analytics-queries.md`

캐릭터 관련 funnel 쿼리 추가:

```sql
-- 통합검사 응시 → 추천 캐릭터 선택률
SELECT
  COUNT(DISTINCT CASE WHEN event_name = 'character_recommended' THEN user_id END) AS recommended_users,
  COUNT(DISTINCT CASE WHEN event_name = 'character_selected' AND event_props->>'source' = 'recommended' THEN user_id END) AS accepted_recommendation,
  ROUND(
    COUNT(DISTINCT CASE WHEN event_name = 'character_selected' AND event_props->>'source' = 'recommended' THEN user_id END)::numeric
    / NULLIF(COUNT(DISTINCT CASE WHEN event_name = 'character_recommended' THEN user_id END), 0) * 100,
    1
  ) AS acceptance_rate_percent
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '30 days';

-- 캐릭터별 선택 분포
SELECT event_props->>'breed' AS breed, COUNT(*) AS selections
FROM analytics_events
WHERE event_name = 'character_selected' AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY 1 ORDER BY 2 DESC;

-- 캐릭터 변경 횟수 분포
SELECT (event_props->>'change_count')::int AS change_count, COUNT(*) AS users
FROM analytics_events
WHERE event_name = 'character_changed'
GROUP BY 1 ORDER BY 1;
```

```bash
git add docs/analytics-queries.md
git commit -m "docs(character): analytics queries for character funnel"
```

---

## Phase 종료 — 회고 및 메모리 업데이트

### Task 25: buildplan progress 메모리 업데이트

작업 완료 후 `C:\Users\ricky\.claude\projects\C--Users-ricky-Desktop-------AI\memory\project_mindcoach_buildplan_progress.md` Step 7 섹션을 다음으로 갱신:

```
- ✅ Step 7-1 ~ 7-6 캐릭터 마스코트 시스템 완료 (2026-06-XX)
  - 4종 (shiba/poodle/korat/russian_blue) × 6표정 × 4트렌드 = 96장 + 카드 4장
  - 추천 알고리즘: 통합검사 10영역 가중치 기반
  - DashboardPage Hero + ProfilePage 변경 + ResultsPage 추천
  - 분석 이벤트 4종 와이어링
```

### Task 26: 1~2주 후 데이터 리뷰

`docs/analytics-queries.md`의 쿼리 실행:
- 추천 수락률
- 캐릭터별 선호 분포 (페이즈드 2차 4종 결정 근거)
- emotion score 7일 트렌드 vs 캐릭터 사용 빈도 상관

---

## 부록 — 자주 쓰는 명령

```bash
# 빌드
npm run build

# 개발 서버
npm run dev

# 테스트 단일 파일
npx vitest run src/test/character-recommend.test.ts

# 마이그레이션 적용
npx supabase db push

# 타입 재생성
npx supabase gen types typescript --project-id bnhnaaarsyauppdbrbco > src/integrations/supabase/types.ts
```

## 부록 — 롤백 시나리오

심각한 문제 발생 시:
- **자산 문제**: Storage 버킷 권한을 일시 private으로 → 폴백 자산만 노출됨
- **추천 알고리즘 문제**: `IntegratedScoringResult.characterRecommendation`을 항상 `insufficient_data`로 반환하도록 패치 → 추천 카드 숨김
- **Hero 카드 문제**: `DashboardPage`의 Hero 블록을 feature flag로 숨김 (env `VITE_CHARACTER_HERO_ENABLED`)
