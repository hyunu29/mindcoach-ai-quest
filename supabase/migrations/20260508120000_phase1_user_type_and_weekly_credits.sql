-- Phase 1: profiles.user_type + user_credits weekly 전환
-- 카카오 OAuth 클린컷 + Pro 구독 활성화 기반 마이그레이션

-- profiles에 역할 컬럼 추가
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_type text NOT NULL DEFAULT 'student'
  CHECK (user_type IN ('student','academy_admin','super_admin'));

CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);

-- user_credits.source 값 리네임: free_monthly → free_signup, pro_monthly → pro_weekly
UPDATE public.user_credits SET source='free_signup' WHERE source='free_monthly';
UPDATE public.user_credits SET source='pro_weekly'  WHERE source='pro_monthly';

-- subscription_plans free 플랜의 monthly 기준을 weekly 기준으로 변경
-- (free는 가입 시 1회 grant, Pro는 매주 grant)
UPDATE public.subscription_plans
  SET ai_credits_monthly = 50,
      weekly_free_tests = 1
  WHERE code = 'pro_monthly';

UPDATE public.subscription_plans
  SET ai_credits_monthly = 10,
      weekly_free_tests = 0
  WHERE code = 'free';

-- 코멘트로 의미 명시 (컬럼명 변경은 다음 마이그레이션에서 — DRY)
COMMENT ON COLUMN public.subscription_plans.ai_credits_monthly IS
  'Pro: weekly grant 수치(50/주). Free: 가입 시 1회 grant(10).';
COMMENT ON COLUMN public.user_credits.source IS
  'free_signup | pro_weekly | one_off_topup';
