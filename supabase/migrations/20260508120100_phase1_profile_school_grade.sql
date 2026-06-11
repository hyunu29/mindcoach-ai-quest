-- Phase 1: profiles에 onboarding 필드 추가
-- nickname/grade는 기존 컬럼 (20260324095812 마이그레이션). school/onboarded_at은 신규.
-- IF NOT EXISTS로 idempotent하게 처리.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS school text,
  ADD COLUMN IF NOT EXISTS grade text,
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;
