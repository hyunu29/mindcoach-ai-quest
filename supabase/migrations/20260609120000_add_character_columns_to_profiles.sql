-- Phase 7-2 Task 4: profiles 테이블에 캐릭터 시스템 컬럼 추가
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS recommended_breed text,
  ADD COLUMN IF NOT EXISTS selected_breed text,
  ADD COLUMN IF NOT EXISTS character_chosen_at timestamptz,
  ADD COLUMN IF NOT EXISTS character_changed_count int NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'breed_recommended_check' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT breed_recommended_check
      CHECK (recommended_breed IS NULL OR recommended_breed IN ('shiba', 'poodle', 'korat', 'russian_blue'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'breed_selected_check' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT breed_selected_check
      CHECK (selected_breed IS NULL OR selected_breed IN ('shiba', 'poodle', 'korat', 'russian_blue'));
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.recommended_breed IS '통합검사 추천 알고리즘 결과 (last write wins)';
COMMENT ON COLUMN public.profiles.selected_breed IS '사용자가 최종 선택한 캐릭터';
COMMENT ON COLUMN public.profiles.character_changed_count IS '캐릭터 변경 횟수 (분석용, 쿨다운 없음)';
