-- ============================================================
-- 통합 심리검사 + BM (구독/크레딧/결제) 인프라
-- ============================================================

-- ─── tests 테이블 확장 ─────────────────────────────────────
-- 통합검사 플래그, 무료공개 플래그, 일회성 가격
ALTER TABLE public.tests
  ADD COLUMN is_integrated boolean NOT NULL DEFAULT false,
  ADD COLUMN is_free boolean NOT NULL DEFAULT false,
  ADD COLUMN price_krw integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.tests.is_integrated IS '통합 게이트웨이 검사 여부';
COMMENT ON COLUMN public.tests.is_free IS '비구독 사용자도 무료 이용';
COMMENT ON COLUMN public.tests.price_krw IS '일회성 구매 가격 (0 = 무료/구독전용)';

-- ─── test_results 확장: 게이트웨이 추천 결과 ──────────────
-- subdomain_scores 컬럼은 기존 컬럼을 그대로 사용 (10영역 점수 보관)
ALTER TABLE public.test_results
  ADD COLUMN recommendations jsonb;

COMMENT ON COLUMN public.test_results.recommendations IS '통합검사 추천 후속 검사: [{domain, score, recommendedTestIds:[text]}]';

-- ─── 구독 플랜 카탈로그 ────────────────────────────────────
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  price_krw integer NOT NULL DEFAULT 0,
  ai_credits_monthly integer NOT NULL DEFAULT 0,
  weekly_free_tests integer NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans are viewable by everyone"
  ON public.subscription_plans FOR SELECT TO public USING (true);

INSERT INTO public.subscription_plans (code, name, price_krw, ai_credits_monthly, weekly_free_tests, features) VALUES
  ('free',        '무료 플랜',  0,    10,  0, '{"meditation_tracks":1,"character_pack":"basic"}'::jsonb),
  ('pro_monthly', 'Pro 월구독', 9900, 200, 2, '{"meditation_tracks":"all","character_pack":"pro"}'::jsonb);

-- ─── 사용자 구독 ───────────────────────────────────────────
CREATE TABLE public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL CHECK (status IN ('active','cancelled','past_due','trialing')),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  toss_billing_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own subscriptions"
  ON public.user_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_user_subscriptions_user_status ON public.user_subscriptions(user_id, status);
CREATE INDEX idx_user_subscriptions_active_period ON public.user_subscriptions(current_period_end) WHERE status = 'active';

-- ─── AI 챗봇 크레딧 ────────────────────────────────────────
CREATE TABLE public.user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  credits_granted integer NOT NULL,
  credits_used integer NOT NULL DEFAULT 0,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own credits"
  ON public.user_credits FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_user_credits_user_period ON public.user_credits(user_id, period_end DESC);

-- ─── AI 사용 로그 (호출당 1행) ─────────────────────────────
CREATE TABLE public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.coaching_sessions(id) ON DELETE SET NULL,
  credit_id uuid REFERENCES public.user_credits(id) ON DELETE SET NULL,
  cost integer NOT NULL DEFAULT 1,
  tokens_in integer,
  tokens_out integer,
  model text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own usage"
  ON public.ai_usage_log FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_ai_usage_log_user_date ON public.ai_usage_log(user_id, created_at DESC);

-- ─── 검사 권한 (무료기본/주간Pro/일회성구매) ───────────────
-- test_id가 TEXT임에 주의 (tests.id text)
CREATE TABLE public.test_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_id text REFERENCES public.tests(id) ON DELETE CASCADE,
  source text NOT NULL,
  consumed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.test_entitlements.test_id IS 'NULL = 임의검사 1회 사용권 (주간 Pro 무료 등)';
COMMENT ON COLUMN public.test_entitlements.source IS 'free_default / weekly_pro / one_off_purchase';

ALTER TABLE public.test_entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own entitlements"
  ON public.test_entitlements FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_test_entitlements_user_unconsumed ON public.test_entitlements(user_id) WHERE consumed_at IS NULL;

-- ─── 결제 기록 ─────────────────────────────────────────────
CREATE TABLE public.payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('subscription','one_off')),
  amount_krw integer NOT NULL,
  status text NOT NULL CHECK (status IN ('pending','succeeded','failed','refunded')),
  toss_payment_key text UNIQUE,
  toss_order_id text UNIQUE,
  related_subscription_id uuid REFERENCES public.user_subscriptions(id),
  related_test_id text REFERENCES public.tests(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own payments"
  ON public.payment_records FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_payment_records_user_date ON public.payment_records(user_id, created_at DESC);
CREATE INDEX idx_payment_records_toss_order ON public.payment_records(toss_order_id);

-- ─── 신규 가입 시 무료 플랜 자동 부여 ──────────────────────
-- 기존 handle_new_user 트리거(profiles 생성)와 별개로 동작
CREATE OR REPLACE FUNCTION public.grant_free_plan_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
  v_credits integer;
  v_period_start timestamptz := now();
  v_period_end timestamptz := now() + interval '30 days';
BEGIN
  SELECT id, ai_credits_monthly INTO v_plan_id, v_credits
  FROM public.subscription_plans WHERE code = 'free' LIMIT 1;

  INSERT INTO public.user_subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
  VALUES (NEW.id, v_plan_id, 'active', v_period_start, v_period_end);

  INSERT INTO public.user_credits (user_id, period_start, period_end, credits_granted, source)
  VALUES (NEW.id, v_period_start, v_period_end, v_credits, 'free_monthly');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_grant_free
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_free_plan_on_signup();

-- ─── 기존 사용자 backfill: 무료 플랜 + 크레딧 부여 ─────────
DO $$
DECLARE
  v_plan_id uuid;
  v_credits integer;
  v_period_start timestamptz := now();
  v_period_end timestamptz := now() + interval '30 days';
BEGIN
  SELECT id, ai_credits_monthly INTO v_plan_id, v_credits
  FROM public.subscription_plans WHERE code = 'free' LIMIT 1;

  INSERT INTO public.user_subscriptions (user_id, plan_id, status, current_period_start, current_period_end)
  SELECT u.id, v_plan_id, 'active', v_period_start, v_period_end
    FROM auth.users u
    LEFT JOIN public.user_subscriptions s ON s.user_id = u.id AND s.status = 'active'
    WHERE s.id IS NULL;

  INSERT INTO public.user_credits (user_id, period_start, period_end, credits_granted, source)
  SELECT u.id, v_period_start, v_period_end, v_credits, 'free_monthly'
    FROM auth.users u
    LEFT JOIN public.user_credits c ON c.user_id = u.id AND c.period_end > now()
    WHERE c.id IS NULL;
END $$;

-- ─── 크레딧 소비 RPC (원자적 차감) ─────────────────────────
-- 클라이언트가 챗봇 호출 직전에 호출. SECURITY DEFINER로 RLS 우회.
CREATE OR REPLACE FUNCTION public.consume_ai_credit(p_cost integer DEFAULT 1)
RETURNS TABLE (success boolean, credit_id uuid, remaining integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_credit_id uuid;
  v_granted integer;
  v_used integer;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 0;
    RETURN;
  END IF;

  SELECT id, credits_granted, credits_used
    INTO v_credit_id, v_granted, v_used
  FROM public.user_credits
  WHERE user_id = v_uid AND period_end > now()
  ORDER BY period_end DESC LIMIT 1
  FOR UPDATE;

  IF v_credit_id IS NULL OR (v_granted - v_used) < p_cost THEN
    RETURN QUERY SELECT false, v_credit_id, COALESCE(v_granted - v_used, 0);
    RETURN;
  END IF;

  UPDATE public.user_credits
    SET credits_used = credits_used + p_cost
    WHERE id = v_credit_id;

  RETURN QUERY SELECT true, v_credit_id, (v_granted - v_used - p_cost);
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_ai_credit(integer) TO authenticated;
